<template>
  <el-descriptions title="商品信息" label-class-name="my-label" size="small" :column="2">
    <el-descriptions-item label="名称">{{
      info.auctionInfo && info.auctionInfo.productName
    }}</el-descriptions-item>
    <el-descriptions-item label="编号">{{
      info.auctionInfo && info.auctionInfo.id
    }}</el-descriptions-item>
    <el-descriptions-item label="开始时间">{{
      info.auctionInfo &&
      dayjs(info.auctionInfo.startTime).format("YYYY-MM-DD HH:mm:ss")
    }}</el-descriptions-item>
    <el-descriptions-item label="初始价格">{{
      info.auctionInfo && info.auctionInfo.startPrice
    }}</el-descriptions-item>
    <el-descriptions-item label="结束时间">{{
      info.auctionInfo &&
      dayjs(info.auctionInfo.endTime).format("YYYY-MM-DD HH:mm:ss")
    }}</el-descriptions-item>
    <el-descriptions-item label="封顶价">{{
      info.auctionInfo && info.auctionInfo.maxPrice
    }}</el-descriptions-item>
    <el-descriptions-item label="当前时间">{{
      info &&
      dayjs(info.currentTime ? parseInt(info.currentTime) : undefined).format(
        "YYYY-MM-DD HH:mm:ss"
      )
    }}</el-descriptions-item>
    <!-- <el-descriptions-item label="cbjPrice">{{ info.auctionInfo && info.auctionInfo.cbjPrice }}</el-descriptions-item> -->
    <el-descriptions-item label="历史最低价格">{{
      info && info.historyPriceMin
    }}</el-descriptions-item>
    <el-descriptions-item label="平均价格">{{ avgPrice }}</el-descriptions-item>
    <el-descriptions-item label="历史最高价格">{{
      info && info.historyPriceMax
    }}</el-descriptions-item>
  </el-descriptions>
</template>

<script>
const dayjs = require("dayjs");
import { defineComponent, reactive, computed, toRefs } from "vue";

export default defineComponent({
  name: "BidInfo",
  props: ["info", "historyData"],
  setup(props, context) {
    const dataMap = reactive({
      dayjs: dayjs,
      avgPrice: computed(() => {
        let avg;
        if (props.historyData && props.historyData.length > 0) {
          avg =
            props.historyData.reduce((acc, curr) => acc + curr.offerPrice, 0) /
            props.historyData.length;
          avg = Math.round(avg * 100) / 100;
        }
        return avg;
      }),
    });

    return {
      ...toRefs(dataMap),
    };
  },
});
</script>

<style>
.my-label {
  background: #e1f3d8;
}
</style>