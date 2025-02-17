<template>
  <el-row justify="center">
    <el-dialog v-model="optionVisible" title="选项" width="60%" :close-on-click-modal="false" align-center>
      <CustomOption @closeOption="closeOption" :optionVisible="optionVisible" />
    </el-dialog>

    <el-form :inline="true" :model="form" label-width="70px" :rules="rules" size="small">
      <!-- <el-form-item prop="id" label="商品ID" :rules="[
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
      </el-form-item> -->
      <el-form-item prop="lastBidCountdownTime" label="最后出价倒数时间(毫秒)" label-width="150px">
        <el-input-number size="small" v-model="form.lastBidCountdownTime" :min="1"
          label="最后出价倒数时间(毫秒)"></el-input-number>
      </el-form-item>
      <!-- <el-form-item prop="offerPriceBack" label="后台出价">
        <el-switch v-model="form.offerPriceBack"></el-switch>
      </el-form-item> -->
      <el-form-item label="抢到即停">
        <el-switch v-model="form.enableStopOnSuccess" inline-prompt active-text="启用" inactive-text="关闭"></el-switch>
      </el-form-item>

<!--      <el-form-item>-->
<!--        <el-button type="primary" size="small" @click="goToDid">开始抢购</el-button>-->
<!--      </el-form-item>-->
      <el-form-item>
        <el-button type="primary" size="small" @click="updateBid" :loading="isUpdating">开始/更新抢购</el-button>
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
  name: "ShoppingSetting",
  components: {
    CustomOption,
  },
  emits: ["go-to-bid", "update-bid"],
  setup(props, context) {
    onMounted(() => {
      if (window.ipc) {
        window.ipc.sendInvoke("toMain", { event: "getUserDataProperty", params: Constants.StoreKeys.OPTIONS_KEY })
          .then((data) => {
            if (data) {
              // 初始化表单中的用户配置数据
              dataMap.form.lastBidCountdownTime = data.defaultLastBidCountdownTime || 300;
              if (undefined === data.defaultEnableStopOnSuccess || null === data.defaultEnableStopOnSuccess) {
                dataMap.form.enableStopOnSuccess = true;
              } else {
                dataMap.form.enableStopOnSuccess = data.defaultEnableStopOnSuccess;
              }
            }
          })
          .catch((e) => console.log("getUserData error = ", e));
      }
    });

    const dataMap = reactive({
      form: {
        lastBidCountdownTime: 300,
        enableStopOnSuccess: true
      },
      optionVisible: false,
      isUpdating: false,
      Constants,
      goToDid() {
        context.emit("go-to-bid", dataMap.form);
      },
      updateBid() {
        dataMap.isUpdating = true;
        context.emit("update-bid", dataMap.form);
        setTimeout(() => {
          dataMap.isUpdating = false;
        }, 1100)
      },
      showOption() {
        dataMap.optionVisible = true;
      },
      closeOption() {
        dataMap.optionVisible = false;
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
