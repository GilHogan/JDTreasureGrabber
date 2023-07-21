const puppeteer = require('puppeteer');
const findChrome = require('../node_modules/carlo/lib/find_chrome.js');
const querystring = require("querystring");
const https = require("https");
const API = require("./api");
const dayjs = require('dayjs');

// 商品的ID
let Item_ID;

// 最高能接受的价格
let MaxPrice;

// 初始刷新频率
let NextRefreshTime = 2000;

let Item_URL;
let OfferPricePara = null;

let page;
let NowPrice;
let EndTime;
let CurrentTime;
let Cookie = null;
let RefreshBatchInfoTimer;
let OfferPriceTimer;
let Bidder;
let CurrentBidder;
let Browser;
let CycleTimer;
let isLogin = false;
// 出价加价幅度
let Markup = 2;
// 最后出价倒数时间（毫秒）
let LastBidCountdownTime = 300;
// 是否为一口价
let IsFixedPrice = false;
const noticeTitle = "京东夺宝岛助手提示";

/**
 * 启动浏览器，加载页面
 * */
function goToBid(id, price, bidder, markup, lastBidCountdownTime, isFixedPrice) {

	if (Browser && Browser.isConnected()) {
		if (isLogin) {
			new window.Notification(noticeTitle, { body: "抢购已开始" });
			return;
		}
	}

	// 初始化参数
	resetData();

	Item_ID = id;
	MaxPrice = price;
	Item_URL = API.item_url + Item_ID;
	Bidder = bidder;
	Markup = markup;
	LastBidCountdownTime = lastBidCountdownTime;
	IsFixedPrice = isFixedPrice;
	console.log("goToBid Item_URL = ", Item_URL, Item_ID, MaxPrice, Bidder, Markup, LastBidCountdownTime, IsFixedPrice);
	initBid();
}

/**
 * 更新
 * */
async function updateBid(id, price, bidder, markup, lastBidCountdownTime, isFixedPrice) {

	if (!isLogin) {
		new window.Notification(noticeTitle, { body: "请先点击开始抢购，并登录" });
		return;
	}

	if (page && Browser) {
		// 初始化参数
		resetData();

		// 更新参数
		Item_ID = id;
		MaxPrice = price;
		Item_URL = API.item_url + Item_ID;
		Bidder = bidder;
		Markup = markup;
		LastBidCountdownTime = lastBidCountdownTime;
		IsFixedPrice = isFixedPrice;

		console.log("updateBid Item_URL = ", Item_URL, Item_ID, MaxPrice, Bidder, Markup, LastBidCountdownTime, IsFixedPrice);

		if (!page.isClosed()) {
			// 关闭之前的页面
			await page.off("request");
			await page.off("load");
			await page.close();
		}
		page = await Browser.newPage();

		console.log("updateBid page = ", page)

		handleGoToTargetPage();
	} else {
		new window.Notification(noticeTitle, { body: "请未找到抢购的浏览器窗口" });
		return;
	}
}

/**
 * 启动浏览器，加载页面
 * */
async function initBid() {

	await initBrowser();

	page = await Browser.newPage();

	console.log("initBid page = ", page)

	page.on("load", async function () {

		console.log("initBid load = ", page.url())
		console.log("initBid load = ", API.login_success_redirect_url)

		// 利用页面加载完成事件，判断是否是登录成功后的页面跳转
		if (page.url() === API.login_success_redirect_url || page.url() === (API.login_success_redirect_url + "/" + Item_ID)) {
			isLogin = true;
			// 跳转到目标商品页面
			handleGoToTargetPage();
		}
	});

	// 首先加载登录页面
	await page.goto(API.login_url).catch();

}

/**
 * 初始化浏览器
 */
async function initBrowser() {

	// let findChromePath = await findChrome({});
	// let executablePath = findChromePath.executablePath;
	if (Browser && Browser.isConnected()) {
		return;
	}

	Browser = await puppeteer.launch({
		// executablePath,
		headless: false,
		defaultViewport: null
	});

	Browser.on("disconnected", () => {
		console.log("Browser on disconnected");
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
	EndTime = null;
	CurrentTime = null;
	RefreshBatchInfoTimer && clearInterval(RefreshBatchInfoTimer);
	CycleTimer && clearTimeout(CycleTimer);
	OfferPriceTimer && clearTimeout(OfferPriceTimer);
	IsFixedPrice = false;
}

/**
 * 跳转到目标商品页面
 */
async function handleGoToTargetPage() {

	if (!page) {
		return;
	}

	await page.goto(Item_URL);

	// 需要使用两个页面的cookie
	let jd_cookie = await page.cookies(API.login_url);
	let page_cookie = await page.cookies();
	Cookie = mergeCookie(jd_cookie, page_cookie);
	console.log("initBid load = ", jd_cookie, page_cookie)
	console.log("initBid load Cookie = ", Cookie)

	console.log("等待商品页面加载完成，请手动完成页面人机验证")
	await waitItemPageLoadFinish();
	if (!page || page.isClosed()) {
		// 页面关闭，则退出
		return;
	}

	// 查询当前的价格和剩余时间
	await getBatchInfo();

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

						console.log("加密参数获取成功！！");

						request.abort();

						handlePriceAndTime();
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
* 判断是否进入商品页面，因为会进行人机认证，需要确保后续逻辑，再进入商品页面后再执行
* */
async function waitItemPageLoadFinish() {
	let button = null;
	let count = 0;
	const sleetSeconds = 1;

	do {
		if (page) {
			try {
				button = await page.$("#InitCartUrl");
				if (button === null) {
					await sleep(sleetSeconds * 1000);
				}
				count++;
				if (count >= sleetSeconds * 120) {
					console.log("page start reload.")
					count = 0;
					// 刷新页面，解决页面倒计时不准确的问题
					await page.reload();
				}
			} catch (error) {
				console.log(error);
			}

		}
	} while (button === null && page && !page.isClosed());
}


/**
 * 获得竞拍实时信息
 * */
function getBatchInfo() {
	return new Promise((resolve, reject) => {

		const path = `${API.api_jd_path}?functionId=paipai.auction.current_bid_info&t=${new Date().getTime()}&appid=paipai_sale_pc&client=pc&loginType=3&body=${encodeURI("{\"auctionId\":" + Item_ID + "}")}`;

		const startTime = new Date().getTime();
		console.log("getBatchInfo start 当前时间：" + dayjs(startTime).format('YYYY-MM-DD HH:mm:sss'), startTime)

		const options = {
			hostname: API.api_jd_hostname,
			port: 443,
			path: path,
			method: "GET",
			headers: {
				"referer": API.web_api_header_referer
			}
		};

		const req = https.request(options, (res) => {
			let rawData = "";
			// console.log("getBatchInfo get res = ", res)

			res.setEncoding('utf8');

			res.on('data', (chunk) => {
				rawData += chunk;
			});

			res.on('end', () => {
				const endTime = new Date().getTime();
				const offsetTime = endTime - startTime;
				console.log("getBatchInfo end endTime = ", endTime, " , offsetTime = ", offsetTime);
				try {
					const parsedData = JSON.parse(rawData);
					if (parsedData.result && parsedData.result.data && parsedData.result.data[Item_ID]) {
						NowPrice = parsedData.result.data[Item_ID].currentPrice;
						EndTime = parsedData.result.data[Item_ID].actualEndTime;
						CurrentTime = parsedData.result.list[0];
						console.log("getBatchInfo end origin CurrentTime = ", CurrentTime);
						// 假定服务器的当前时间是接口获取到的时间加上请求耗时
						CurrentTime = CurrentTime + offsetTime;
						CurrentBidder = parsedData.result.data[Item_ID].currentBidder;
						console.log("getBatchInfo get end NowPrice = ", NowPrice, ", CurrentTime = ", CurrentTime, ", EndTime = ", EndTime,
							", CurrentTime format = ", dayjs(CurrentTime).format('YYYY-MM-DD HH:mm:sss'), ", EndTime format = ", dayjs(EndTime).format('YYYY-MM-DD HH:mm:sss'),
							", CurrentBidder = ", CurrentBidder);
					}
				} catch (e) {
					console.error(e.message);
				}
				resolve();
			});
		});

		req.on('error', (e) => {
			console.error(`请求遇到问题: ${e.message}`);
			reject(e);
		});

		req.end();
	});
}

function sleep(milliseconds = 10) {
	return new Promise((resolve, reject) => {
		setTimeout(function () {
			resolve();
		}, milliseconds)
	});
}

function refreshBatchInfo() {
	let fetching = false;
	RefreshBatchInfoTimer = setInterval(async function () {
		if (fetching) {
			return;
		}
		fetching = true;
		await getBatchInfo();
		fetching = false;
	}, 10);
}

/**
 * 根据当前的出价和剩余时间做处理
 * 若剩余时间大于3s，每2s刷新一次，小于3s，就100ms刷新一次
 * 执行购买逻辑
 * */
function handlePriceAndTime() {

	const price = NowPrice || 1;
	const currentLocalTime = new Date().getTime();
	const time = EndTime - CurrentTime;

	console.log("当前价格：" + price, " , 最高价格：" + MaxPrice, " , 当前时间：" + dayjs(currentLocalTime).format('YYYY-MM-DD HH:mm:sss'));
	console.log("剩余抢购时间 毫秒：" + time, " , 秒：" + parseInt(time / 1000));
	console.log("当前出价人：" + CurrentBidder, " ,抢购用户账户名：" + Bidder);

	if (!OfferPricePara) {
		console.log("正在获取加密参数");
		buyByPage(1);
		return;
	}

	let isAboveMaxPrice = false;
	if (IsFixedPrice) {
		// 固定价格的处理方式
		if (MaxPrice && (price >= MaxPrice)) {
			isAboveMaxPrice = true;
		}
	} else {
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
		console.log("超过最高价格，抢购结束");
		RefreshBatchInfoTimer && clearInterval(RefreshBatchInfoTimer);
		new window.Notification(noticeTitle, { body: "超过最高价格，抢购结束" });
		return;
	}

	if (time < 0) {
		console.log("抢购时间结束");
		clearInterval(RefreshBatchInfoTimer);
		new window.Notification(noticeTitle, { body: "抢购时间结束" });
		return;
	}

	if (time < 5000) {
		if (RefreshBatchInfoTimer === undefined) {
			// 刷新当前竞价信息
			refreshBatchInfo();
		}

		let bidTime = time - LastBidCountdownTime;
		bidTime <= 0 ? time - 100 : bidTime;
		console.log(`${bidTime}毫秒后开始出价`);

		if (OfferPriceTimer) clearTimeout(OfferPriceTimer);

		OfferPriceTimer = setTimeout(async function () {
			try {
				let bidPrice;
				let isAboveMaxPrice = false;
				if (IsFixedPrice) {
					// 固定价格的处理方式
					bidPrice = MaxPrice;
					if (MaxPrice && (NowPrice >= MaxPrice)) {
						isAboveMaxPrice = true;
					}
				} else {
					// 加价的处理方式
					bidPrice = (NowPrice || 1) + Markup;
					if (bidPrice > MaxPrice && (NowPrice || 1) < MaxPrice) {
						// 当前出价加上出价幅度大于最大价格，并且当前出价小于最大价格时，使用最大价格进行购买
						bidPrice = MaxPrice;
					}
					if (MaxPrice && (bidPrice > MaxPrice)) {
						isAboveMaxPrice = true;
					}
				}

				const currentRemainTime = EndTime - CurrentTime;
				console.log(`${bidTime}毫秒后出价:${bidPrice}元，当前时间：${new Date().getTime()}, 上一次请求竞价信息后的剩余时间：${currentRemainTime}`);
				RefreshBatchInfoTimer && clearInterval(RefreshBatchInfoTimer);
				if (isAboveMaxPrice) {
					console.log("超过最高价格，抢购结束");
					new window.Notification(noticeTitle, { body: "超过最高价格，抢购结束" });
				} else {
					console.log(new Date().getTime() + ":" + `出价${bidPrice}`);
					await buyByAPI(bidPrice);
				}
				await sleep(currentRemainTime + 1000);
				// 最后再获取商品信息，查看竞拍结果
				getBatchInfo();
			} catch (error) {
				console.log(error);
			}
		}, bidTime);
		return;
	}

	CycleTimer = setTimeout(async function () {
		try {
			await getBatchInfo();
		} catch (error) {
			console.log(error);
		}
		handlePriceAndTime();
	}, NextRefreshTime)
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
		await page.click("#InitCartUrl").catch();
	} catch (e) {
		console.log("buyByPage error: ", e)
	}
}

/**
 * 通过直接调用api接口去出价
 * */
async function buyByAPI(price) {
	if (OfferPricePara === null) {
		console.log("没有正确获取到拍卖参数，无法执行购买");
	} else {
		if (Bidder && CurrentBidder) {
			const currentBidderArr = CurrentBidder.split("***");
			if (currentBidderArr && currentBidderArr.length == 2) {
				if (Bidder.startsWith(currentBidderArr[0]) && Bidder.endsWith(currentBidderArr[1])) {
					console.log("当前出价人为自己，不进行出价操作");
					return;
				}
			}
		}

		OfferPricePara.price = price;

		console.log(`出价：${price}元`)
		return requestOfferPrice({
			functionId: API.offer_price_function_id,
			body: OfferPricePara
		});
	}
}

/**
 * 发出出价的请求
 * */
function requestOfferPrice(para) {
	return new Promise((resolve, reject) => {
		const price = para.body.price;
		para.body = JSON.stringify(para.body);
		let postData = querystring.stringify(para);

		let path = `${API.api_jd_path}?t=${CurrentTime}&appid=paipai_sale_pc`;

		console.log("requestOfferPrice start 出价 = ", price, " , 当前时间：", dayjs().format('YYYY-MM-DD HH:mm:sss'), new Date().getTime());

		const options = {
			hostname: API.api_jd_hostname,
			port: 443,
			path: path,
			method: "POST",
			headers: {
				"Content-Type": 'application/x-www-form-urlencoded',
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
				"cookie": Cookie,
				"referer": API.web_api_header_referer,
				"sec-fetch-mode": "cors"
			}
		};

		const req = https.request(options, (res) => {
			let rawData = "";

			res.setEncoding('utf8');

			res.on('data', (chunk) => {
				rawData += chunk;
			});

			res.on('end', () => {
				console.log("requestOfferPrice end 出价:", price, ", 当前时间：", dayjs().format('YYYY-MM-DD HH:mm:sss'), new Date().getTime(), " , 结果:" + rawData);
				const parsedData = JSON.parse(rawData);
				if (parsedData.result && parsedData.result.message) {
					new window.Notification(noticeTitle, { body: parsedData.result.message });
				}
				resolve();
			});
		});

		req.on('error', (e) => {
			console.error(`requestOfferPrice 请求遇到问题: ${e.message}`);
			reject(e);
		});

		req.write(postData);
		req.end();
	});
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
function getBidDetail(bidId) {
	return new Promise((resolve, reject) => {

		const path = `${API.api_jd_path}?functionId=paipai.auction.detail&t=${new Date().getTime()}&appid=paipai_sale_pc&client=pc&loginType=3&body=${encodeURI("{\"auctionId\":" + bidId + "}")}`;
		const options = {
			hostname: API.api_jd_hostname,
			port: 443,
			path: path,
			method: "GET",
			headers: {
				"referer": API.web_api_header_referer
			}
		};

		const req = https.request(options, (res) => {
			let rawData = "";

			res.setEncoding('utf8');

			res.on('data', (chunk) => {
				rawData += chunk;
			});

			res.on('end', () => {
				let data = null;
				console.log("getBidDetail end rawData = ", rawData);

				try {
					const parsedData = JSON.parse(rawData);
					if (parsedData.result && parsedData.result.data) {
						data = parsedData.result.data;
					}
				} catch (e) {
					console.error(e.message);
				}
				resolve(data);
			});
		});

		req.on('error', (e) => {
			console.error(`getBidDetail 请求遇到问题: ${e.message}`);
			reject(e);
		});

		req.end();
	});
}

/**
 * 搜索产品
 * status: ""：全部，1：即将开始，2：正在进行
 * */
function searchProduct(name, pageNo = 1, status = "") {
	return new Promise((resolve, reject) => {

		console.log("searchProduct name = ", name, " , pageNo = ", pageNo, " , status = ", status);

		if (!name) {
			resolve(null);
		}

		const path = `${API.api_jd_path}?functionId=pp.dbd.biz.search.query&t=${new Date().getTime()}&appid=paipai_h5`;
		const options = {
			hostname: API.api_jd_hostname,
			port: 443,
			path: path,
			method: "POST",
			headers: {
				"Content-Type": 'application/x-www-form-urlencoded',
				"User-Agent": "jdapp;android;12.0.2;;;M/5.0;appBuild/98787;ef/1;ep/%7B%22hdid%22%3A%22JM9F1ywUPwflvMIpYPok0tt5k9kW4ArJEU3lfLhxBqw%3D%22%2C%22ts%22%3A1685444654944%2C%22ridx%22%3A-1%2C%22cipher%22%3A%7B%22sv%22%3A%22CJC%3D%22%2C%22ad%22%3A%22CtG3YtCyDtc3EJCmC2OyYm%3D%3D%22%2C%22od%22%3A%22CzY5ZJU0CQU3C2OyEJvwYq%3D%3D%22%2C%22ov%22%3A%22CzC%3D%22%2C%22ud%22%3A%22CtG3YtCyDtc3EJCmC2OyYm%3D%3D%22%7D%2C%22ciphertype%22%3A5%2C%22version%22%3A%221.2.0%22%2C%22appname%22%3A%22com.jingdong.app.mall%22%7D;jdSupportDarkMode/0;Mozilla/5.0 (Linux; Android 13; MI 8 Build/TKQ1.220905.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/89.0.4389.72 MQQBrowser/6.2 TBS/046247 Mobile Safari/537.36",
				"Referer": API.app_api_header_referer,
				"Sec-Fetch-Mode": "cors"

			}
		};
		const params = { pageNo: pageNo, pageSize: 20, key: name, status: status, sort: "endTime_asc", specialType: 1, mpSource: 1, sourceTag: 2 };
		const bodyParams = {};
		// data的encode方式有点奇怪
		bodyParams.body = JSON.stringify(params);
		const postData = querystring.stringify(bodyParams);

		const req = https.request(options, (res) => {
			let rawData = "";

			res.setEncoding('utf8');

			res.on('data', (chunk) => {
				rawData += chunk;
			});

			res.on('end', () => {
				let data = null;
				try {
					if (rawData) {
						const parsedData = JSON.parse(rawData);
						if (parsedData.result && parsedData.result.data) {
							data = parsedData.result.data;
						}
					}
				} catch (e) {
					console.error(e.message);
				}
				resolve(data);
			});
		});

		req.on('error', (e) => {
			console.error(`searchProduct 请求遇到问题: ${e.message}`);
			reject(e);
		});

		req.write(postData);
		req.end();
	});
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

module.exports = { goToBid, updateBid, getBidDetail, searchProduct, goToProductPage };
