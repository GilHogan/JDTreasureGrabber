/**
 * 会用到的京东接口地址
 * */
const API = {
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
};
module.exports = API;