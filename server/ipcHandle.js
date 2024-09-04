
const { goToBid, updateBid, getBidDetail, searchProduct, goToProductPage } = require("./index");
const { getUserDataProperty, setUserDataJsonProperty } = require("./utils/storeUtil");
const { openLinkInBrowser } = require("./utils/commonUtil");

async function ipcHandle(e, args) {
    if (!args || !args.event) {
        return;
    }
    const event = args.event;
    const params = args.params;
    let data;
    if (event == "startBid") {
        goToBid(params);
    } else if (event == "fetchBidDetail") {
        data = await getBidDetail(params);
    } else if (event == "startUpdateBid") {
        data = await updateBid(params);
    } else if (event == "fetchProduct") {
        data = await searchProduct(params);
    } else if (event == "handleGoToProductPage") {
        data = await goToProductPage(params);
    } else if (event == "handleGoToProductPage") {
        data = await goToProductPage(params);
    } else if (event == "getUserDataProperty") {
        data = getUserDataProperty(params);
    } else if (event == "setUserDataJsonProperty") {
        setUserDataJsonProperty(params.key, params.value);
    } else if (event == "openLink") {
        openLinkInBrowser(params);
    }


    return data;
}

module.exports = { ipcHandle };
