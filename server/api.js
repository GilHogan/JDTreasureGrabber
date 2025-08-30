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
 * @param {object} requestOptions - 包含请求URL、方法、头和体的对象
 * @param {string} requestOptions.url - 完整的请求URL
 * @param {string} requestOptions.method - 请求方法 (GET/POST)
 * @param {object} requestOptions.headers - 请求头对象
 * @param {string} [requestOptions.postData] - 请求体 (可选)
 * */
function fetchBatchInfo(requestOptions) {
	return new Promise((resolve, reject) => {
		if (!requestOptions || !requestOptions.url) {
			consoleUtil.error("fetchBatchInfo: requestOptions 或 requestOptions.url 无效");
			reject(new Error("请求参数无效"));
			return;
		}

		let url;
		try {
			url = new URL(requestOptions.url);
		} catch (e) {
			consoleUtil.error(`fetchBatchInfo: URL 解析失败 - ${e.message}. URL: ${requestOptions.url}`);
			reject(new Error(`URL 解析失败: ${e.message}`));
			return;
		}

		const searchParams = url.searchParams;
		searchParams.set('t', new Date().getTime()); // 动态更新 t 参数

		const options = {
			hostname: url.hostname,
			port: url.port || 443,
			path: url.pathname + '?' + searchParams.toString(),
			method: requestOptions.method || "GET",
			headers: requestOptions.headers || {}
		};

		let req;
		try {
			req = https.request(options, (res) => {
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
		} catch (e) {
			consoleUtil.error(`fetchBatchInfo: https.request 调用失败 - ${e.message}. Options: ${JSON.stringify(options)}`);
			reject(new Error(`请求创建失败: ${e.message}`));
			return;
		}


		req.on('error', (e) => {
			consoleUtil.error(`请求遇到问题: ${e.message}`);
			reject(e);
		});

		if (requestOptions.postData) {
			req.write(requestOptions.postData);
		}
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
 * 避免服务端限流的循环请求
 * @param {function} requestFn 请求方法
 * @param {number} maxFetchTimes 最大请求次数
 * @param {number} baseWaitingMillisecond 基础等待时间（毫秒）
 */
async function loopRequestAvoidCurrentLimiting(requestFn, maxFetchTimes = 0, baseWaitingMillisecond = 30000) {
	let result = null;
	let fetchTimes = 0;
	do {
		fetchTimes++;
		try {
			// 执行查询请求
			result = await requestFn();
			result = result || true;
		} catch (e) {
			consoleUtil.log("loopRequestAvoidCurrentLimiting error: ", e.message);
			// 尝试避免服务端限流，请求结果有时为空，这里等待一会儿再做查询
			await sleep(baseWaitingMillisecond * fetchTimes);
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
	loopRequestAvoidCurrentLimiting,
	sleep,
	checkAuctionDetailCurl
};
