
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
            <el-input v-model="form.proxyUserName" placeholder="用户名" />
          </el-col>
          <el-col :span="11">
            <el-input v-model="form.proxyPassword" placeholder="密码" />
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
    <!-- <el-form-item label="邮箱通知">
      <el-col :span="3">
        <el-row justify="start">
          <el-switch
            v-model="form.enableEmail"
            inline-prompt
            active-text="启用"
            inactive-text="关闭"
          ></el-switch>
        </el-row>
      </el-col>
      <el-col :span="21">
        <el-input v-model="form.email" placeholder="邮箱号" />
      </el-col>
    </el-form-item> -->
  </el-form>
  <el-row justify="center">
    <el-col>
      <el-button type="primary" @click="handleSaveOptions">保存</el-button>
      <el-button @click="handleClose">关闭</el-button>
    </el-col>
  </el-row>
</template>

<script>
import { defineComponent, reactive, toRefs, onMounted } from "vue";
import { useDark, useToggle } from "@vueuse/core";

export default defineComponent({
  name: "CustomOption",
  props: [],
  emits: ["closeOption"],
  setup(props, context) {
    onMounted(() => {
      if (window.ipc) {
        window.ipc
          .sendInvoke("toMain", { event: "getUserData", params: {} })
          .then((data) => {
            console.log("getUserData data = ", data);
            if (data) {
              // 初始化表单中的用户配置数据
              dataMap.form.enableTel = data.enableTel;
              dataMap.form.telBotToken = data.telBotToken;
              dataMap.form.telChatId = data.telChatId;
              // dataMap.form.enableEmail = data.enableEmail;
              // dataMap.form.email = data.email;
              dataMap.form.enableHttpProxy = data.enableHttpProxy;
              dataMap.form.proxyHost = data.proxyHost;
              dataMap.form.proxyPort = data.proxyPort;
              dataMap.form.proxyUserName = data.proxyUserName;
              dataMap.form.proxyPassword = data.proxyPassword;

              // 获取所有用户配置
              dataMap.userOption = data;
            }
          })
          .catch((e) => console.log("getUserData error = ", e));
      }
    });

    const dataMap = reactive({
      formRef: null,
      userOption: {},
      isDark: useDark(),
      toggleDark() {
        useToggle(dataMap.isDark);
      },
      form: {
        enableTel: false,
        telBotToken: null,
        telChatId: null,
        // enableEmail: false,
        // email: null,
        enableHttpProxy: false,
        proxyHost: null,
        proxyPort: null,
        proxyUserName: null,
        proxyPassword: null,
      },
      handleSaveOptions() {
        if (window.ipc) {
          let params;
          if (
            dataMap.userOption &&
            Object.keys(dataMap.userOption).length !== 0
          ) {
            params = { ...dataMap.userOption, ...dataMap.form };
          } else {
            params = { ...dataMap.form };
          }
          window.ipc.send("toMain", { event: "setUserData", params: params });
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