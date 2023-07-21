<template>
  <div style="padding: 10px">
    <div class="app-title">商品搜索</div>
    <el-row style="margin: 5px 0">
      <el-col :span="4">
        <el-input
          size="small"
          placeholder="输入商品名称进行搜索"
          v-model="productName"
          @keyup.enter.native="search"
        />
      </el-col>
      <el-col :span="3" style="margin: 0 5px">
        <el-select size="small" v-model="status" placeholder="请选择商品状态">
          <el-option
            v-for="item in options"
            :key="item.value"
            :label="item.label"
            v-model="item.value"
          >
          </el-option>
        </el-select>
      </el-col>
      <el-col :span="1">
        <el-button size="small" type="primary" @click="search">搜索</el-button>
      </el-col>
    </el-row>
    <el-table
      :data="productSearchResult.itemList || []"
      border
      max-height="500"
      size="mini"
    >
      <el-table-column type="index" label="#" width="50"></el-table-column>
      <el-table-column prop="id" label="id" width="100"></el-table-column>
      <el-table-column prop="productName" label="名称" width="350">
        <template slot-scope="scope">
          <span
            class="product-link"
            @click="handleGoToProductPage(scope.row.id)"
            >{{ scope.row.productName }}</span
          >
        </template>
      </el-table-column>
      <el-table-column label="时间" width="255">
        <template slot-scope="scope">
          <span>{{
            `${dayjs(scope.row.startTime).format(
              "YYYY-MM-DD HH:mm:ss"
            )}~${dayjs(scope.row.endTime).format("YYYY-MM-DD HH:mm:ss")}`
          }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="70">
        <template slot-scope="scope">
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
      <el-table-column prop="primaryPic" label="封面">
        <template slot-scope="scope">
          <el-image
            style="width: 100px; height: 100px"
            :src="imageUrl(scope.row.primaryPic)"
            :preview-src-list="[previewUrl(scope.row.primaryPic)]"
          >
          </el-image>
        </template>
      </el-table-column>
      <el-table-column prop="minPrice" label="起步价"> </el-table-column>
      <el-table-column prop="cappedPrice" label="封顶价"> </el-table-column>
      <el-table-column prop="currentPrice" label="当前价"></el-table-column>
      <el-table-column prop="spectatorCount" label="围观数"> </el-table-column>
      <!-- <el-table-column label="实际结束时间" width="135">
        <template slot-scope="scope">
          <span>{{
            scope.row.actualEndTime &&
            dayjs(scope.row.actualEndTime).format("YYYY-MM-DD HH:mm:ss")
          }}</span>
        </template>
      </el-table-column> -->
    </el-table>
    <el-pagination
      layout="prev, pager, next"
      :page-count="productSearchResult.pageCount"
      :page-size="20"
      :current-page="productSearchResult.pageNo"
      @current-change="pageChange"
      :total="productSearchResult.count"
    />
  </div>
</template>

<script>
const dayjs = require("dayjs");
const API = require("../../server/api");

export default {
  name: "ProductList",
  props: ["productSearchResult"],
  data() {
    return {
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
    };
  },
  computed: {
    imageUrl() {
      return function (primaryPic) {
        return API.image_url + "n1/s250x250_jfs" + primaryPic;
      };
    },
    previewUrl() {
      return function (primaryPic) {
        return API.image_url + "n1/s800x800_jfs" + primaryPic;
      };
    },
  },
  methods: {
    search() {
      this.$emit("fetchProduct", {
        name: this.productName,
        pageNo: 1,
        status: this.status,
      });
    },
    pageChange(pageNo) {
      this.$emit("fetchProduct", {
        name: this.productName,
        pageNo: pageNo,
        status: this.status,
      });
    },
    handleGoToProductPage(productId) {
      this.$emit("goToProductPage", productId);
    },
  },
};
</script>

<style scoped>
.product-link {
  cursor: pointer;
  color: #2f81f7;
}
</style>
