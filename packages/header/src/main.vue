<template>
  <header class="el-header" :style="{ height }">
    <slot></slot>
  </header>
</template>
<script>
// 与footer相同
export default {
  name: 'ElHeader',

  componentName: 'ElHeader',

  props: {
    height: {
      type: String,
      default: '60px'
    }
  }
};
</script>
