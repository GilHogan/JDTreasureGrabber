<template>
  <el-form label-width="60px" size="small" :inline="true">
    <el-form-item label="主题">
      <el-switch v-model="isDark" inline-prompt @change="toggleDark" active-text="暗黑" inactive-text="明亮"></el-switch>
    </el-form-item>
    <el-form-item label="自动更新">
      <el-switch v-model="form.enableAutoUpdate" inline-prompt active-text="启用" inactive-text="关闭"></el-switch>
    </el-form-item>
    <el-form-item label="自动登录">
      <el-switch v-model="form.enableAutoLogin" inline-prompt active-text="启用" inactive-text="关闭"></el-switch>
    </el-form-item>
    <el-form-item label="桌面通知">
      <el-switch v-model="form.enableDesktopNotification" inline-prompt active-text="启用" inactive-text="关闭"></el-switch>
    </el-form-item>
  </el-form>
  <el-form label-width="135px" size="small">
    <el-form-item label="默认抢购方式">
      <el-select v-model="form.defaultBiddingMethod">
        <el-option v-for="item in Constants.BiddingMethodOptions" :key="item.value" :label="item.label"
          :value="item.value">
        </el-option>
      </el-select>
    </el-form-item>
    <el-form-item label="默认加价幅度(元)">
      <el-input-number v-model="form.defaultMarkup" :min="1" label="加价幅度(元)"></el-input-number>
    </el-form-item>
    <el-form-item label="默认出价时间(毫秒)">
      <el-input-number v-model="form.defaultLastBidCountdownTime" :min="1" label="默认最后出价倒数时间(毫秒)"></el-input-number>
    </el-form-item>
    <el-form-item label="默认抢到即停">
      <el-switch v-model="form.defaultEnableStopOnSuccess" inline-prompt active-text="启用" inactive-text="关闭"></el-switch>
    </el-form-item>
    <!-- <el-form-item label="默认后台出价">
      <el-col :span="3">
        <el-row justify="start">
          <el-switch v-model="form.defaultOfferPriceBack" inline-prompt active-text="启用" inactive-text="关闭"></el-switch>
        </el-row>
      </el-col>
      <el-col :span="21">
        <el-row justify="start">
          <span>启用后台出价时，关闭浏览器抢购任务会继续执行</span>
        </el-row>
      </el-col>
    </el-form-item> -->
    <el-form-item label="Telegram通知">
      <el-col :span="3">
        <el-row justify="start">
          <el-switch v-model="form.enableTel" inline-prompt active-text="启用" inactive-text="关闭"></el-switch>
        </el-row>
      </el-col>
      <el-col :span="21">
        <el-row justify="space-between">
          <el-col :span="18">
            <el-input v-model="form.telBotToken" placeholder="bot token" />
          </el-col>
          <el-col :span="5">
            <el-input v-model="form.telChatId" placeholder="chat id" />
          </el-col>
        </el-row>
      </el-col>
    </el-form-item>
    <el-form-item label="Telegram Http代理">
      <el-col :span="3">
        <el-row justify="start">
          <el-switch v-model="form.enableHttpProxy" inline-prompt active-text="启用" inactive-text="关闭"></el-switch>
        </el-row>
      </el-col>
      <el-col :span="21">
        <el-row justify="space-between">
          <el-col :span="11">
            <el-input v-model="form.proxyHost" placeholder="代理Host" />
          </el-col>
          <el-col :span="11">
            <el-input v-model="form.proxyPort" placeholder="端口" />
          </el-col>
        </el-row>
      </el-col>
    </el-form-item>
    <el-form-item>
      <el-col :span="3"> </el-col>
      <el-col :span="21">
        <el-row justify="space-between">
          <el-col :span="11">
            <el-input v-model="form.proxyUserName" placeholder="用户名 没有则不填" />
          </el-col>
          <el-col :span="11">
            <el-input v-model="form.proxyPassword" placeholder="密码 没有则不填" />
          </el-col>
        </el-row>
      </el-col>
    </el-form-item>
    <el-form-item label="出价接口 Http代理">
      <el-col :span="3">
        <el-row justify="start">
          <el-switch v-model="form.enableApiHttpProxy" inline-prompt active-text="启用" inactive-text="关闭"></el-switch>
        </el-row>
      </el-col>
      <el-col :span="21">
        <el-row justify="space-between">
          <el-col :span="11">
            <el-input v-model="form.apiProxyHost" placeholder="代理Host" />
          </el-col>
          <el-col :span="11">
            <el-input v-model="form.apiProxyPort" placeholder="端口" />
          </el-col>
        </el-row>
      </el-col>
    </el-form-item>
    <el-form-item>
      <el-col :span="3"> </el-col>
      <el-col :span="21">
        <el-row justify="space-between">
          <el-col :span="11">
            <el-input v-model="form.apiProxyUserName" placeholder="用户名 没有则不填" />
          </el-col>
          <el-col :span="11">
            <el-input v-model="form.apiProxyPassword" placeholder="密码 没有则不填" />
          </el-col>
        </el-row>
      </el-col>
    </el-form-item>
    <!-- <el-form-item label="自定义出价接口eid">
      <el-col :span="3">
        <el-row justify="start">
          <el-switch v-model="form.enableCustomEid" inline-prompt active-text="启用" inactive-text="关闭"></el-switch>
        </el-row>
      </el-col>
      <el-col :span="21">
        <el-row justify="space-between">
          <el-col :span="11">
            <el-input v-model="form.customEidKey" placeholder="eidKey" />
          </el-col>
          <el-col :span="11">
            <el-input v-model="form.customEid" placeholder="eid（可选项；替换出价接口所传的eid参数）" />
          </el-col>
        </el-row>
      </el-col>
    </el-form-item> -->
  </el-form>

  <el-row justify="center">
    <el-col>
      <span style="padding: 8px 15px;">重置<el-switch v-model="resetData" inline-prompt active-text="是" inactive-text="否" @change="handleResetData"/></span>
      <el-button type="primary" @click="handleSaveOptions">保存</el-button>
      <el-button @click="handleClose">关闭</el-button>
    </el-col>
  </el-row>
</template>

<script>
import { defineComponent, reactive, toRefs, watch } from "vue";
import { useDark, useToggle } from "@vueuse/core";
import Constants from "../../constant/constants";

const defaultFormData = {
  enableTel: false,
  telBotToken: null,
  telChatId: null,
  enableHttpProxy: false,
  proxyHost: null,
  proxyPort: null,
  proxyUserName: null,
  proxyPassword: null,
  enableAutoUpdate: true,
  enableAutoLogin: false,
  defaultLastBidCountdownTime: 300,
  defaultMarkup: 2,
  defaultBiddingMethod: Constants.BiddingMethod.ONE_TIME_BID,
  enableApiHttpProxy: false,
  apiProxyHost: null,
  apiProxyPort: null,
  apiProxyUserName: null,
  apiProxyPassword: null,
  enableCustomEid: false,
  customEid: null,
  defaultOfferPriceBack: false,
  enableDesktopNotification: true,
  customEidKey: "3AB9D23F7A4B3C9B",
  defaultEnableStopOnSuccess: true
}

export default defineComponent({
  name: "CustomOption",
  props: ["optionVisible"],
  emits: ["closeOption"],
  setup(props, context) {
    watch(
      () => props.optionVisible,
      (newOptionVisible) => {
        if (newOptionVisible && window.ipc) {
          window.ipc
            .sendInvoke("toMain", {
              event: "getUserDataProperty",
              params: Constants.StoreKeys.OPTIONS_KEY,
            })
            .then((data) => {
              console.log("getUserData data = ", data);
              if (data) {
                // 初始化表单中的用户配置数据
                dataMap.form = data;
                if (!data.defaultLastBidCountdownTime) {
                  dataMap.form.defaultLastBidCountdownTime = 300;
                }
                if (!data.defaultMarkup) {
                  dataMap.form.defaultMarkup = 2;
                }
                if (!data.defaultBiddingMethod) {
                  dataMap.form.defaultBiddingMethod = Constants.BiddingMethod.ONE_TIME_BID;
                }
                if (undefined === data.enableDesktopNotification) {
                  dataMap.form.enableDesktopNotification = true;
                }
                if (!data.customEidKey) {
                  dataMap.form.customEidKey = "3AB9D23F7A4B3C9B";
                }
                if (undefined === data.enableAutoUpdate || null === data.enableAutoUpdate) {
                  dataMap.form.enableAutoUpdate = true;
                }
                if (undefined === data.defaultEnableStopOnSuccess || null === data.defaultEnableStopOnSuccess) {
                  dataMap.form.defaultEnableStopOnSuccess = true;
                }
              }
            })
            .catch((e) => console.log("getUserData error = ", e));
        }

        if (!newOptionVisible) {
          dataMap.resetData = false;
        }
      },
      { immediate: true }
    );

    const dataMap = reactive({
      Constants,
      isDark: useDark(),
      toggleDark() {
        useToggle(dataMap.isDark);
      },
      form: { ...defaultFormData },
      resetData: false,
      async handleSaveOptions() {
        if (window.ipc) {
          if (dataMap.resetData) {
            // 如果选择了清空数据，则先写入空数据覆盖原来的配置文件
            await window.ipc.sendInvoke("toMain", {
              event: "setUserData",
              params: {},
            });
          }
          window.ipc.send("toMain", {
            event: "setUserDataJsonProperty",
            params: {
              key: Constants.StoreKeys.OPTIONS_KEY,
              value: JSON.stringify(dataMap.form),
            },
          });
        }
        dataMap.handleClose();
      },
      handleClose() {
        context.emit("closeOption");
      },
      handleResetData(isOn) {
        if (isOn) {
          dataMap.form = { ...defaultFormData };
        }
      },
    });

    return {
      ...toRefs(dataMap),
    };
  },
});
</script>
