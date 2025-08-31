const puppeteer = require('puppeteer-extra')
const findChrome = require('../node_modules/carlo/lib/find_chrome.js');
const {
	postOfferPrice,
	fetchBatchInfo,
	loopRequestAvoidCurrentLimiting,
	sleep,
} = require("./api");
const dayjs = require("dayjs");
const Constants = require("../constant/constants");
const consoleUtil = require('./utils/consoleLogUtil');
const { sendNotice } = require('./utils/noticeUtil');
const { getUserData, setUserDataProperty } = require('./utils/storeUtil');
const API = Constants.API;
const userAgent = require('user-agents');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const { mainSendToRender } = require('./utils/mainProcessMsgHandle');

// 全局变量，用于存储从浏览器捕获的 paipai.auction.current_bid_info 请求的完整信息
let globalRequestOptionsForBatchInfo = null;

// 商品的ID
let Item_ID;

// 最高能接受的价格
let MaxPrice;
// 最低价格
let MinPrice;

let Item_URL;
let OfferPricePara = null;

let page;
let NowPrice;
let EndTime;
let CurrentTime;
let Cookie = null;
let OfferPriceTimer;
let WaitForProductStartTimer;
let Bidder;
let CurrentBidder;
let Browser;
let CycleTimer;
let CheckBidIsNearingEnd;
let isLogin = false;
// 出价加价幅度
let Markup = 2;
// 最后出价倒数时间（毫秒）
let LastBidCountdownTime;
// 抢购方式
let BiddingMethod = Constants.BiddingMethod.ON_OTHERS_BID;
let BidderNickName;
let ProductDetail;
// 获取竞拍实时信息调用接口的耗时
let LastGetBatchInfoOffsetTime = 155;
// 接收异步响应结果
let CurrentBidResolve;
// 单个抢购对象
let ShoppingItem = null;
// 浏览器是否关闭
let BrowserDisconnected = false;

/**
 * 启动浏览器，加载页面
 * */
function goToBid(params) {
	return new Promise((resolve, reject) => {
		const { id, price, bidder, markup, lastBidCountdownTime, biddingMethod, minPrice } = params;
		if (Browser && Browser.isConnected()) {
			if (isLogin) {
				handleSendNotice("抢购已开始");
				resolve({  shoppingItem: params, isError: true, isBidSuccess: false });
				return;
			}
		}

		// 初始化参数
		resetData();

		ShoppingItem = params;
		CurrentBidResolve = resolve;
		Item_ID = id;
		// AuctionDetailCurl = auctionDetailCurl;
		MaxPrice = price;
		MinPrice = minPrice;
		Item_URL = API.item_url + Item_ID;
		Bidder = bidder;
		Markup = markup;
		LastBidCountdownTime = lastBidCountdownTime;
		BiddingMethod = biddingMethod;
		consoleUtil.log("goToBid Item_URL = ", Item_URL, Item_ID, MaxPrice, MinPrice, Bidder, Markup, LastBidCountdownTime, BiddingMethod);
		initBid();
	});
}

/**
 * 更新
 * */
function updateBid(params) {
	return new Promise(async (resolve, reject) => {
		const { id, price, bidder, markup, lastBidCountdownTime, biddingMethod, minPrice } = params;

		if (!isLogin) {
			handleSendNotice("请先点击开始抢购，并登录");
			resolve({  shoppingItem: params, isError: true, isBidSuccess: false });
			return;
		}

		if (page && Browser) {
			// 初始化参数
			resetData();

			ShoppingItem = params;
			CurrentBidResolve = resolve;
			// 更新参数
			Item_ID = id;
			// AuctionDetailCurl = auctionDetailCurl;
			MaxPrice = price;
			MinPrice = minPrice;
			Item_URL = API.item_url + Item_ID;
			Bidder = bidder;
			Markup = markup;
			LastBidCountdownTime = lastBidCountdownTime;
			BiddingMethod = biddingMethod;

			consoleUtil.log("updateBid Item_URL = ", Item_URL, Item_ID, MaxPrice, MinPrice, Bidder, Markup, LastBidCountdownTime, BiddingMethod);

			if (!page.isClosed()) {
				// 关闭之前的页面
				await page.off("request");
				await page.off("load");
				await page.close();
			}
			page = await Browser.newPage();
			await page.setUserAgent(userAgent.random().toString())

			consoleUtil.log("updateBid page = ", page)

			handleGoToTargetPage();
		} else {
			handleSendNotice("请未找到抢购的浏览器窗口");
			resolve({  shoppingItem: params, isError: true, isBidSuccess: false });
			return;
		}
	});
}

/**
 * 启动浏览器，加载页面
 * */
async function initBid() {

	await initBrowser();
	page = await Browser.newPage();
	await page.setUserAgent(userAgent.random().toString())
	BrowserDisconnected = false;

	consoleUtil.log("initBid page = ", page);

	const { [Constants.StoreKeys.OPTIONS_KEY]: options = {}, [Constants.StoreKeys.COOKIES_KEY]: cookies } = getUserData();
	// 是否自动登录的处理
	if (options.enableAutoLogin && cookies && cookies.length > 0) {
		// 监听获取用户登录信息的请求
		page.waitForResponse(async response => {
			const responseUrl = response.url();
			if (responseUrl.startsWith(API.get_user_info_url) && response.status() === 200) {
				const responseText = await response.text() || "";
				const responseJson = JSON.parse(responseText.substring(responseText.indexOf("(") + 1, responseText.lastIndexOf(")")));
				// consoleUtil.log("waitForResponse response responseJson = ", responseJson);
				if (responseJson && responseJson.data && responseJson.data.isLogin) {
					// 登录成功
					isLogin = true;
					// 跳转到目标商品页面
					handleGoToTargetPage();
				} else {
					// 登录处理
					handleLogin();
				}
				// 提交响应请求结果
				response.ok();
				// 监听执行完成
				return true;
			}
			return false;
		}).catch((e) => {
			consoleUtil.log("waitForResponse error: ", e);
		});
		// 有登录cookies，直接进入商品页面
		await page.setCookie(...cookies);
		page.goto(Item_URL).catch();
	} else {
		// 登录处理
		handleLogin();
	}

}

/**
 * 登录处理
 */
function handleLogin() {
	if (!page) {
		updateRenderShoppingItemStatus(Constants.ShoppingStatus.ERROR);
		resolveBidResultAndResetData(true);
		return;
	}
	page.on("load", async function () {
		const pageUrl = page.url();
		consoleUtil.log("initBid load = ", pageUrl)

		// 利用页面加载完成事件，判断是否是登录成功后的页面跳转
		if (pageUrl === API.login_success_redirect_url || pageUrl === (API.login_success_redirect_url + "/" + Item_ID)) {
			isLogin = true;
			// 跳转到目标商品页面
			handleGoToTargetPage();
		}
	});
	// 跳转到登录页面
	page.goto(API.login_url).catch();

}

/**
 * 初始化浏览器
 */
async function initBrowser() {

	if (Browser && Browser.isConnected()) {
		return;
	}

	Browser = await newBrowser(false);

	Browser.on("disconnected", () => {
		consoleUtil.log("Browser on disconnected");
		// 监听浏览器断开连接, 重置数据
		isLogin = false;
		Browser = null;
		page = null;
		BrowserDisconnected = true;
		updateRenderShoppingItemStatus(Constants.ShoppingStatus.ERROR, "页面关闭");
		resolveBidResultAndResetData(true, false);
	});
}

/**
 * 重置数据
 */
function resetData() {
	// 初始化参数
	OfferPricePara = null;
	NowPrice = null;
	Cookie = null;
	CurrentBidder = null;
	BidderNickName = null;
	EndTime = null;
	CurrentTime = null;
	CycleTimer && clearTimeout(CycleTimer);
	CheckBidIsNearingEnd && clearTimeout(CheckBidIsNearingEnd);
	OfferPriceTimer && clearTimeout(OfferPriceTimer);
	BiddingMethod = Constants.BiddingMethod.ON_OTHERS_BID;
	ProductDetail = null;
	WaitForProductStartTimer && clearTimeout(WaitForProductStartTimer);
	CurrentBidResolve= null;
	ShoppingItem = null;
	BrowserDisconnected = false;
	globalRequestOptionsForBatchInfo = null;
}

/**
 * 跳转到目标商品页面
 */
async function handleGoToTargetPage() {

	if (!page) {
		updateRenderShoppingItemStatus(Constants.ShoppingStatus.ERROR);
		resolveBidResultAndResetData(true);
		return;
	}
	const pageUrl = page.url();
	if (Item_URL != pageUrl) {
		await page.goto(Item_URL);
	}
	updateRenderShoppingItemStatus(Constants.ShoppingStatus.IN_PROGRESS);

    // 启用请求拦截
    await page.setRequestInterception(true);

    // 监听所有请求，确保它们继续，并捕获目标请求
    page.on('request', interceptedRequest => {
        if (interceptedRequest.url().includes('api.m.jd.com/api?functionId=paipai.auction.current_bid_info')) {
            globalRequestOptionsForBatchInfo = {
                url: interceptedRequest.url(),
                headers: interceptedRequest.headers(),
                method: interceptedRequest.method(),
                postData: interceptedRequest.postData()
            };
        }
        interceptedRequest.continue();
    });

	// 需要使用两个页面的cookie
	const page_cookie = await page.cookies();
	Cookie = page_cookie;
	// 更新用户配置中的 cookies
	setUserDataProperty(Constants.StoreKeys.COOKIES_KEY, page_cookie);

	// 查询商品详情
	ProductDetail = await getBidDetailFromBrowser(Item_ID);
	if (!ProductDetail || !ProductDetail.auctionInfo || !ProductDetail.auctionInfo.startTime || !ProductDetail.currentTime) {
		handleSendNotice(`商品详情获取失败，请检查`, true);
		updateRenderShoppingItemStatus(Constants.ShoppingStatus.FAILED, `商品详情获取失败，请检查`);
		resolveBidResultAndResetData(false);
		return;
	}

	// 更新渲染进程的商品信息
	const auctionInfo = ProductDetail.auctionInfo;
	ShoppingItem.productName = auctionInfo.productName;
	ShoppingItem.startTime = auctionInfo.startTime;
	ShoppingItem.endTime = auctionInfo.endTime;
	ShoppingItem.startPrice = auctionInfo.startPrice;
	ShoppingItem.cappedPrice = auctionInfo.cappedPrice;
	ShoppingItem.auctionDetail = ProductDetail;
	ShoppingItem.primaryPic = auctionInfo.productImg;
	ShoppingItem.currentPrice = auctionInfo.currentPrice;
	updateRenderShoppingItemInfo(ShoppingItem);

	// 检查商品抢购是否接近尾声
	checkBidIsNearingEnd();

	// 等待商品开始抢购
	await waitForProductStart();
	if (!page || page.isClosed()) {
		// 页面关闭，则退出
		updateRenderShoppingItemStatus(Constants.ShoppingStatus.ERROR, "页面关闭");
		resolveBidResultAndResetData(true);
		return;
	}

	// 避免服务端限流循环获取竞拍实时信息
	const isGetBatchInfoSuccess = await loopRequestAvoidCurrentLimiting(getBatchInfo, 0, 1000 * 10);
	if (!isGetBatchInfoSuccess || !EndTime) {
		handleSendNotice(`获取抢购信息失败，请检查`, true);
		updateRenderShoppingItemStatus(Constants.ShoppingStatus.FAILED, "获取抢购信息失败");
		resolveBidResultAndResetData(false);
		return;
	}

	handlePriceAndTime(true);

	/*if (OfferPriceBack) {
		handlePriceAndTime(true);
	} else {
		// 启用拦截器
		await page.setRequestInterception(true).catch();

		// 对出价进行拦截，目的在于获取加密参数，不需要真实出价，所以需要拦截，后续的出价请求不能拦截
		page.on("request", async function (request) {

			if (request.isInterceptResolutionHandled()) {
				return;
			}

			if (['image', 'stylesheet', 'font', 'script'].indexOf(request.resourceType()) !== -1) {
				request.abort().catch();
				return;
			}

			if (request.url().indexOf(API.api_jd) !== -1 && request.url().indexOf(API.offer_price_function_id) !== -1) {
				let post_data = request.postData();
				if (post_data) {
					let post_data_obj = querystring.parse(post_data);
					if (post_data_obj && post_data_obj.body) {
						const post_data_obj_body = JSON.parse(post_data_obj.body);
						if (!OfferPricePara && post_data_obj_body && post_data_obj_body.auctionId && post_data_obj_body.auctionId == Item_ID) {
							OfferPricePara = post_data_obj_body;
							consoleUtil.log("加密参数获取成功！！");
							request.abort();
							handlePriceAndTime(true);
							return;
						}
					}
				}

				request.continue().catch();
			} else {
				request.continue().catch();
			}
		});

		// 通过页面操作，模拟真实的用户操作，以便获取加密参数
		await buyByPage(1);
	} */
}

/**
 * 等待商品开始抢购
 */
async function waitForProductStart() {
	consoleUtil.log("等待商品开始抢购 ", dayjs().format('YYYY-MM-DD HH:mm:ss'));
	let button = null;
	const sleepSeconds = 1;
	let pageReload = false;
	const waitMilliseconds = ProductDetail.auctionInfo.startTime - ProductDetail.currentTime;

	do {
		if (page) {
			try {
				button = await page.$("#InitCartUrl");
				if (button === null) {
					await sleep(sleepSeconds * 1000);

					if (!pageReload && waitMilliseconds > 0) {
						// 等待商品开始抢购
						await new Promise((resolve, reject) => {
							WaitForProductStartTimer = setTimeout(function () {
								resolve();
							}, waitMilliseconds)
						});
						if (page) {
							// // 更新商品详情接口请求结果
							consoleUtil.log("page start reload.", dayjs().format('YYYY-MM-DD HH:mm:ss'));
							// 商品开始抢购时刷新页面，解决页面倒计时不准确，导致出价按钮更新不及时的问题
							await page.reload();
						}
						pageReload = true;
					}
				}
			} catch (error) {
				consoleUtil.log("waitForProductStart error:", error.message);
			}
		}
	} while (button === null && page && !page.isClosed());
}

/**
 * 检查商品抢购是否接近尾声
 */
function checkBidIsNearingEnd() {
	let baseOffsetTime = 5000;
	if (baseOffsetTime <= LastBidCountdownTime) {
		baseOffsetTime = baseOffsetTime + LastBidCountdownTime;
	}
	// 提前结束等待，开始后续的倒计时出价处理
	const waitMilliseconds = ProductDetail.auctionInfo.actualEndTime - ProductDetail.currentTime - baseOffsetTime;
	consoleUtil.log("checkBidIsNearingEnd waitMilliseconds =", waitMilliseconds)
	CheckBidIsNearingEnd = setTimeout(async () => {
		consoleUtil.log("商品抢购已接近尾声，开始倒计时抢购处理 ", dayjs().format('YYYY-MM-DD HH:mm:ss'));
		// 结束循环竞拍实时信息查询
		CycleTimer && clearTimeout(CycleTimer);
		try {
			await loopRequestAvoidCurrentLimiting(getBatchInfo, 3, 500);
		} catch (error) {
			consoleUtil.log("checkBidIsNearingEnd error: ", error.message);
		}
		// 执行最后的倒计时出价处理
		handlePriceAndTime(false, true);
	}, waitMilliseconds);
}

/**
 * 获得竞拍实时信息
 * */
function getBatchInfo() {

	return new Promise(async (resolve, reject) => {
		const startTime = new Date().getTime();
		try {
			// 确保 globalRequestOptionsForBatchInfo 已经被捕获到
			if (!globalRequestOptionsForBatchInfo) {
				consoleUtil.error("globalRequestOptionsForBatchInfo 未捕获到，无法发送请求。");
				reject(new Error("请求信息未准备好"));
				return;
			}
			const result = await fetchBatchInfo(globalRequestOptionsForBatchInfo);
			const endTime = new Date().getTime();
			LastGetBatchInfoOffsetTime = endTime - startTime;
			if (result && result.data && result.data[Item_ID]) {
				NowPrice = result.data[Item_ID].currentPrice;
				EndTime = result.data[Item_ID].actualEndTime;
				CurrentTime = result.list[0];
				// consoleUtil.log("getBatchInfo end origin CurrentTime = ", CurrentTime);
				// 假定服务器的当前时间是接口获取到的时间加上请求耗时
				CurrentTime = CurrentTime + LastGetBatchInfoOffsetTime;
				CurrentBidder = result.data[Item_ID].currentBidder;
				BidderNickName = result.data[Item_ID].bidderNickName;
				consoleUtil.log("getBatchInfo get end NowPrice = ", NowPrice, ", CurrentTime = ", CurrentTime, ", EndTime = ", EndTime,
					", CurrentTime format = ", dayjs(CurrentTime).format('YYYY-MM-DD HH:mm:sss'), ", EndTime format = ", dayjs(EndTime).format('YYYY-MM-DD HH:mm:sss'),
					", CurrentBidder = ", CurrentBidder, ", BidderNickName = ", BidderNickName, ", offsetTime = ", LastGetBatchInfoOffsetTime);
				if (ShoppingItem) {
					ShoppingItem.currentPrice = NowPrice;
					if (ShoppingItem.auctionDetail) {
						ShoppingItem.auctionDetail.currentTime = CurrentTime;
						if (ShoppingItem.auctionDetail.auctionInfo) {
							ShoppingItem.auctionDetail.auctionInfo.currentPrice = NowPrice;
							ShoppingItem.auctionDetail.auctionInfo.bidder = CurrentBidder;
							ShoppingItem.auctionDetail.auctionInfo.bidderNickName = BidderNickName;
						}
					}
					updateRenderShoppingItemInfo(ShoppingItem);
				}
			} else {
				consoleUtil.error("获取竞拍实时信息失败");
				reject(new Error("获取竞拍实时信息失败"));
				return;
			}
		} catch (e) {
			consoleUtil.error("getBatchInfo error: ", e.message);
			reject(e);
			return;
		}
		resolve();
	});
}

/**
 * 根据当前的出价和剩余时间做处理
 * 执行购买逻辑
 * */
function handlePriceAndTime(isFirstHandlePrice = false, isLastHandlePrice = false) {

	const price = NowPrice || 1;
	const currentLocalTime = new Date().getTime();
	const time = EndTime - CurrentTime;

	consoleUtil.log("当前价格：" + price, " , 最高价格：" + MaxPrice, " , 当前时间：" + dayjs(currentLocalTime).format('YYYY-MM-DD HH:mm:sss'));
	consoleUtil.log("剩余抢购时间 毫秒：" + time, " , 秒：" + parseInt(time / 1000));
	consoleUtil.log("当前出价人：" + CurrentBidder, " ,抢购用户账户名：" + Bidder);

	let isAboveMaxPrice = false;
	if (BiddingMethod == Constants.BiddingMethod.WITHIN_PRICE_RANGE ||
		BiddingMethod == Constants.BiddingMethod.ONE_TIME_BID) {
		// 判断是否超过最高价格
		if (MaxPrice && (price >= MaxPrice)) {
			isAboveMaxPrice = true;
		}
		if (MaxPrice && ProductDetail && ProductDetail.auctionInfo
			&& ProductDetail.auctionInfo.startPrice && MaxPrice < ProductDetail.auctionInfo.startPrice) {
			handleSendNotice(`设定的最高价格低于商品起拍价，抢购结束`, true);
			CheckBidIsNearingEnd && clearTimeout(CheckBidIsNearingEnd);
			updateRenderShoppingItemStatus(Constants.ShoppingStatus.FAILED, "设定的最高价格低于商品起拍价");
			resolveBidResultAndResetData(false);
			return;
		}
	}

	if (BiddingMethod != Constants.BiddingMethod.ONE_TIME_BID) {
		// 加价的处理方式
		let bidPrice = price + Markup;
		if (bidPrice > MaxPrice && price < MaxPrice) {
			// 当前出价加上出价幅度大于最大价格，并且当前出价小于最大价格时，使用最大价格进行购买
			bidPrice = MaxPrice;
		}
		if (MaxPrice && (bidPrice > MaxPrice)) {
			isAboveMaxPrice = true;
		}
	}

	if (isAboveMaxPrice) {
		handleSendNotice(`超过最高价格，抢购结束`, true);
		CheckBidIsNearingEnd && clearTimeout(CheckBidIsNearingEnd);
		updateRenderShoppingItemStatus(Constants.ShoppingStatus.FAILED, "超过最高价格");
		resolveBidResultAndResetData(false);
		return;
	}

	if (time < 0) {
		handleSendNotice(`夺宝已结束-未出价`, true);
		CheckBidIsNearingEnd && clearTimeout(CheckBidIsNearingEnd);
		updateRenderShoppingItemStatus(Constants.ShoppingStatus.FAILED, "夺宝已结束");
		resolveBidResultAndResetData(false);
		return;
	}

	if (isFirstHandlePrice) {
		handleSendNotice(`抢购开始`, true);
	}

	if (isLastHandlePrice) {
		// 最后倒计时出价处理
		handleLastMinuteBuy(time);
		return;
	}

	CycleTimer = setTimeout(async function () {
		try {
			await getBatchInfo();
		} catch (error) {
			consoleUtil.log("cycleTimer error: ", error.message);
		}
		handlePriceAndTime();
	}, 1000 * 60 * 4.5)
}

/**
 * 通过操作页面的按钮，来进行出价
 * */
async function buyByPage(price) {
	if (!page) {
		return;
	}
	try {
		const inputSelector = '.auction-choose-amount .el-input__inner';
		// 定位到包含 auction-choose-amount 类的 div 元素，并找到其中的 input 元素
		const inputElement = await page.$(inputSelector);
		// 选中输入框
		await inputElement.click();
		// 将光标移动到文本末尾
		await page.keyboard.down('End');
		// 循环删除输入框所有文本
		while (await page.$eval(inputSelector, el => el.value) !== '') {
			await page.keyboard.press('Backspace');
		}
		// 修改输入框的出价价格
		await inputElement.type(price.toString());
		// 点击按钮立即出价
		const bidButton = await page.$("#InitCartUrl");
		bidButton.click();
	} catch (e) {
		consoleUtil.log("buyByPage error: ", e.message)
	}
}

/**
 * 最后倒计时出价处理
 */
async function handleLastMinuteBuy(time) {

	let bidTime = time - LastBidCountdownTime - (LastGetBatchInfoOffsetTime || 155);
	bidTime = bidTime <= 0 ? time - (LastGetBatchInfoOffsetTime || 155) : bidTime;
	consoleUtil.log(`${bidTime}毫秒后开始出价`);

	OfferPriceTimer && clearTimeout(OfferPriceTimer);

	OfferPriceTimer = setTimeout(async function () {

		try {
			// 等待最后一次更新竞拍实时信息
			consoleUtil.log("start last update batchInfo.");
			await loopRequestAvoidCurrentLimiting(getBatchInfo, 3, 50);

			let bidPrice;
			let isAboveMaxPrice = false;
			if (BiddingMethod == Constants.BiddingMethod.ONE_TIME_BID) {
				// 固定价格的处理方式
				bidPrice = MaxPrice;
				if (MaxPrice && (NowPrice >= MaxPrice)) {
					isAboveMaxPrice = true;
				}
			} else {
				// 加价的处理方式
				bidPrice = (NowPrice || 1) + Markup;

				if (BiddingMethod == Constants.BiddingMethod.WITHIN_PRICE_RANGE) {
					if (MinPrice && bidPrice < MinPrice) {
						// 当前出价小于最小出价额，则以最小出价额进行出价
						bidPrice = MinPrice
					}
				}

				if (bidPrice > MaxPrice && (NowPrice || 1) < MaxPrice) {
					// 当前出价加上出价幅度大于最大价格，并且当前出价小于最大价格时，使用最大价格进行购买
					bidPrice = MaxPrice;
				}
				if (MaxPrice && (bidPrice > MaxPrice)) {
					isAboveMaxPrice = true;
				}
			}

			const currentRemainTime = EndTime - CurrentTime;
			consoleUtil.log(`${bidTime}毫秒后出价:${bidPrice}元，当前时间：${new Date().getTime()}, 上一次请求竞价信息后的剩余时间：${currentRemainTime}`);
			if (isAboveMaxPrice) {
				handleSendNotice(`超过最高价格，抢购结束`, true);
				updateRenderShoppingItemStatus(Constants.ShoppingStatus.FAILED, "超过最高价格");
				resolveBidResultAndResetData(false);
				return;
			} else {
				consoleUtil.log(new Date().getTime() + ":" + `出价${bidPrice}`);
				// await buyByAPI(bidPrice);
				await buyByPage(bidPrice);
			}
			await sleep(currentRemainTime + 5000);

			// 最后再获取商品信息，查看竞拍结果
			loopRequestAvoidCurrentLimiting(getBatchInfo, 3, 2000).then(() => {
				// 出价后，最后一次查询商品信息，发送通知消息
				const userNickName = (Cookie.find(cookie => "unick" === cookie.name) || {}).value;
				let isBidSuccess = false;
				if (userNickName && BidderNickName) {
					const BidderNickNameArr = BidderNickName.split("***");
					if (BidderNickNameArr && BidderNickNameArr.length === 2) {
						if (userNickName.startsWith(BidderNickNameArr[0]) && userNickName.endsWith(BidderNickNameArr[1])) {
							// 当前出价人为自己(弱判断)
							isBidSuccess = true;
						}
					}
				}
				handleSendNotice(`夺宝已结束-${isBidSuccess ? "已获拍" : "未获拍"}`, true);
				updateRenderShoppingItemStatus(isBidSuccess ? Constants.ShoppingStatus.SUCCESS : Constants.ShoppingStatus.FAILED);
				resolveBidResultAndResetData(false, isBidSuccess);
			}).catch();
		} catch (error) {
			consoleUtil.log("handleLastMinuteBuy error:", error.message);
			updateRenderShoppingItemStatus(Constants.ShoppingStatus.FAILED);
			resolveBidResultAndResetData(false);
		}
	}, bidTime);
}

async function getBidDetail() {

}

/**
 * 浏览器中获得竞拍标的信息
 * */
async function getBidDetailFromBrowser(id) {
	if (!page) {
		return;
	}

	return new Promise((resolve, reject) => {
		// 监听商品信息的请求
		page.waitForResponse(async response => {
			const responseUrl = response.url();
			if (responseUrl.includes(API.detail_function_param) && response.status() === 200) {
				const responseText = await response.text() || "";
				const responseJson = JSON.parse(responseText);
				if (responseJson && responseJson.result && responseJson.result.code == 200 && responseJson.result.data) {
					resolve(responseJson.result.data);
				} else {
					resolve();
				}
				// 提交响应请求结果
				response.ok();
				// 监听执行完成
				return true;
			}
			return false;
		}).catch((e) => {
			consoleUtil.log("getBidDetailFromBrowser error: ", e);
			resolve();
		});
	});
}

async function newBrowser(headless = false) {
	let findChromePath = await findChrome({});
	let executablePath = findChromePath.executablePath;

	puppeteer.use(StealthPlugin())

	return await puppeteer.launch({
		executablePath,
		headless: headless,
		defaultViewport: null,
		args: [
			'--disable-web-security',
		],
		ignoreDefaultArgs: ['--enable-automation']
	});
}

let auctionInfos = [];
let catching = false;
let cachePromise = null;
async function cacheProduct(params = {}) {

	const { futureHour = 1, sleepTime = 3 } = params;
	if (catching) {
		return cachePromise;
	}
	catching = true;

	let browser;
	try {
		const tempAuctionInfos = [];
		browser = await newBrowser(true);
		const page = await browser.newPage();
		await page.goto("https://paipai.jd.com/auction-list/");

		let futureTimestamp;
		let page_index = 0;
		while (true) {
			let response = null;
			try {
				const responsePromise = page.waitForResponse(
					(res) =>
						res.url().includes("paipai.auction.list") &&
						res.url().includes("auctionFilterTime"),
					{ timeout: 10000 }
				);
				response = await responsePromise;
			} catch (error) {
				consoleUtil.log("等待响应超时", error.message);
			}

			if (response && response.ok()) {
				try {
					const responseJson = await response.json();
					if (page_index === 0) {
						const systemTime = responseJson.result?.data?.systemTime || new Date().getTime();
						futureTimestamp = systemTime + futureHour * 60 * 60 * 1000;
					}
					const temp_auctions = responseJson.result?.data?.auctionInfos || [];
					if (temp_auctions.length === 0) {
						consoleUtil.log(`未获取到商品数据，停止缓存，共计`, tempAuctionInfos.length, "个");
						break;
					}
					tempAuctionInfos.push(...temp_auctions);
					page_index++;
					consoleUtil.log("已缓存第", page_index, "页，共计", tempAuctionInfos.length, "个拍卖商品");
					const last_auction = temp_auctions[temp_auctions.length - 1];
					if (last_auction.endTime > futureTimestamp) {
						consoleUtil.log(`已缓存${futureHour}小时内的拍卖商品，共计`, tempAuctionInfos.length, "个");
						break;
					}
				} catch (jsonError) {
					consoleUtil.log("解析响应JSON失败:", jsonError.message);
				}
			} else {
				consoleUtil.log("响应失败:", response?.status());
			}

			try {
				await sleep(sleepTime * 1000);
				await page.click("#app > div > div.list-selector > div > div.el-pagination.is-background > button.btn-next");
			} catch (clickError) {
				consoleUtil.log("点击下一页按钮失败", clickError.message);
				break;
			}
		}
		// 原子更新
		auctionInfos = tempAuctionInfos;
		consoleUtil.log("缓存完成, 共计", auctionInfos.length, "个商品");
	} catch (error) {
		consoleUtil.error("缓存商品时发生错误:", error.message);
		// 抛出错误，以便Promise可以被reject
		throw error;
	} finally {
		// 标记缓存完成
		catching = false;
		if (browser) {
			await browser.close();
			consoleUtil.log("浏览器已关闭");
		}
	}
}

async function manualCacheProduct(params = {}) {
	// 重置Promise，强制重新执行cacheProduct
	cachePromise = null;
	cachePromise = cacheProduct(params);
}

/**
 * 搜索产品请求
 * status: 0：全部，1：即将开始，2：正在进行
 * */
async function fetchProduct(params = {}) {
	const { name, pageNo = 1, status = 0 } = params;

	try {
		// 如果还没有开始缓存，则启动缓存任务并等待它完成
		if (!cachePromise) {
			cachePromise = cacheProduct();
		}
		// 等待缓存任务完成
		await cachePromise;

		let search_auctions = []
		for (let auction of auctionInfos) {
			if (auction.productName.includes(name) && (status === 0 || auction.status === status)) {
				search_auctions.push(auction);
			}
		}

		return {
			itemList: search_auctions,
		};
	} catch (error) {
		// 如果缓存失败，重置Promise以便下次可以重试
		cachePromise = null;
		consoleUtil.log("fetchProduct超时或出错:", error.message);
		return {
			itemList: [],
		};
	}
}

/**
 * 搜索产品
 * status: ""：全部，1：即将开始，2：正在进行
 * */
async function searchProduct(params = {}) {
	let data = null;
	try {
		data = await fetchProduct(params);
	} catch (e) {
		consoleUtil.error("searchProduct error:", e.message);
	}
	return data;
}

/**
 * 跳转到商品界面
 */
async function goToProductPage(productId) {

	// 初始化浏览器
	await initBrowser();
	const productPage = await Browser.newPage();
	await productPage.setUserAgent(userAgent.random().toString())
	productPage.goto(API.item_url + productId).catch();
}

/**
 * 发送通知消息的处理
 */
function handleSendNotice(msg, sendToTel) {
	let telMsg;
	if (sendToTel) {
		const info = ProductDetail && ProductDetail.auctionInfo || {};
		telMsg = `
		【抢购通知】
		通知内容：${msg}
		商品ID：${Item_ID}
		商品名称：${info.productName || ''}
		起拍价：${info.startPrice || ''}
		封顶价：${info.maxPrice || ''}
		抢购开始时间：${info.startTime ? dayjs(info.startTime).format("YYYY-MM-DD HH:mm:ss") : ''}
		抢购结束时间：${info.endTime ? dayjs(info.endTime).format("YYYY-MM-DD HH:mm:ss") : ''}
		设定最低价：${MinPrice || ''}
		设定最高价：${MaxPrice || ''}
		当前价格：${NowPrice || ''}
		当前出价人：${CurrentBidder || ''}
		当前出价人昵称：${BidderNickName || ''}
		当前时间：${dayjs(CurrentTime ? CurrentTime : undefined).format('YYYY-MM-DD HH:mm:ss')}`;
	}
	sendNotice(msg, telMsg);
}

/**
 * 抢购结果异步处理，并且重置数据
 */
function resolveBidResultAndResetData(isError, isBidSuccess = false) {
	if (CurrentBidResolve) {
		CurrentBidResolve({ shoppingItem: ShoppingItem, isError, isBidSuccess });
		CurrentBidResolve = null;
		resetData();
	}
}

/**
 * 获取登录状态
 */
function getLoginStatus () {
	if (Browser && Browser.isConnected()) {
		if (isLogin) {
			return true;
		}
	}
	return false;
}

/**
 * 获取浏览器是否关闭
 */
function isBrowserDisconnected() {
	return BrowserDisconnected;
}

/**
 * 取消当前抢购
 */
function cancelBid() {
	resolveBidResultAndResetData(false);
	resetData();
}

/**
 * 更新渲染进程的商品信息
 */
function updateRenderShoppingItemInfo(shoppingItem) {
	// 数据发送到渲染进程
	mainSendToRender("update.shopping.item", shoppingItem);
}

/**
 * 更新渲染进程的商品抢购状态
 */
function updateRenderShoppingItemStatus(status, msg) {
	if (ShoppingItem) {
		ShoppingItem.status = status;
		ShoppingItem.statusMsg = msg;
		// 数据发送到渲染进程
		mainSendToRender("update.shopping.item", ShoppingItem);
	}
}

module.exports = {
	goToBid,
	updateBid,
	getBidDetail,
	searchProduct,
	goToProductPage,
	getLoginStatus,
	isBrowserDisconnected,
	cancelBid,
	manualCacheProduct
};