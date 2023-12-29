const { getUserData } = require("./storeUtil");
const http = require('http');
const Constants = require("../../constant/constants");

const https = require("https");
const consoleUtil = require('./consoleLogUtil');

function sendNotice(msg) {
    consoleUtil.log("start sendNotice msg = ", msg);
    const userDataOptions = getUserData()[Constants.StoreKeys.OPTIONS_KEY];
    const { enableTel, telBotToken, telChatId } = userDataOptions || {};
    if (enableTel && telBotToken && telChatId) {
        // 发送电报消息
        sendTelMsg(telBotToken, telChatId, msg, userDataOptions)
            .catch((e) => { consoleUtil.log("sendTelMsg error = ", e); });
    }
}

/**
 * 发送电报消息
 */
function sendTelMsg(botToken, chatId, msg, userDataOptions) {
    const { enableHttpProxy, proxyHost, proxyPort, proxyUserName, proxyPassword } = userDataOptions;
    return new Promise((resolve, reject) => {
        const options = {
            hostname: "api.telegram.org",
            port: 443,
            path: `/bot${botToken}/sendMessage`,
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            }
        };
        const postData = JSON.stringify({ chat_id: chatId, text: msg });

        if (enableHttpProxy && proxyHost && proxyPort) {
            const proxyHeaders = {};
            if (proxyUserName && proxyPassword) {
                proxyHeaders['Proxy-Authorization'] = 'Basic ' + Buffer.from(proxyUserName + ':' + proxyPassword).toString('base64');
            }
            http.request({
                host: proxyHost,
                port: proxyPort,
                method: 'CONNECT',
                path: `api.telegram.org:443`,
                headers: proxyHeaders,
            }).on('connect', (res, socket) => {
                if (res.statusCode === 200) {
                    // connected to proxy server
                    options.agent = new https.Agent({ socket });
                    postTelRequest(options, postData, resolve, reject);
                } else {
                    reject("代理服务器连接失败");
                }
            }).on('error', (err) => {
                consoleUtil.error(`sendTelMsg 代理请求遇到问题: ${err.message}`);
                reject(err);
            }).end();

        } else {
            postTelRequest(options, postData, resolve, reject);
        }
    });
}

/**
 * 发起telgram发送消息请求
 */
function postTelRequest(options, postData, resolve, reject) {
    const req = https.request(options, (res) => {
        let rawData = "";

        res.setEncoding('utf8');

        res.on('data', (chunk) => {
            rawData += chunk;
        });

        res.on('end', () => {
            const parsedData = JSON.parse(rawData);
            consoleUtil.log("sendTelMsg end parsedData = ", parsedData);
            resolve();
        });
    });

    req.on('error', (e) => {
        consoleUtil.error(`sendTelMsg 请求遇到问题: ${e.message}`);
        reject(e);
    });

    req.write(postData);
    req.end();
}

module.exports = { sendNotice };
