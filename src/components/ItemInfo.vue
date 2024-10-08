<template>
  <el-row justify="center">
    <el-dialog v-model="optionVisible" title="选项" width="60%" :close-on-click-modal="false" align-center>
      <CustomOption @closeOption="closeOption" :optionVisible="optionVisible" />
    </el-dialog>

    <el-form :inline="true" ref="formRef" :model="form" label-width="70px" :rules="rules" size="small">
      <el-form-item prop="id" label="商品ID" :rules="[
        { required: true, message: '请输入商品ID', trigger: 'blur' },
        {
          type: 'number',
          message: '商品ID必须为数字值',
          trigger: 'blur',
        },
      ]">
        <el-input size="small" v-model.number="form.id" placeholder="商品ID" input-style="width: 65px"></el-input>
      </el-form-item>
      <el-form-item label="抢购方式">
        <el-select size="small" v-model="form.biddingMethod" style="width: 100px">
          <el-option v-for="item in Constants.BiddingMethodOptions" :key="item.value" :label="item.label"
            :value="item.value">
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item prop="minPrice" v-show="form.biddingMethod === Constants.BiddingMethod.WITHIN_PRICE_RANGE
      ">
        <el-input size="small" v-model.number="form.minPrice" placeholder="最低价格(元)"
          input-style="width: 75px"></el-input>
      </el-form-item>
      <el-form-item prop="price" v-show="form.biddingMethod !== Constants.BiddingMethod.ON_OTHERS_BID">
        <el-input size="small" v-model.number="form.price" placeholder="最高价格(元)" input-style="width: 75px"></el-input>
      </el-form-item>
      <el-form-item prop="markup" label="加价幅度(元)" label-width="100px"
        v-show="form.biddingMethod !== Constants.BiddingMethod.ONE_TIME_BID">
        <el-input-number size="small" v-model="form.markup" :min="1" label="加价幅度(元)"></el-input-number>
      </el-form-item>
      <el-form-item prop="lastBidCountdownTime" label="最后出价倒数时间(毫秒)" label-width="150px">
        <el-input-number size="small" v-model="form.lastBidCountdownTime" :min="1"
          label="最后出价倒数时间(毫秒)"></el-input-number>
      </el-form-item>
      <!-- <el-form-item prop="offerPriceBack" label="后台出价">
        <el-switch v-model="form.offerPriceBack"></el-switch>
      </el-form-item> -->
    </el-form>
  </el-row>
  <el-row justify="center">
    <el-form :inline="true" label-width="70px">
      <!-- <el-form-item>
        <el-button type="primary" size="small" @click="searchItemInfo">查询当前商品</el-button>
      </el-form-item> -->
      <el-form-item>
        <el-button type="primary" size="small" @click="goToDid">开始抢购</el-button>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" size="small" @click="updateBid">更新抢购</el-button>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" size="small" @click="showOption">选项</el-button>
      </el-form-item>
    </el-form>
  </el-row>
</template>

<script>
import { defineComponent, reactive, toRefs, onMounted } from "vue";
import CustomOption from "./CustomOption";
import Constants from "../../constant/constants";

export default defineComponent({
  name: "ItemInfo",
  components: {
    CustomOption,
  },
  emits: ["fetchBidDetail", "go-to-bid", "update-bid", "setToCurrentBid"],
  setup(props, context) {
    onMounted(() => {
      if (window.ipc) {
        window.ipc.sendInvoke("toMain", { event: "getUserDataProperty", params: Constants.StoreKeys.OPTIONS_KEY })
          .then((data) => {
            if (data) {
              // 初始化表单中的用户配置数据
              dataMap.form.lastBidCountdownTime = data.defaultLastBidCountdownTime || 300;
              dataMap.form.markup = data.defaultMarkup || 2;
              dataMap.form.biddingMethod = data.defaultBiddingMethod || Constants.BiddingMethod.ONE_TIME_BID;
              // dataMap.form.offerPriceBack = data.defaultOfferPriceBack || false;
              dataMap.form.offerPriceBack = false;
            }
          })
          .catch((e) => console.log("getUserData error = ", e));
      }
    });

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
        id: null,
        price: undefined,
        bidder: "",
        markup: 2,
        lastBidCountdownTime: 300,
        biddingMethod: Constants.BiddingMethod.ONE_TIME_BID,
        minPrice: undefined,
        offerPriceBack: false,
        auctionDetailCurl: null
      },
      rules: {
        price: { validator: validatePrice, trigger: "blur" },
        minPrice: { validator: validateMinPrice, trigger: "blur" },
      },
      optionVisible: false,
      Constants,
      searchItemInfo() {
        dataMap.formRef.validateField("id", (valid) => {
          if (valid) {
            context.emit("fetchBidDetail", dataMap.form.id);
          } else {
            return false;
          }
        });
      },
      goToDid() {
        dataMap.formRef.validate((valid) => {
          if (valid) {
            context.emit("go-to-bid", dataMap.getFormParams());
          } else {
            return false;
          }
        });
      },
      updateBid() {
        dataMap.formRef.validate((valid) => {
          if (valid) {
            context.emit("update-bid", dataMap.getFormParams());
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
      showOption() {
        dataMap.optionVisible = true;
      },
      closeOption() {
        dataMap.optionVisible = false;
      },
      getFormParams() {
        let price = dataMap.form.price;
        let minPrice = dataMap.form.minPrice;
        if (
          dataMap.form.biddingMethod == Constants.BiddingMethod.ON_OTHERS_BID
        ) {
          price = null;
          minPrice = null;
        } else if (
          dataMap.form.biddingMethod == Constants.BiddingMethod.ONE_TIME_BID
        ) {
          minPrice = null;
        }
        return {
          ...dataMap.form,
          price,
          minPrice,
        };
      },
    });

    return {
      ...toRefs(dataMap),
    };
  },
});
</script>

<style scoped>
.el-form--inline .el-form-item {
  display: inline-flex;
  vertical-align: middle;
  margin-right: 12px;
}
</style>
