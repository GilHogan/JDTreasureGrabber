# 京东夺宝岛助手

在 release 中可直接下载或自行打包构建

[![release](https://img.shields.io/github/v/release/GilHogan/JDTreasureGrabber?color=blue&label=Release)](https://github.com/GilHogan/JDTreasureGrabber/releases)

**注意：**

- 本软件不保证能抢购成功
- 使用前先安装 Chrome 浏览器
- 开始抢购后，浏览器页面提示“系统忙，请稍后再试！”的弹窗是正常现象（[参考](https://github.com/GilHogan/JDTreasureGrabber/issues/1#issuecomment-1694940594)），不必在意
- 所有出价方式均为：在商品抢购结束时刻之前出价一次
- 除了一口价出价方式外，加价出价方式均以他人的出价为基础进行加价

## 功能

1. 支持多种出价方式进行抢购
2. 设置最后出价时间（出价后提示抢购已结束时，调大最后出价时间试试）
3. 商品信息查询

## 小技巧
- 可以尝试应用多开，并登录不同的账号抢同一个商品可提高成功率

## 截图

<img alt='review' src="assets\images\preview.png" width="70%" style="">

## 开发相关命令

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

## 更新日志

### 0.3.0

- 模块升级 vue2->vue3
- 主进程与渲染进程通信方式优化，提升安全性
- 出价方式分类
- 新增暗黑主题；ui 排版优化
- 切换分页页码后列表自动滚动到顶部
- 支持不输入商品名称进行全商品浏览
- 点击商品搜索列表中的商品 id 可直接查询商品详情

### 0.2.15

- 修复 linux 应用图标不显示问题
- 添加 linux-arm64 release 包

### v0.2.14

- 初版
