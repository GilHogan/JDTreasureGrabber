<template>
  <el-row justify="center">
    <el-form
      :inline="true"
      ref="formRef"
      :model="form"
      label-width="70px"
      :rules="rules"
    >
      <UseDark />
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
          input-style="width: 65px"
        ></el-input>
      </el-form-item>
      <el-form-item label="出价方式">
        <el-select
          size="small"
          v-model="form.biddingMethod"
          style="width: 100px"
        >
          <el-option
            v-for="item in biddingMethodOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          >
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item
        prop="minPrice"
        v-show="
          form.biddingMethod === Constants.BiddingMethod.WITHIN_PRICE_RANGE
        "
      >
        <el-input
          size="small"
          v-model.number="form.minPrice"
          placeholder="最低价格(元)"
          input-style="width: 75px"
        ></el-input>
      </el-form-item>
      <el-form-item
        prop="price"
        v-show="form.biddingMethod !== Constants.BiddingMethod.ON_OTHERS_BID"
      >
        <el-input
          size="small"
          v-model.number="form.price"
          placeholder="最高价格(元)"
          input-style="width: 75px"
        ></el-input>
      </el-form-item>
      <el-form-item
        prop="markup"
        label="加价幅度(元)"
        label-width="100px"
        v-show="form.biddingMethod !== Constants.BiddingMethod.ONE_TIME_BID"
      >
        <el-input-number
          size="small"
          v-model="form.markup"
          :min="1"
          label="加价幅度(元)"
        ></el-input-number>
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
    </el-form>
  </el-row>
  <el-row justify="center">
    <el-form :inline="true" label-width="70px">
      <el-form-item>
        <el-button type="primary" size="small" @click="searchItemInfo"
          >查询当前商品</el-button
        >
      </el-form-item>
      <el-form-item>
        <el-button type="primary" size="small" @click="goToDid"
          >开始抢购</el-button
        >
      </el-form-item>
      <el-form-item>
        <el-button type="primary" size="small" @click="updateBid"
          >更新抢购</el-button
        >
      </el-form-item>
    </el-form>
  </el-row>
</template>

<script>
import { defineComponent, reactive, toRefs } from "vue";
import UseDark from "./UseDark";
import Constants from "../../constant/constants";

export default defineComponent({
  name: "ItemInfo",
  components: {
    UseDark,
  },
  emits: ["fetchBidDetail", "go-to-bid", "update-bid"],
  setup(props, context) {
    const validatePrice = (rule, value, callback) => {
      if (
        dataMap.form.biddingMethod !== Constants.BiddingMethod.ON_OTHERS_BID
      ) {
        if (!value) {
          callback(new Error("请输入价格"));
          return;
        } else {
          if (!Number.isInteger(value)) {
            callback(new Error("请输入数字值"));
            return;
          }
          if (dataMap.form.minPrice && value <= dataMap.form.minPrice) {
            callback(new Error("价格区间有误"));
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

    const validateMinPrice = (rule, value, callback) => {
      if (
        dataMap.form.biddingMethod == Constants.BiddingMethod.WITHIN_PRICE_RANGE
      ) {
        if (value) {
          if (!Number.isInteger(value)) {
            callback(new Error("请输入数字值"));
            return;
          }
          if (dataMap.form.price && value >= dataMap.form.price) {
            callback(new Error("价格区间有误"));
            return;
          }
        }
      }
      callback();
    };

    const dataMap = reactive({
      formRef: null,
      form: {
        id: 380055941,
        price: undefined,
        bidder: "",
        markup: 2,
        lastBidCountdownTime: 300,
        biddingMethod: Constants.BiddingMethod.ON_OTHERS_BID,
        minPrice: undefined,
      },
      rules: {
        price: { validator: validatePrice, trigger: "blur" },
        minPrice: { validator: validateMinPrice, trigger: "blur" },
      },
      biddingMethodOptions: [
        {
          value: Constants.BiddingMethod.ON_OTHERS_BID,
          label: "自动加价",
        },
        {
          value: Constants.BiddingMethod.WITHIN_PRICE_RANGE,
          label: "价格区间内加价",
        },
        {
          value: Constants.BiddingMethod.ONE_TIME_BID,
          label: "一口价",
        },
      ],
      Constants,
      searchItemInfo() {
        context.emit("fetchBidDetail", dataMap.form.id);
      },
      goToDid() {
        dataMap.formRef.validate((valid) => {
          if (valid) {
            context.emit("go-to-bid", {
              id: dataMap.form.id,
              price: dataMap.form.price,
              bidder: dataMap.form.bidder,
              markup: dataMap.form.markup,
              lastBidCountdownTime: dataMap.form.lastBidCountdownTime,
              biddingMethod: dataMap.form.biddingMethod,
              minPrice: dataMap.form.minPrice,
            });
          } else {
            return false;
          }
        });
      },
      updateBid() {
        dataMap.formRef.validate((valid) => {
          if (valid) {
            context.emit("update-bid", {
              id: dataMap.form.id,
              price: dataMap.form.price,
              bidder: dataMap.form.bidder,
              markup: dataMap.form.markup,
              lastBidCountdownTime: dataMap.form.lastBidCountdownTime,
              biddingMethod: dataMap.form.biddingMethod,
              minPrice: dataMap.form.minPrice,
            });
          } else {
            return false;
          }
        });
      },
      setToCurrentBid(id) {
        if (id) {
          dataMap.form.id = id;
        }
      },
    });

    return {
      ...toRefs(dataMap),
    };
  },
});
</script>

<style scoped></style>
