<template>
  <div id="app">
    <el-row class="app-above">
      <el-col :span="24" class="app-above__col">
        <ShoppingSetting @go-to-bid="goToBid" @update-bid="updateBid" />
        <el-row>
          <el-col :span="24">
            <ShoppingList @openLink="openLink" ref="shoppingListRef" />
          </el-col>
        </el-row>
      </el-col>
    </el-row>
    <el-row class="app-under">
      <el-col :span="24">
        <ProductList @addToShoppingList="addToShoppingList" @openLink="openLink" />
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { defineComponent, reactive, onMounted, toRefs } from "vue";
import ShoppingSetting from "./components/ShoppingSetting";
import ProductList from "./components/ProductList";
import { useDark } from "@vueuse/core";
import ShoppingList from "./components/ShoppingList";

// 设置初始化主题模式
useDark();

export default defineComponent({
  name: "App",
  components: {
    ShoppingSetting,
    ProductList,
    ShoppingList,
  },
  setup() {
    onMounted(() => {
      if (window.ipc) {
        window.ipc.receive("fromMain", (data) => {
          if (data && data.event ) {
            if (data.event === "console") {
              // 打印主进程日志
              console.log(data.data);
            } else if (data.event === "update.shopping.item") {
              // 更新商品信息
              if (data.data) {
                dataMap.shoppingListRef.updateShoppingItem(data.data);
              }
            } else if (data.event === "update.process.status") {
              // 更新执行状态
              dataMap.shoppingListRef.updateProcessStatus(data.data);
            }
          }
        });
      }
    });

    const dataMap = reactive({
      shoppingListRef: null,
      async goToBid(params) {
        // 先校验列表数据
        const valid = await dataMap.shoppingListRef.validateForm();
        if (valid) {
          const shoppingList = dataMap.shoppingListRef.getShoppingListBeforeBid(params.lastBidCountdownTime);
          const paramsStr = JSON.stringify({ shoppingList, enableStopOnSuccess: params.enableStopOnSuccess });
          window.ipc && window.ipc.send("toMain", {
            event: "startProcessShoppingList",
            params: paramsStr
          });
        }
      },
      async updateBid(params) {
        const valid = await dataMap.shoppingListRef.validateForm();
        if (valid) {
          const shoppingList = dataMap.shoppingListRef.getShoppingListBeforeBid(params.lastBidCountdownTime);
          const paramsStr = JSON.stringify({ shoppingList, enableStopOnSuccess: params.enableStopOnSuccess });
          window.ipc && window.ipc.send("toMain", {
            event: "updateProcessShoppingList",
            params: paramsStr
          });
        }
      },
      addToShoppingList(productInfo) {
        if (productInfo) {
          dataMap.shoppingListRef.addItem(productInfo);
        }
      },
      openLink(params) {
        window.ipc && window.ipc.send("toMain", { event: "openLink", params, });
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
  font-size: 16px;
  font-weight: 700;
}

.item-title {
  text-align: left;
  font-size: 14px;
  font-weight: 700;
}

.product-link {
  cursor: pointer;
  color: #2f81f7;
}

</style>
