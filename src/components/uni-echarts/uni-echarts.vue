<template>
  <view>1 </view>
</template>

<script>
export default {
  props: {
    canvasId: {
      type: String,
      default: 'ec-canvas',
    },
    ec: {
      type: Object,
      default: null,
    },
    forceUseOldCanvas: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<style></style>
