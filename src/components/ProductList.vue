<template>
  <div style="padding: 10px">
    <div class="app-title">商品搜索</div>
    <el-row style="margin: 5px 0">
      <el-col :span="4">
        <el-input size="small" placeholder="搜索你想要的商品" v-model="productName" @keyup.enter="search" />
      </el-col>
      <el-col :span="3" style="margin: 0 5px">
        <el-select size="small" v-model="status" placeholder="请选择商品状态">
          <el-option v-for="item in options" :key="item.value" :label="item.label" :value="item.value">
          </el-option>
        </el-select>
      </el-col>
      <el-col :span="1">
        <el-button size="small" type="primary" @click="search">搜索</el-button>
      </el-col>
    </el-row>
    <el-table ref="tableRef" :data="productSearchResult.itemList || []" border max-height="500" size="small"
      v-loading="tableLoading">
      <el-table-column type="index" label="#" width="50"></el-table-column>
      <el-table-column prop="id" label="id" width="100">
        <template #default="scope">
          <el-tooltip content="设为当前抢购商品，并查看详情" placement="top" :hide-after="0">
            <span class="product-link" @click="searchItemInfo(scope.row.id)">{{
              scope.row.id
            }}</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column prop="productName" label="名称" width="350">
        <template #default="scope">
          <el-tooltip content="在浏览器中查看" placement="top" :hide-after="0">
            <span class="product-link" @click="handleGoToProductPage(scope.row.id)">{{ scope.row.productName }}</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column label="时间" width="255">
        <template #default="scope">
          <span>{{
            `${dayjs(scope.row.startTime).format(
              "YYYY-MM-DD HH:mm:ss"
            )}~${dayjs(scope.row.endTime).format("YYYY-MM-DD HH:mm:ss")}`
          }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="70">
        <template #default="scope">
          <span>{{
            scope.row.status == 1
            ? "即将开始"
            : scope.row.status == 2
              ? "正在进行"
              : ""
          }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="quality" label="质量" width="70">
      </el-table-column>
      <el-table-column prop="primaryPic" label="封面" width="120">
        <template #default="scope">
          <el-tooltip content="点击预览" placement="top" :hide-after="0">
            <el-image style="width: 100px; height: 100px" :src="imageUrl(scope.row.primaryPic, 'n4')"
              :preview-src-list="[imageUrl(scope.row.primaryPic, 'n0')]" :z-index="999" :preview-teleported="true"
              :lazy="true">
            </el-image>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column prop="startPrice" label="起步价"> </el-table-column>
      <el-table-column prop="cappedPrice" label="封顶价"> </el-table-column>
      <el-table-column prop="currentPrice" label="当前价"></el-table-column>
      <!-- <el-table-column prop="spectatorCount" label="围观数"> </el-table-column> -->
    </el-table>
    <el-pagination layout="prev, pager, next, jumper" :page-count="productSearchResult.pageCount" :page-size="20"
      :current-page="productSearchResult.pageNo" @current-change="fetchProduct" :total="productSearchResult.count"
      class="pagination-class" />
  </div>
</template>

<script>
import { defineComponent, reactive, computed, toRefs, onMounted } from "vue";
const dayjs = require("dayjs");
const API = require("../../constant/constants").API;

export default defineComponent({
  name: "ProductList",
  props: ["setToCurrentBidAndFetchDetail"],
  emits: [],
  setup(props, context) {
    onMounted(() => {
      dataMap.fetchProduct();
    });

    const dataMap = reactive({
      tableRef: null,
      tableLoading: false,
      dayjs: dayjs,
      productName: "",
      status: 2,
      options: [
        {
          value: "",
          label: "全部",
        },
        {
          value: 1,
          label: "即将开始",
        },
        {
          value: 2,
          label: "正在进行",
        },
      ],
      imageUrl: computed(
        () => (primaryPic, size) => API.image_url + size + "/" + (primaryPic.startsWith("jfs") ? primaryPic : "jfs/" + primaryPic)
      ),
      productSearchResult: {
        pageCount: 0,
      },
      handleGoToProductPage(productId) {
        window.ipc &&
          window.ipc.send("toMain", {
            event: "handleGoToProductPage",
            params: productId,
          });
      },
      search() {
        dataMap.fetchProduct();
      },
      fetchProduct(pageNo = 1) {
        if (window.ipc) {
          dataMap.tableLoading = true;
          const searchName = dataMap.productName;
          window.ipc
            .sendInvoke("toMain", {
              event: "fetchProduct",
              params: {
                name: searchName,
                pageNo: pageNo,
                status: dataMap.status,
              },
            })
            .then((data) => {
              if (data) {
                // 有无商品调用接口不同，返回数据格式也不同
                if (searchName) {
                  if (data.itemList && data.itemList.length > 0) {
                    // 根据开始时间重新排序
                    data.itemList.sort((a, b) => {
                      return a.startTime - b.startTime;
                    });
                  }
                  dataMap.productSearchResult = data;
                } else {
                  dataMap.productSearchResult = {
                    pageCount: Math.ceil(data.totalNumber / 20),
                    count: data.totalNumber,
                    pageNo: pageNo,
                    itemList: data.auctionInfos,
                  };
                }
              } else {
                dataMap.productSearchResult = { pageCount: 0 };
              }
              // 查询后滚动条滚动到列表顶部
              dataMap.tableRef.scrollTo({ top: 0 });
            })
            .catch((e) => console.log("fetchProduct error = ", e))
            .finally(() => {
              dataMap.tableLoading = false;
            });
        }
      },
      searchItemInfo(productId) {
        context.emit("setToCurrentBidAndFetchDetail", productId);
      },
    });

    return {
      ...toRefs(dataMap),
    };
  },
});
</script>

<style scoped>
.product-link {
  cursor: pointer;
  color: #2f81f7;
}

.pagination-class {
  float: right;
}
</style>
