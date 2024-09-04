const { shell } = require('electron');

/**
 * 获取url中的参数
 */
function getUrlParams(url) {
    // 通过 ? 分割获取后面的参数字符串
    const urlStr = url.split('?')[1]
    // 创建空对象存储参数
    const obj = {};
    // 再通过 & 将每一个参数单独分割出来
    const paramsArr = urlStr.split('&')
    for (let i = 0, len = paramsArr.length; i < len; i++) {
        // 再通过 = 将每一个参数分割为 key:value 的形式
        let arr = paramsArr[i].split('=')
        obj[arr[0]] = arr[1];
    }
    return obj
}

/**
 * 在浏览器中打开链接
 */
function openLinkInBrowser(url) {
    console.log("openLinkInBrowser ", url)
    shell.openExternal(url);
}

module.exports = { getUrlParams, openLinkInBrowser };
