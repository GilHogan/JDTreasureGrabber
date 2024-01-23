// 抢购方式
const BiddingMethod = {
    ON_OTHERS_BID: 1, // 自动加价
    WITHIN_PRICE_RANGE: 2, // 在价格区间内加价
    ONE_TIME_BID: 3, // 一口价
}

module.exports = {
    // 抢购方式
    BiddingMethod: BiddingMethod,
    // 存储数据的键
    StoreKeys: {
        COOKIES_KEY: "cookies",
        OPTIONS_KEY: "options"
    },
    // 接口地址
    API: {
        api_jd_hostname: "api.m.jd.com",
        api_jd_path: "/api",
        api_jd: "https://api.m.jd.com/api",
        item_url: "https://paipai.jd.com/auction-detail/",
        login_url: "https://passport.jd.com/new/login.aspx?from=paipai_pc&ReturnUrl=https%3A%2F%2Fpaipai.jd.com%2Fauction-list",
        login_success_redirect_url: "https://paipai.jd.com/auction-list",
        offer_price_function_id: "paipai.auction.offerPrice",
        web_api_header_referer: "https://paipai.jd.com/",
        app_api_header_referer: "https://paipai.m.jd.com/",
        image_url: "https://img10.360buyimg.com/",
        get_js_token_url: "https://gia.jd.com/jsTk.do",
        get_user_info_url: "https://used-api.jd.com/common/user/info",
    },
    BiddingMethodOptions: [
        {
            value: BiddingMethod.ON_OTHERS_BID,
            label: "自动加价",
        },
        {
            value: BiddingMethod.WITHIN_PRICE_RANGE,
            label: "价格区间内加价",
        },
        {
            value: BiddingMethod.ONE_TIME_BID,
            label: "一口价",
        },
    ],
}
