<template>
  <div id="app">
    <el-row class="app-above">
      <el-col :span="24" class="app-above__col">
        <item-info
          @go-to-bid="goToBid"
          @fetchBidDetail="fetchBidDetail"
          @update-bid="updateBid"
          ref="itemInfoRef"
        >
        </item-info>
        <el-row>
          <el-col :span="12">
            <history-price :history-data="historyData"> </history-price>
          </el-col>
          <el-col :span="11" style="margin-left: 20px">
            <bid-info :info="info" :historyData="historyData"></bid-info>
          </el-col>
        </el-row>
      </el-col>
    </el-row>
    <el-row class="app-under">
      <el-col :span="24">
        <ProductList
          @setToCurrentBidAndFetchDetail="setToCurrentBidAndFetchDetail"
        />
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { defineComponent, reactive, onMounted, toRefs } from "vue";
import ItemInfo from "./components/ItemInfo";
import HistoryPrice from "./components/HistoryPrice";
import BidInfo from "./components/BidInfo";
import ProductList from "./components/ProductList";
import { useDark } from "@vueuse/core";

// 设置初始化主题模式
useDark();

export default defineComponent({
  name: "App",
  components: {
    BidInfo,
    HistoryPrice,
    ItemInfo,
    ProductList,
  },
  setup() {
    onMounted(() => {
      if (window.ipc) {
        window.ipc.receive("fromMain", (data) => {
          if (data && data.event && data.event == "console") {
            // 打印主进程日志
            console.log(data.data);
          }
        });
      }
    });

    const dataMap = reactive({
      historyData: [],
      info: [],
      itemInfoRef: null,
      goToBid(params) {
        window.ipc &&
          window.ipc.send("toMain", {
            event: "startBid",
            params,
          });
      },
      fetchBidDetail(id) {
        window.ipc &&
          window.ipc
            .sendInvoke("toMain", { event: "fetchBidDetail", params: id })
            .then((data) => {
              if (data) {
                dataMap.historyData = data.historyRecord || [];
                dataMap.info = data;
              } else {
                dataMap.historyData = [];
                dataMap.info = [];
              }
            })
            .catch((e) => console.log("App fetchBidDetail error = ", e));
      },
      updateBid(params) {
        window.ipc &&
          window.ipc.send("toMain", {
            event: "startUpdateBid",
            params,
          });
      },
      setToCurrentBidAndFetchDetail(id) {
        if (id) {
          dataMap.itemInfoRef.setToCurrentBid(id);
          dataMap.fetchBidDetail(id);
        }
      },
    });

    return {
      ...toRefs(dataMap),
    };
  },
});
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: var(--ep-text-color-primary);
  margin-top: 20px;
}

.app-above {
  border: 2px black solid;
}

.app-above__col {
  padding: 10px 10px;
}

.app-under {
  border: 2px black solid;
  margin-top: 15px;
}

.app-title {
  text-align: left;
  font-size: 16;
  font-weight: 700;
}
</style>
