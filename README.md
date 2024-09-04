# 京东夺宝岛助手

在 release 中可直接下载或自行打包构建😘

[![release](https://img.shields.io/github/v/release/GilHogan/JDTreasureGrabber?color=blue&label=Release)](https://github.com/GilHogan/JDTreasureGrabber/releases)

**注意📢**

- 本软件不保证能抢购成功😂
- 使用前先安装 Chrome 浏览器
- 开始抢购后，浏览器页面提示“系统忙，请稍后再试！”的弹窗是正常现象（[参考](https://github.com/GilHogan/JDTreasureGrabber/issues/1#issuecomment-1694940594)），不必在意
- 所有抢购方式均为：在商品抢购结束时刻之前出价一次
- 除了一口价抢购方式外，加价抢购方式均以他人的出价为基础进行加价
- 关闭抢购商品所在的浏览器即为结束抢购；抢购还未开始时，最小化浏览器或离开商品页面不会进行后续的出价
- telegram配置中，bot token和chat id参数的获取[参考](https://medium.com/@ManHay_Hong/how-to-create-a-telegram-bot-and-send-messages-with-python-4cf314d9fa3e)，或自行搜索解决
- auction.detail请求的curl参数获取方式：
  
  1. 打开系统的chrome浏览器（不带有“受控软件”的相关提示），进入要抢购的商品页面
  2. 按F12打开调试窗口，点击调试窗口中的Network（网络）选项卡
  3. 复制auction.detail请求的curl参考如下图，如果没有看到auction.detail请求，则刷新页面再试：
  4. 把复制的curl粘贴到“auction.detail请求的curl”参数的输入框中进行查询、抢购即可
  
  <img alt='review' src="assets\images\get_curl.png" width="60%" style="">


## 功能🎉

1. 支持多种抢购方式进行抢购
2. 设置最后出价时间（出价后提示抢购已结束时，调大最后出价时间试试）
3. 商品信息查询
4. 抢购结果通知到telegram
5. 自动登录（记住登录信息）
6. 自动更新（MacOS暂不支持）

## 截图预览📺

<img alt='review' src="assets\images\preview.png" width="60%" style="">
<img alt='review' src="assets\images\preview2.png" width="60%" style="">
<img alt='review' src="assets\images\preview_telegram.png" width="60%" style="">

## 开发相关🐵

- 安装模块
  ```
      npm i
  ```
- 启动服务，可在本地浏览器上进行 UI 调试
  ```
      npm run serve
  ```
- 构建&运行项目进行开发调试
  ```
      npm run build
      npm start
  ```
- 构建&打包项目
  ```
      npm run dist
  ```

- arm架构的系统构建方式参考，[参考1](https://github.com/jordansissel/fpm/issues/1801#issuecomment-919877499)，[参考2](https://www.beekeeperstudio.io/blog/electron-apps-for-arm-and-raspberry-pi)
