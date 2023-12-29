
<template>
  <el-form label-width="100px">
    <el-form-item label="主题">
      <el-switch
        v-model="isDark"
        inline-prompt
        @change="toggleDark"
        active-text="暗黑"
        inactive-text="明亮"
      ></el-switch>
    </el-form-item>
    <el-form-item label="Http代理">
      <el-col :span="3">
        <el-row justify="start">
          <el-switch
            v-model="form.enableHttpProxy"
            inline-prompt
            active-text="启用"
            inactive-text="关闭"
          ></el-switch>
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
            <el-input
              v-model="form.proxyUserName"
              placeholder="用户名 没有则不填"
            />
          </el-col>
          <el-col :span="11">
            <el-input
              v-model="form.proxyPassword"
              placeholder="密码 没有则不填"
            />
          </el-col>
        </el-row>
      </el-col>
    </el-form-item>
    <el-form-item label="Telegram通知">
      <el-col :span="3">
        <el-row justify="start">
          <el-switch
            v-model="form.enableTel"
            inline-prompt
            active-text="启用"
            inactive-text="关闭"
          ></el-switch>
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
    <el-form-item label="自动登录">
      <el-col :span="3">
        <el-row justify="start">
          <el-switch
            v-model="form.enableAutoLogin"
            inline-prompt
            active-text="启用"
            inactive-text="关闭"
          ></el-switch>
        </el-row>
      </el-col>
    </el-form-item>
  </el-form>
  <el-row justify="center">
    <el-col>
      <el-button type="primary" @click="handleSaveOptions">保存</el-button>
      <el-button @click="handleClose">关闭</el-button>
    </el-col>
  </el-row>
</template>

<script>
import { defineComponent, reactive, toRefs, watch } from "vue";
import { useDark, useToggle } from "@vueuse/core";
const OPTIONS_KEY = "options";

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
              params: OPTIONS_KEY,
            })
            .then((data) => {
              console.log("getUserData data = ", data);
              if (data) {
                // 初始化表单中的用户配置数据
                dataMap.form = data;
              }
            })
            .catch((e) => console.log("getUserData error = ", e));
        }
      },
      { immediate: true }
    );

    const dataMap = reactive({
      formRef: null,
      isDark: useDark(),
      toggleDark() {
        useToggle(dataMap.isDark);
      },
      form: {
        enableTel: false,
        telBotToken: null,
        telChatId: null,
        enableHttpProxy: false,
        proxyHost: null,
        proxyPort: null,
        proxyUserName: null,
        proxyPassword: null,
        enableAutoLogin: false,
      },
      handleSaveOptions() {
        if (window.ipc) {
          window.ipc.send("toMain", {
            event: "setUserDataJsonProperty",
            params: { key: OPTIONS_KEY, value: JSON.stringify(dataMap.form) },
          });
        }
        dataMap.handleClose();
      },
      handleClose() {
        context.emit("closeOption");
      },
    });

    return {
      ...toRefs(dataMap),
    };
  },
});
</script>