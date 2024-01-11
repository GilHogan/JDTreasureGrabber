const puppeteer = require('puppeteer-core');
const findChrome = require('../node_modules/carlo/lib/find_chrome.js');
const querystring = require("querystring");
const { postOfferPrice, fetchBatchInfo, fetchBidDetail, fetchProduct, loopRequestAvoidCurrentLimiting, sleep } = require("./api");
const dayjs = require('dayjs');
const { Notification } = require('electron');
const Constants = require("../constant/constants");
const consoleUtil = require('./utils/consoleLogUtil');
const { sendNotice } = require('./utils/noticeUtil');
const { getUserData, setUserDataProperty } = require('./utils/storeUtil');
const API = Constants.API;

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
let RefreshBatchInfoTimer;
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
let LastBidCountdownTime = 350;
// 出价方式
let BiddingMethod = Constants.BiddingMethod.ON_OTHERS_BID;
const noticeTitle = "京东夺宝岛助手提示";
let BidderNickName;
let ProductDetail;

/**
 * 启动浏览器，加载页面
 * */
function goToBid(params) {
	const { id, price, bidder, markup, lastBidCountdownTime, biddingMethod, minPrice } = params;
	if (Browser && Browser.isConnected()) {
		if (isLogin) {
			new Notification({ title: noticeTitle, body: "抢购已开始" }).show();
			return;
		}
	}

	// 初始化参数
	resetData();

	Item_ID = id;
	MaxPrice = price;
	MinPrice = minPrice;
	Item_URL = API.item_url + Item_ID;
	Bidder = bidder;
	Markup = markup;
	LastBidCountdownTime = lastBidCountdownTime;
	BiddingMethod = biddingMethod;
	consoleUtil.log("goToBid Item_URL = ", Item_URL, Item_ID, MaxPrice, MinPrice, Bidder, Markup, LastBidCountdownTime, BiddingMethod);
	initBid();
}

/**
 * 更新
 * */
async function updateBid(params) {
	const { id, price, bidder, markup, lastBidCountdownTime, biddingMethod, minPrice } = params;

	if (!isLogin) {
		new Notification({ title: noticeTitle, body: "请先点击开始抢购，并登录" }).show();
		return;
	}

	if (page && Browser) {
		// 初始化参数
		resetData();

		// 更新参数
		Item_ID = id;
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

		consoleUtil.log("updateBid page = ", page)

		handleGoToTargetPage();
	} else {
		new Notification({ title: noticeTitle, body: "请未找到抢购的浏览器窗口" }).show();
		return;
	}
}

/**
 * 启动浏览器，加载页面
 * */
async function initBid() {

	await initBrowser();

	page = await Browser.newPage();

	consoleUtil.log("initBid page = ", page);

	const { options = {}, [Constants.StoreKeys.COOKIES_KEY]: cookies } = getUserData();
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

	let findChromePath = await findChrome({});
	let executablePath = findChromePath.executablePath;

	Browser = await puppeteer.launch({
		executablePath,
		headless: false,
		defaultViewport: null
	});

	Browser.on("disconnected", () => {
		consoleUtil.log("Browser on disconnected");
		// 监听浏览器断开连接, 重置数据
		resetData();
		isLogin = false;
		Browser = null;
		page = null;
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
	RefreshBatchInfoTimer && clearInterval(RefreshBatchInfoTimer);
	CycleTimer && clearTimeout(CycleTimer);
	CheckBidIsNearingEnd && clearTimeout(CheckBidIsNearingEnd);
	OfferPriceTimer && clearTimeout(OfferPriceTimer);
	BiddingMethod = Constants.BiddingMethod.ON_OTHERS_BID;
	ProductDetail = null;
	WaitForProductStartTimer && clearTimeout(WaitForProductStartTimer);
}

/**
 * 跳转到目标商品页面
 */
async function handleGoToTargetPage() {

	if (!page) {
		return;
	}
	const pageUrl = page.url();
	if (Item_URL != pageUrl) {
		await page.goto(Item_URL);
	}

	// 需要使用两个页面的cookie
	const jd_cookie = await page.cookies(API.login_url);
	const page_cookie = await page.cookies();
	Cookie = mergeCookie(jd_cookie, page_cookie);
	// 更新用户配置中的 cookies
	setUserDataProperty(Constants.StoreKeys.COOKIES_KEY, page_cookie);

	// 查询商品详情
	ProductDetail = await loopRequestAvoidCurrentLimiting(() => getBidDetail(Item_ID));
	if (!ProductDetail || !ProductDetail.auctionInfo || !ProductDetail.auctionInfo.startTime || !ProductDetail.currentTime) {
		consoleUtil.log("商品详情获取失败，请检查");
		new Notification({ title: noticeTitle, body: "商品详情获取失败，请检查" }).show();
		handleSendNotice(`商品详情获取失败，请检查`);
		resetData();
		return;
	}

	// 检查商品抢购是否接近尾声
	checkBidIsNearingEnd();

	// 等待商品开始抢购
	await waitForProductStart();
	if (!page || page.isClosed()) {
		// 页面关闭，则退出
		resetData();
		return;
	}

	// 避免服务端限流循环获取竞拍实时信息
	const isGetBatchInfoSuccess = await loopRequestAvoidCurrentLimiting(getBatchInfo);
	if (!isGetBatchInfoSuccess || !EndTime) {
		consoleUtil.log("获取抢购信息失败，请检查");
		new Notification({ title: noticeTitle, body: "获取抢购信息失败，请检查" }).show();
		handleSendNotice(`获取抢购信息失败，请检查`);
		resetData();
		return;
	}

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
	// 提前结束等待，开始后续的倒计时出价处理
	const waitMilliseconds = ProductDetail.auctionInfo.actualEndTime - ProductDetail.currentTime - 5000;
	consoleUtil.log("checkBidIsNearingEnd waitMilliseconds =", waitMilliseconds)
	CheckBidIsNearingEnd = setTimeout(async () => {
		consoleUtil.log("商品抢购已接近尾声，开始倒计时抢购处理 ", dayjs().format('YYYY-MM-DD HH:mm:ss'));
		// 结束循环竞拍实时信息查询
		CycleTimer && clearTimeout(CycleTimer);
		try {
			await getBatchInfo();
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
function getBatchInfo(isLastQuery = false) {

	return new Promise(async (resolve, reject) => {
		const startTime = new Date().getTime();
		try {
			const result = await fetchBatchInfo(Item_ID);
			const endTime = new Date().getTime();
			const offsetTime = endTime - startTime;
			if (result && result.data && result.data[Item_ID]) {
				NowPrice = result.data[Item_ID].currentPrice;
				EndTime = result.data[Item_ID].actualEndTime;
				CurrentTime = result.list[0];
				// consoleUtil.log("getBatchInfo end origin CurrentTime = ", CurrentTime);
				// 假定服务器的当前时间是接口获取到的时间加上请求耗时
				CurrentTime = CurrentTime + offsetTime;
				CurrentBidder = result.data[Item_ID].currentBidder;
				BidderNickName = result.data[Item_ID].bidderNickName;
				consoleUtil.log("getBatchInfo get end NowPrice = ", NowPrice, ", CurrentTime = ", CurrentTime, ", EndTime = ", EndTime,
					", CurrentTime format = ", dayjs(CurrentTime).format('YYYY-MM-DD HH:mm:sss'), ", EndTime format = ", dayjs(EndTime).format('YYYY-MM-DD HH:mm:sss'),
					", CurrentBidder = ", CurrentBidder, ", BidderNickName = ", BidderNickName);
				if (isLastQuery) {
					// 出价后，最后一次查询商品信息，发送通知消息
					handleSendNotice(`抢购结束`);
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

function refreshBatchInfo() {
	let fetching = false;
	RefreshBatchInfoTimer = setInterval(async function () {
		if (fetching) {
			return;
		}
		fetching = true;
		try {
			await getBatchInfo();
		} catch (error) {
			consoleUtil.log("refreshBatchInfo error: ", error.message);
		}
		fetching = false;
	}, 10);
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

	if (!OfferPricePara) {
		consoleUtil.log("正在获取加密参数");
		buyByPage(1);
		return;
	}

	let isAboveMaxPrice = false;
	if (BiddingMethod == Constants.BiddingMethod.WITHIN_PRICE_RANGE ||
		BiddingMethod == Constants.BiddingMethod.ONE_TIME_BID) {
		// 判断是否超过最高价格
		if (MaxPrice && (price >= MaxPrice)) {
			isAboveMaxPrice = true;
		}
		if (MaxPrice && ProductDetail && ProductDetail.auctionInfo
			&& ProductDetail.auctionInfo.startPrice && MaxPrice < ProductDetail.auctionInfo.startPrice) {
			consoleUtil.log("设定的最高价格低于商品起拍价，抢购结束");
			RefreshBatchInfoTimer && clearInterval(RefreshBatchInfoTimer);
			new Notification({ title: noticeTitle, body: "设定的最高价格低于商品起拍价，抢购结束" }).show();
			handleSendNotice(`设定的最高价格低于商品起拍价，抢购结束`);
			CheckBidIsNearingEnd && clearTimeout(CheckBidIsNearingEnd);
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
		consoleUtil.log("超过最高价格，抢购结束");
		RefreshBatchInfoTimer && clearInterval(RefreshBatchInfoTimer);
		new Notification({ title: noticeTitle, body: "超过最高价格，抢购结束" }).show();
		handleSendNotice(`超过最高价格，抢购结束`);
		CheckBidIsNearingEnd && clearTimeout(CheckBidIsNearingEnd);
		return;
	}

	if (time < 0) {
		consoleUtil.log("抢购时间结束");
		clearInterval(RefreshBatchInfoTimer);
		new Notification({ title: noticeTitle, body: "抢购时间结束" }).show();
		handleSendNotice(`抢购时间结束`);
		CheckBidIsNearingEnd && clearTimeout(CheckBidIsNearingEnd);
		return;
	}

	if (isFirstHandlePrice) {
		consoleUtil.log("抢购开始");
		new Notification({ title: noticeTitle, body: "抢购开始" }).show();
		handleSendNotice(`抢购开始`);
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
	// 点击输入框右边，以便光标能在最右边，删除键能删除所有的输入
	await page.mouse.click(1000, 492);
	await page.keyboard.press('Backspace');
	await page.keyboard.press('Backspace');
	await page.keyboard.press('Backspace');
	await page.keyboard.press('Backspace');
	await page.keyboard.type(price.toString());
	try {
		await page.click("#InitCartUrl");
	} catch (e) {
		consoleUtil.log("buyByPage error: ", e.message)
	}
}

/**
 * 通过直接调用api接口去出价
 * */
async function buyByAPI(price) {
	if (OfferPricePara === null) {
		consoleUtil.log("没有正确获取到拍卖参数，无法执行购买");
	} else {
		if (Bidder && CurrentBidder) {
			const currentBidderArr = CurrentBidder.split("***");
			if (currentBidderArr && currentBidderArr.length == 2) {
				if (Bidder.startsWith(currentBidderArr[0]) && Bidder.endsWith(currentBidderArr[1])) {
					consoleUtil.log("当前出价人为自己，不进行出价操作");
					return;
				}
			}
		}

		OfferPricePara.price = price;

		consoleUtil.log(`出价：${price}元`)
		try {
			// 发出出价的请求
			const result = await postOfferPrice({ functionId: API.offer_price_function_id, body: OfferPricePara }, CurrentTime, Cookie);
			if (result && result.message) {
				new Notification({ title: noticeTitle, body: result.message }).show();
				handleSendNotice(`${result.message} — 当前出价：${price}`);
			}
		} catch (e) {
			consoleUtil.error("buyByAPI error: ", e.message);
		}
	}
}

/**
 * 最后倒计时出价处理
 */
async function handleLastMinuteBuy(time) {
	if (RefreshBatchInfoTimer === undefined) {
		// 刷新当前竞价信息
		refreshBatchInfo();
	}

	let bidTime = time - LastBidCountdownTime;
	bidTime <= 0 ? time - 100 : bidTime;
	consoleUtil.log(`${bidTime}毫秒后开始出价`);

	OfferPriceTimer && clearTimeout(OfferPriceTimer);

	OfferPriceTimer = setTimeout(async function () {
		try {
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
			RefreshBatchInfoTimer && clearInterval(RefreshBatchInfoTimer);
			if (isAboveMaxPrice) {
				consoleUtil.log("超过最高价格，抢购结束");
				new Notification({ title: noticeTitle, body: "超过最高价格，抢购结束" }).show();
				handleSendNotice(`超过最高价格，抢购结束`);
			} else {
				consoleUtil.log(new Date().getTime() + ":" + `出价${bidPrice}`);
				await buyByAPI(bidPrice);
			}
			await sleep(currentRemainTime + 1000);
			// 最后再获取商品信息，查看竞拍结果
			getBatchInfo(true);
		} catch (error) {
			consoleUtil.log("handleLastMinuteBuy error:", error.message);
		}
	}, bidTime);
}

/**
 * 处理cookie，将两个页面的cookie合并到一起
 * */
function mergeCookie(cookie_one, cookie_two) {
	let cookie = {};
	let string = "";
	for (let i in cookie_two) {
		cookie[cookie_two[i].name] = cookie_two[i].value;
	}

	for (let i in cookie_one) {
		cookie[cookie_one[i].name] = cookie_one[i].value;
	}

	for (let i in cookie) {
		string += `${i}=${cookie[i]};`
	}

	return string;
}

/**
 * 获得竞拍标的信息
 * */
async function getBidDetail(bidId) {
	let data = null;
	try {
		data = await fetchBidDetail(bidId);
	} catch (e) {
		consoleUtil.error("getBidDetail error:", e.message);
	}
	return data;
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
	productPage.goto(API.item_url + productId).catch();
}

/**
 * 发送通知消息的处理
 */
function handleSendNotice(msg) {
	const info = ProductDetail && ProductDetail.auctionInfo || {};
	sendNotice(`
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
	当前抢购人：${CurrentBidder || ''}
	当前抢购人昵称：${BidderNickName || ''}
	当前时间：${dayjs(CurrentTime ? CurrentTime : undefined).format('YYYY-MM-DD HH:mm:ss')}`);
}

module.exports = { goToBid, updateBid, getBidDetail, searchProduct, goToProductPage };
