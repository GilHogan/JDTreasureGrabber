
const { goToBid, updateBid, getBidDetail, searchProduct, goToProductPage } = require("./index");

async function ipcHandle(e, args) {
    console.log("ipcHandle args = ", args)
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
    }

    return data;
}

module.exports = { ipcHandle };
