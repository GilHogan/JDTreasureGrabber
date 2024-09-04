const Constants = require("../../constant/constants");
const API = Constants.API;

/**
 * 设置一个CustomRealPriceInfoForColor接口的默认响应数据
 */
const defaultCustomRealPriceInfoForColorRes = {
    "skuPriceInfoResponseList": [
        {
            "priceResult": {
                "marketPrice": "169.00",
                "pr": 35,
                "rd": 0,
                "cashBackFlag": 0,
                "originalPrice": "109.00",
                "jdPrice": "69.90",
                "class": "com.jd.pap.priceinfo.sdk.domain.response.PriceResult"
            },
            "extProp": {
                "mutexPromos": "[]"
            },
            "class": "com.jd.pap.priceinfo.sdk.domain.response.SkuPriceInfoResponse",
            "skuId": "100030658346"
        }
    ],
    "class": "com.jd.pap.priceinfo.sdk.domain.response.CustomPriceinfoResponse",
    "success": true,
    "ip": "11.118.17.100"
}

/**
 * 拦截页面请求的处理
 */
async function interceptHandler(page) {
    if (!page) {
        return;
    }

    // 获取商品详情接口的响应结果
    const res = global.AuctionDetailRes || {};
    // 启用拦截器
    await page.setRequestInterception(true).catch();

    page.on('request', request => {
        const requestUrl = request.url();
        if (requestUrl.endsWith('/__webpack_hmr')) {
            request.abort();
            return;
        }

        if (requestUrl.indexOf(API.api_jd) !== -1 && requestUrl.indexOf(API.offer_price_function_id) !== -1) {
            // 出价接口不做处理
            return;
        }
        if (request.isInterceptResolutionHandled()) {
            return;
        }

        if (requestUrl.includes(API.detail_function_param)) {
            // 获取url参数
            if (res && res.result && res.result.data) {
                request.respond({
                    status: 200,
                    headers: {
                        "Access-Control-Allow-Origin": "*"
                    },
                    contentType: 'application/json;charset=UTF-8',
                    body: JSON.stringify(res)
                }).catch();
            }

            return;
        } else if (requestUrl.includes("functionId=mzhprice_getCustomRealPriceInfoForColor")) {
            request.respond({
                status: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*"
                },
                contentType: 'application/json;charset=UTF-8',
                body: JSON.stringify(defaultCustomRealPriceInfoForColorRes)
            }).catch();

            return;
        }

        request.continue().catch();
    });

}


module.exports = { interceptHandler };