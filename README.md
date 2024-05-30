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

## 功能🎉

1. 支持多种抢购方式进行抢购
2. 设置最后出价时间（出价后提示抢购已结束时，调大最后出价时间试试）
3. 商品信息查询
4. 抢购结果通知到telegram
5. 自动登录（记住登录信息）

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

## 更新日志📆

### 0.3.5
- 修复商品列表图片加载失败问题
- 添加自动更新功能

### 0.3.4
- 桌面通知开关
- 新增后台出价模式
- 可配置出价接口eid参数
- 菜单栏添加项目信息

### 0.3.3
- 减少：循环刷新页面导致的围观次数无意义的增长
- 优化：频繁发送请求，导致京东接口限流的处理
- 商品搜索列表排序优化
- 查询单个商品时仅校验商品id
- 京东出价接口可配置代理
- 可配置默认抢购方式，默认加价幅度和默认出价时间

### 0.3.2
- 添加自动登录功能
- 商品信息部分ui优化
- 2023年即将过去，预祝大家元旦快乐 🎉🎉🎉

### 0.3.1
- arm架构下，主进程console.log抛异常修复
- 添加Telegram通知功能
- 修复商品列表起拍价数据错误问题
- 添加低于起拍价的校验

### 0.3.0

- 模块升级 vue2->vue3
- 主进程与渲染进程通信方式优化，提升安全性
- 抢购方式分类
- 新增暗黑主题；ui 排版优化
- 切换分页页码后列表自动滚动到顶部
- 支持不输入商品名称进行全商品浏览
- 点击商品搜索列表中的商品 id 可直接查询商品详情

### 0.2.15

- 修复 linux 应用图标不显示问题
- 添加 linux-arm64 release 包

### v0.2.14

- 初版
