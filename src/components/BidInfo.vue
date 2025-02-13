<template>
  <el-descriptions title="当前商品信息" label-class-name="my-label" size="small" :column="2">
    <el-descriptions-item label="名称">{{
      auctionDetail.auctionInfo && auctionDetail.auctionInfo.productName
    }}</el-descriptions-item>
    <el-descriptions-item label="编号">{{
      auctionDetail.auctionInfo && auctionDetail.auctionInfo.id
    }}</el-descriptions-item>
    <el-descriptions-item label="开始时间">{{
      auctionDetail.auctionInfo &&
      dayjs(auctionDetail.auctionInfo.startTime).format("YYYY-MM-DD HH:mm:ss")
    }}</el-descriptions-item>
    <el-descriptions-item label="初始价格">{{
      auctionDetail.auctionInfo && auctionDetail.auctionInfo.startPrice
    }}</el-descriptions-item>
    <el-descriptions-item label="结束时间">{{
      auctionDetail.auctionInfo &&
      dayjs(auctionDetail.auctionInfo.endTime).format("YYYY-MM-DD HH:mm:ss")
    }}</el-descriptions-item>
    <el-descriptions-item label="封顶价">{{
      auctionDetail.auctionInfo && auctionDetail.auctionInfo.maxPrice
    }}</el-descriptions-item>
    <el-descriptions-item label="更新时间">{{
      auctionDetail &&
      dayjs(auctionDetail.currentTime ? parseInt(auctionDetail.currentTime) : undefined).format(
        "YYYY-MM-DD HH:mm:ss"
      )
    }}</el-descriptions-item>
    <el-descriptions-item label="当前价">{{
        auctionDetail.auctionInfo && auctionDetail.auctionInfo.currentPrice
      }}</el-descriptions-item>
    <!-- <el-descriptions-item label="cbjPrice">{{ auctionDetail.auctionInfo && auctionDetail.auctionInfo.cbjPrice }}</el-descriptions-item> -->
    <el-descriptions-item label="历史最低价格">{{
      auctionDetail && auctionDetail.historyPriceMin
    }}</el-descriptions-item>
    <el-descriptions-item label="平均价格">{{ avgPrice }}</el-descriptions-item>
    <el-descriptions-item label="历史最高价格">{{
      auctionDetail && auctionDetail.historyPriceMax
    }}</el-descriptions-item>
    <el-descriptions-item label="当前出价人">{{
        auctionDetail.auctionInfo && auctionDetail.auctionInfo.bidder
      }}</el-descriptions-item>
    <el-descriptions-item label="当前出价人昵称">{{
        auctionDetail.auctionInfo && auctionDetail.auctionInfo.bidderNickName
      }}</el-descriptions-item>
  </el-descriptions>
</template>

<script>
const dayjs = require("dayjs");
import { defineComponent, reactive, computed, toRefs } from "vue";

export default defineComponent({
  name: "BidInfo",
  props: ["auctionDetail"],
  setup(props, context) {
    const dataMap = reactive({
      dayjs: dayjs,
      avgPrice: computed(() => {
        let avg;
        if (props.auctionDetail && props.auctionDetail.historyRecord && props.auctionDetail.historyRecord.length > 0) {
          avg = props.auctionDetail.historyRecord.reduce((acc, curr) => acc + curr.offerPrice, 0) /
              props.auctionDetail.historyRecord.length;
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