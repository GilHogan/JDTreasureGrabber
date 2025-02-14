const { goToBid, updateBid, getLoginStatus, isBrowserDisconnected, cancelBid } = require("./index");
const { sleep } = require("./api");
const consoleUtil = require('./utils/consoleLogUtil');
const { sendNotice } = require('./utils/noticeUtil');
const { mainSendToRender } = require('./utils/mainProcessMsgHandle');

// 是否停止抢购整个列表
let isBiddingStopped = false;
let endTimer = null;

/**
 * 开始列表抢购的处理
 */
async function startProcessShoppingList(paramsStr, isStart = true) {
  const { enableStopOnSuccess, shoppingList } = JSON.parse(paramsStr);
  if (!shoppingList && shoppingList.length === 0) {
    return;
  }

  if (isStart && getLoginStatus()) {
    sendNotice("抢购已开始");
    return;
  }

  updateRenderProcessStatus("执行中...");

  for (let i = 0; i < shoppingList.length; i++) {
    if (isBiddingStopped || isBrowserDisconnected()) {
      consoleUtil.log("抢购列表处理已停止");
      handleProcessFinished(false);
      return;
    }

    const shoppingItem = shoppingList[i];
    if (!shoppingItem || !shoppingItem.id) {
      continue;
    }
    const itemId = shoppingItem.id;
    consoleUtil.log(`开始处理商品 ${i + 1}/${shoppingList.length}, ID: ${itemId}`);
    try {
      let bidResult;
      if (getLoginStatus()) {
        bidResult = await updateBid(shoppingItem);
      } else {
        bidResult = await goToBid(shoppingItem);
      }
      consoleUtil.log(`商品 ${itemId} 抢购结果：`, bidResult.isError, bidResult.isBidSuccess);
      if (!bidResult) {
        continue;
      }
      if (bidResult.isError) {
        sendNotice(`商品 ${itemId} 抢购异常`);
        handleProcessFinished(true);
        return;
      }
      if (bidResult.isBidSuccess && enableStopOnSuccess) {
        handleProcessFinished(true);
        return;
      }
    } catch (error) {
      consoleUtil.error(`商品 ${itemId} 抢购出现异常:`, error.message);
      handleProcessFinished(false);
      return;
    }
    if (i === shoppingList.length - 1) {
      handleProcessFinished(true);
    }
  }
}

/**
 * 更新列表抢购的处理
 */
async function updateProcessShoppingList(paramsStr) {
  // 取消当前抢购
  isBiddingStopped = true;
  endTimer && clearTimeout(endTimer);
  endTimer = null;
  cancelBid();

  await sleep(1000);
  isBiddingStopped = false;
  // 重新开始抢购
  startProcessShoppingList(paramsStr, false);
}

/**
 * 更新列表的执行状态
 */
function updateRenderProcessStatus(msg) {
  // 数据发送到渲染进程
  mainSendToRender("update.process.status", msg);
}

/**
 * 处理结束
 */
function handleProcessFinished(isNotice) {
  const msg = "抢购列表执行结束";
  if (isNotice) {
    endTimer = setTimeout(() => {
      sendNotice(msg, `【抢购通知】 ${msg}`);
      endTimer = null;
    }, 2000);
  }
  updateRenderProcessStatus("执行结束");
}

module.exports = { startProcessShoppingList, updateProcessShoppingList };
