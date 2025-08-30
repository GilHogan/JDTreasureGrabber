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
      <el-col :span="1">
        <el-button size="small" type="primary" @click="handleAddAllToShoppingList">添加该页所有商品到抢购列表</el-button>
      </el-col>
    </el-row>
    <el-table ref="tableRef" :data="productSearchResult.itemList || []" border max-height="500" size="small"
      v-loading="tableLoading">
      <el-table-column type="index" label="#" width="50"></el-table-column>
      <el-table-column prop="id" label="id" width="100">
        <template #default="scope">
          <el-tooltip content="添加到抢购商品列表" placement="top" :hide-after="0">
            <span class="product-link" @click="handleAddToShoppingList(scope.row)">{{
        scope.row.id
      }}</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column prop="productName" label="名称" width="350">
        <template #default="scope">
          <el-tooltip content="在浏览器中查看" placement="top" :hide-after="0">
            <span class="product-link" @click="handleOpenLink(scope.row.id)">{{ scope.row.productName }}</span>
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
    <!-- 没什么用了
    <el-pagination layout="prev, pager, next, jumper" :page-count="productSearchResult.pageCount" :page-size="20"
      :current-page="productSearchResult.pageNo" @current-change="fetchProduct" :total="productSearchResult.count"
      class="pagination-class" />
  -->
  </div>
</template>

<script>
import { defineComponent, reactive, computed, toRefs, onMounted } from "vue";
import { ElMessage } from 'element-plus';
const dayjs = require("dayjs");
const API = require("../../constant/constants").API;

export default defineComponent({
  name: "ProductList",
  props: [],
  emits: ["addToShoppingList", "openLink", "addAllToShoppingList"],
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
                dataMap.productSearchResult = data;
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
      handleOpenLink(productId) {
        context.emit("openLink", API.item_url + productId);
      },
      handleAddToShoppingList(productInfo) {
        context.emit("addToShoppingList", productInfo);
        ElMessage({ message: '已添加', type: 'success' });
      },
      handleAddAllToShoppingList() {
        if (dataMap.productSearchResult && dataMap.productSearchResult.itemList && dataMap.productSearchResult.itemList.length > 0) {
          context.emit("addAllToShoppingList", dataMap.productSearchResult.itemList);
          ElMessage({ message: '已添加', type: 'success' });
        }
      },
    });

    return {
      ...toRefs(dataMap),
    };
  },
});
</script>

<style scoped>
.pagination-class {
  float: right;
}
</style>
