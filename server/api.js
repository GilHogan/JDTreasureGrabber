const querystring = require("querystring");
const https = require("https");
const dayjs = require('dayjs');
const consoleUtil = require('./utils/consoleLogUtil');
const API = require("../constant/constants").API;
const { getUserDataProperty } = require("./utils/storeUtil");
const http = require('http');
const Constants = require("../constant/constants");
const curlconverterUtil = require("curlconverter/util");
const request = require("request");
const { sendNotice } = require('./utils/noticeUtil');

/**
 * 发出出价的请求
 * */
function postOfferPrice(para, currentTime, cookies) {
	const userDataOptions = getUserDataProperty(Constants.StoreKeys.OPTIONS_KEY) || {};
	const { enableApiHttpProxy, apiProxyHost, apiProxyPort, apiProxyUserName, apiProxyPassword } = userDataOptions;

	return new Promise((resolve, reject) => {
		const price = para.body.price;
		para.body = JSON.stringify(para.body);
		let postData = querystring.stringify(para);

		let path = `${API.api_jd_path}?t=${currentTime}&appid=paipai_sale_pc`;

		consoleUtil.log("postOfferPrice start 出价 = ", price, " , 当前时间：", dayjs().format('YYYY-MM-DD HH:mm:sss'), new Date().getTime());

		const options = {
			hostname: API.api_jd_hostname,
			port: 443,
			path: path,
			method: "POST",
			headers: {
				"Content-Type": 'application/x-www-form-urlencoded',
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
				"cookie": cookies,
				"referer": API.web_api_header_referer,
				"sec-fetch-mode": "cors"
			}
		};

		if (enableApiHttpProxy && apiProxyHost && apiProxyPort) {
			const proxyHeaders = {};
			if (apiProxyUserName && apiProxyPassword) {
				proxyHeaders['Proxy-Authorization'] = 'Basic ' + Buffer.from(apiProxyUserName + ':' + apiProxyPassword).toString('base64');
			}
			http.request({
				host: apiProxyHost,
				port: apiProxyPort,
				method: 'CONNECT',
				path: `${API.api_jd_hostname}:443`,
				headers: proxyHeaders,
			}).on('connect', (res, socket) => {
				if (res.statusCode === 200) {
					// connected to proxy server
					options.agent = new https.Agent({ socket });
					handlePostOfferPrice(options, postData, price, resolve, reject);
				} else {
					reject("代理服务器连接失败");
				}
			}).on('error', (err) => {
				consoleUtil.error(`postOfferPrice 代理请求遇到问题: ${err.message}`);
				reject(err);
			}).end();
		} else {
			handlePostOfferPrice(options, postData, price, resolve, reject);
		}
	});
}

function handlePostOfferPrice(options, postData, price, resolve, reject) {
	const req = https.request(options, (res) => {
		let rawData = "";

		res.setEncoding('utf8');

		res.on('data', (chunk) => {
			rawData += chunk;
		});

		res.on('end', () => {
			consoleUtil.log("postOfferPrice end 出价:", price, ", 当前时间：", dayjs().format('YYYY-MM-DD HH:mm:sss'), new Date().getTime(), " , 结果:" + rawData);
			let result = null
			try {
				const parsedData = JSON.parse(rawData) || {};
				result = parsedData.result;
			} catch (e) {
				consoleUtil.error("postOfferPrice error: ", e.message);
			}
			resolve(result);
		});
	});

	req.on('error', (e) => {
		consoleUtil.error(`postOfferPrice 请求遇到问题: ${e.message}`);
		reject(e);
	});

	req.write(postData);
	req.end();
}

/**
 * 获得竞拍实时信息请求
 * */
function fetchBatchInfo(bidId) {
	return new Promise((resolve, reject) => {

		const path = `${API.api_jd_path}?functionId=paipai.auction.current_bid_info&t=${new Date().getTime()}&appid=paipai_sale_pc&client=pc&loginType=3&body=${encodeURI("{\"auctionId\":" + bidId + "}")}`;

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
				try {
					const parsedData = JSON.parse(rawData);
					if (parsedData.result) {
						resolve(parsedData.result);
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
			});
		});

		req.on('error', (e) => {
			consoleUtil.error(`请求遇到问题: ${e.message}`);
			reject(e);
		});

		req.end();
	});
}

/**
 * 校验商品详情接口的curl,返回商品id
 */
function checkAuctionDetailCurl(auctionDetailCurl) {
	let auctionId = null;
	if (!auctionDetailCurl) {
		sendNotice(`请先设置商品详情接口的curl`);
		return auctionId;
	}
	// curl解析为request请求的传参
	const curlOptions = curlconverterUtil.parseCurlCommand(auctionDetailCurl);

	if (!curlOptions || !curlOptions.query || !curlOptions.query.body) {
		sendNotice(`商品详情接口的curl解析失败`);
		return auctionId;
	}
	const curlBody = JSON.parse(decodeURI(curlOptions.query.body));
	if (!curlBody || !curlBody.auctionId) {
		sendNotice(`商品详情接口的curl解析失败`);
		return auctionId;
	}
	auctionId = curlBody.auctionId;
	return auctionId;
}

/**
 * 获得竞拍标的信息请求
 * */
function fetchBidDetail(auctionDetailCurl) {
	// 校验商品详情接口的curl
	if (!checkAuctionDetailCurl(auctionDetailCurl)) {
		return;
	}
	// curl解析为request请求的传参
	const curlOptions = curlconverterUtil.parseCurlCommand(auctionDetailCurl);

	return new Promise((resolve, reject) => {
		request(curlOptions, (error, response, body) => {
			if (error) {
				consoleUtil.error(`fetchBidDetail 请求遇到问题: ${error}`);
				reject(error);
			} else {
				const jsonBody = JSON.parse(body);
				if (response.statusCode == 200) {
					resolve(jsonBody);
				} else {
					consoleUtil.error(`fetchBidDetail 请求遇到问题 statusCode: ${response.statusCode}`);
					resolve(jsonBody);
				}
			}
		});
	});
}

/**
 * 搜索产品请求
 * status: ""：全部，1：即将开始，2：正在进行
 * */
function fetchProduct(params = {}) {
	const { name, pageNo = 1, status = "" } = params;
	return new Promise((resolve, reject) => {

		let path, params;
		if (name) {
			path = `${API.api_jd_path}?functionId=pp.dbd.biz.search.query&t=${new Date().getTime()}&appid=paipai_h5`;
			params = { pageNo: pageNo, pageSize: 20, key: name, status: status, sort: "endTime_asc", specialType: 1, mpSource: 1, sourceTag: 2 };
		} else {
			path = `${API.api_jd_path}?functionId=dbd.auction.list.v2&t=${new Date().getTime()}&appid=paipai_h5`;
			params = { pageNo: pageNo, pageSize: 20, key: name, status: status, auctionFilterTime: 180, isPersonalRecommend: 0, p: 2, skuGroup: 1, mpSource: 1, sourceTag: 2 };
		}

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

		const bodyParams = {};
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
					consoleUtil.error("fetchProduct error:", e.message);
				}
				resolve(data);
			});
		});

		req.on('error', (e) => {
			consoleUtil.error(`fetchProduct 请求遇到问题: ${e.message}`);
			reject(e);
		});

		req.write(postData);
		req.end();
	});
}

/**
 * 避免服务端限流的循环请求
 * @param {function} requestFn 请求方法
 * @param {number} maxFetchTimes 最大请求次数
 * @param {number} baseWaitingMinute 基础等待时间（分钟）
 */
async function loopRequestAvoidCurrentLimiting(requestFn, maxFetchTimes = 0, baseWaitingMinute = 5) {
	let result = null;
	let fetchTimes = 0;
	do {
		fetchTimes++;
		try {
			await sleep(1000);
			// 执行查询请求
			result = await requestFn();
			result = result || true;
		} catch (e) {
			// 尝试避免服务端限流，请求结果有时为空，这里等待一会儿再做查询
			await sleep(1000 * 60 * baseWaitingMinute * fetchTimes);
			consoleUtil.log("loopRequestAvoidCurrentLimiting error: ", e.message);
		}
	} while ((maxFetchTimes ? fetchTimes <= maxFetchTimes : true) && !result);
	return result;
}

function sleep(milliseconds = 10) {
	return new Promise((resolve, reject) => {
		setTimeout(function () {
			resolve();
		}, milliseconds)
	});
}

module.exports = {
	postOfferPrice,
	fetchBatchInfo,
	fetchBidDetail,
	fetchProduct,
	loopRequestAvoidCurrentLimiting,
	sleep,
	checkAuctionDetailCurl
};
