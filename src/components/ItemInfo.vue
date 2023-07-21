<template>
  <el-form
    :inline="true"
    ref="form"
    :model="form"
    label-width="70px"
    :rules="rules"
  >
    <el-form-item
      prop="id"
      label="商品ID"
      :rules="[
        { required: true, message: '请输入商品ID', trigger: 'blur' },
        {
          type: 'number',
          message: '商品ID必须为数字值',
          trigger: 'blur',
        },
      ]"
    >
      <el-input
        size="small"
        v-model.number="form.id"
        placeholder="商品ID"
      ></el-input>
    </el-form-item>
    <el-form-item prop="price" label="最高价格">
      <el-input
        size="small"
        v-model.number="form.price"
        placeholder="不填写则无视最高价"
      ></el-input>
    </el-form-item>
    <!-- <el-form-item prop="bidder" label="账户名">
      <el-input
        size="small"
        v-model.trim="form.bidder"
        placeholder="个人中心-账户设置-查看账户名"
      ></el-input>
    </el-form-item> -->
    <el-form-item prop="markup" label="加价幅度(元)" label-width="100px">
      <el-input-number
        size="small"
        v-model="form.markup"
        :min="1"
        label="加价幅度(元)"
      ></el-input-number>
    </el-form-item>
    <el-form-item label="一口价">
      <el-switch v-model="form.isFixedPrice"></el-switch>
    </el-form-item>
    <el-form-item
      prop="lastBidCountdownTime"
      label="最后出价倒数时间(毫秒)"
      label-width="180px"
    >
      <el-input-number
        size="small"
        v-model="form.lastBidCountdownTime"
        :min="1"
        label="最后出价倒数时间(毫秒)"
      ></el-input-number>
    </el-form-item>
    <el-form-item>
      <el-button type="primary" size="mini" @click="searchItemInfo"
        >查询当前商品</el-button
      >
    </el-form-item>
    <el-form-item>
      <el-button type="primary" size="mini" @click="goToDid"
        >开始抢购</el-button
      >
    </el-form-item>
    <el-form-item>
      <el-button type="primary" size="mini" @click="updateDid"
        >更新抢购</el-button
      >
    </el-form-item>
  </el-form>
</template>

<script>
export default {
  name: "ItemInfo",
  data() {
    const validatePrice = (rule, value, callback) => {
      if (this.form.isFixedPrice) {
        if (!value) {
          callback(new Error("请输入价格"));
          return;
        } else {
          if (!Number.isInteger(value)) {
            callback(new Error("请输入数字值"));
            return;
          }
        }
      } else {
        if (value && !Number.isInteger(value)) {
          callback(new Error("请输入数字值"));
          return;
        }
      }
      callback();
    };

    return {
      form: {
        id: 380055941,
        price: undefined,
        bidder: "",
        markup: 2,
        lastBidCountdownTime: 300,
        isFixedPrice: false,
      },
      rules: {
        price: { validator: validatePrice, trigger: "blur" },
      },
    };
  },
  methods: {
    searchItemInfo() {
      this.$emit("fetchBidDetail", this.form.id);
    },
    goToDid() {
      this.$refs["form"].validate((valid) => {
        if (valid) {
          this.$emit(
            "go-to-bid",
            this.form.id,
            this.form.price,
            this.form.bidder,
            this.form.markup,
            this.form.lastBidCountdownTime
          );
        } else {
          return false;
        }
      });
    },
    updateDid() {
      this.$refs["form"].validate((valid) => {
        if (valid) {
          this.$emit(
            "update-bid",
            this.form.id,
            this.form.price,
            this.form.bidder,
            this.form.markup,
            this.form.lastBidCountdownTime,
            this.form.isFixedPrice
          );
        } else {
          return false;
        }
      });
    },
  },
};
</script>

<style scoped></style>
