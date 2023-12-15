
<template>
  <el-form-item label="主题" label-width="40px">
    <el-switch
      v-model="isDark"
      inline-prompt
      @change="toggleDark"
      active-text="暗黑"
      inactive-text="明亮"
    ></el-switch>
  </el-form-item>
</template>

<script setup>
import { useDark, useToggle } from "@vueuse/core";

const isDark = useDark();
const toggleDark = useToggle(isDark);
</script>