<template>
  <view
    id="container"
    class="container"
    @touchstart="touchStart"
    @touchmove="touchMove"
    @touchend="touchEnd"
  >
    <canvas
      class="ec-canvas"
      :canvas-id="canvasId"
      :id="canvasId"
      :width="width"
      :height="height"
    />
  </view>
</template>

<script>
import WxCanvas from './wx-canvas';
import * as echarts from './echarts.min';

let ctx;
function wrapTouch(event) {
  for (let i = 0; i < event.touches.length; ++i) {
    const touch = event.touches[i];
    touch.offsetX = touch.x;
    touch.offsetY = touch.y;
  }
  return event;
}

export default {
  props: {
    canvasId: {
      type: String,
      default: () => {
        return 'ec-canvas';
      },
    },
    ec: {
      type: Object,
    },
    forceUseOldCanvas: {
      type: Boolean,
      value: false,
    },
    width: {
      type: Number,
      default: 750,
    },
    height: {
      type: Number,
      default: 750,
    },
  },
  data() {
    return {
      $curChart: {},
      toHandleList: [],
      isUseNewCanvas: true,
      w0: 0,
      h0: 0,
      size: {
        w: 0,
      },
    };
  },
  watch: {
    'ec.option': {
      deep: true,
      handler(val, oldVal) {
        this.setOption(val);
      },
    },
  },
  onReady: function() {
    if (!this.ec) {
      return;
    }
    if (!this.ec.lazyLoad) {
      this.init();
    }
  },
  beforeDestroy() {
    this.$curChart && this.$curChart.dispose();
  },
  computed: {
    ww() {
      return this.w0;
    },
    hh() {
      return this.$curChart ? this.$curChart.height : 0;
    },
  },
  methods: {
    toJson() {},
    compareVersion(v1, v2) {
      v1 = v1.split('.');
      v2 = v2.split('.');
      const len = Math.max(v1.length, v2.length);
      while (v1.length < len) {
        v1.push('0');
      }
      while (v2.length < len) {
        v2.push('0');
      }
      for (let i = 0; i < len; i++) {
        const num1 = parseInt(v1[i]);
        const num2 = parseInt(v2[i]);
        if (num1 > num2) {
          return 1;
        } else if (num1 < num2) {
          return -1;
        }
      }
      return 0;
    },
    init(callback) {
      this.initByOldWay(callback);
    },
    initByOldWay(callback) {
      // 1.9.91 <= version < 2.9.0：原来的方式初始化
      ctx = uni.createCanvasContext(this.canvasId, this);
      const canvas = new WxCanvas(ctx, this.canvasId, false);
      const that = this;
      echarts.setCanvasCreator(() => {
        return canvas;
      });
      //   const canvasDpr = uni.getSystemInfoSync().pixelRatio; // 微信旧的canvas不能传入dpr
      const canvasDpr = 2;
      //   console.log(canvasDpr);
      var query = uni.createSelectorQuery().in(this);
      query
        .select('.ec-canvas')
        .boundingClientRect((res) => {
          const canvasWidth = res.width;
          const canvasHeight = res.height;

          if (typeof callback === 'function') {
            this.w0 = canvasWidth * 2;
            this.h0 = canvasHeight * 2;

            that.$curChart = callback({
              echarts,
              canvas,
              canvasWidth,
              canvasHeight,
              canvasDpr,
            });
          } else if (that.ec) {
            // this.w0 = canvasWidth * canvasDpr;
            // this.h0 = canvasHeight * canvasDpr;

            // this.size.w = canvasWidth * canvasDpr;

            that.$curChart = that.initChart(
              canvas,
              res.width,
              res.height,
              canvasDpr
            );
          } else {
            that.triggerEvent('init', {
              canvas: canvas,
              width: res.width,
              height: res.height,
              devicePixelRatio: canvasDpr, // 增加了dpr，可方便外面echarts.init
            });
          }
        })
        .exec();
    },
    initByNewWay(callback) {
      const that = this;
      // version >= 2.9.0：使用新的方式初始化
      const query = uni.createSelectorQuery().in(this);
      query
        .select('.ec-canvas')
        .fields({
          node: true,
          size: true,
        })
        .exec((res) => {
          const canvasNode = res[0].node;
          const canvasDpr = uni.getSystemInfoSync().pixelRatio;
          const canvasWidth = res[0].width;
          const canvasHeight = res[0].height;
          const ctx = canvasNode.getContext('2d');
          const canvas = new WxCanvas(ctx, that.canvasId, true, canvasNode);
          echarts.setCanvasCreator(() => {
            return canvas;
          });
          if (typeof callback === 'function') {
            that.$curChart = callback({
              echarts,
              canvas,
              canvasWidth,
              canvasHeight,
              canvasDpr,
            });
          } else if (that.ec) {
            this.w0 = canvasWidth * 2;
            this.h0 = canvasHeight * 2;

            that.$curChart = that.initChart(
              canvas,
              canvasWidth,
              canvasHeight,
              canvasDpr
            );
          } else {
            that.triggerEvent('init', {
              canvas: canvas,
              width: canvasWidth,
              height: canvasHeight,
              devicePixelRatio: canvasDpr,
            });
          }
        });
    },
    setOption(val) {
      if (!this.$curChart || !this.$curChart.setOption) {
        this.toHandleList.push(val);
      } else {
        this.$curChart.setOption(val);
      }
    },
    canvasToTempFilePath(opt) {
      if (this.isUseNewCanvas) {
        // 新版
        const query = uni.createSelectorQuery().in(this);
        query
          .select('.ec-canvas')
          .fields({
            node: true,
            size: true,
          })
          .exec((res) => {
            const canvasNode = res[0].node;
            opt.canvas = canvasNode;
            uni.canvasToTempFilePath(opt);
          });
      } else {
        // 旧的
        if (!opt.canvasId) {
          opt.canvasId = this.canvasId;
        }
        ctx.draw(true, () => {
          uni.canvasToTempFilePath(opt, this);
        });
      }
    },
    touchStart(e) {
      if (this.ec.stopTouchEvent) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      this.$emit('touchstart', e);
      if (this.$curChart && e.touches.length > 0) {
        var touch = e.touches[0];

        const {
          target: { offsetLeft, offsetTop },
        } = e;
        touch.x = touch.pageX - offsetLeft;
        touch.y = touch.pageY - offsetTop;

        var handler = this.$curChart.getZr().handler;
        if (handler) {
          handler.dispatch('mousedown', {
            zrX: touch.x,
            zrY: touch.y,
          });
          handler.dispatch('mousemove', {
            zrX: touch.x,
            zrY: touch.y,
          });
          handler.processGesture(wrapTouch(e), 'start');
        }
      }
    },
    touchMove(e) {
      if (this.ec.stopTouchEvent) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      this.$emit('touchmove', e);
      if (this.$curChart && e.touches.length > 0) {
        var touch = e.touches[0];

        const {
          target: { offsetLeft, offsetTop },
        } = e;
        touch.x = touch.pageX - offsetLeft;
        touch.y = touch.pageY - offsetTop;

        var handler = this.$curChart.getZr().handler;
        if (handler) {
          handler.dispatch('mousemove', {
            zrX: touch.x,
            zrY: touch.y,
          });
          handler.processGesture(wrapTouch(e), 'change');
        }
      }
    },
    touchEnd(e) {
      if (this.ec.stopTouchEvent) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      this.$emit('touchend', e);
      if (this.$curChart) {
        const touch = e.changedTouches ? e.changedTouches[0] : {};

        const {
          target: { offsetLeft, offsetTop },
        } = e;
        touch.x = touch.pageX - offsetLeft;
        touch.y = touch.pageY - offsetTop;

        var handler = this.$curChart.getZr().handler;
        if (handler) {
          handler.dispatch('mouseup', {
            zrX: touch.x,
            zrY: touch.y,
          });
          handler.dispatch('click', {
            zrX: touch.x,
            zrY: touch.y,
          });
          handler.processGesture(wrapTouch(e), 'end');
        }
      }
    },
    longtap(e) {
      e.preventDefault();
      e.stopPropagation();
      return;
    },
    initChart(canvas, width, height, canvasDpr) {
      this.$curChart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: canvasDpr,
      });
      canvas.setChart(this.$curChart);
      this.$curChart.setOption(this.ec.option);
      this.$emit('inited', this.$curChart);

      //   this.$curChart.width = width * canvasDpr;
      //   this.$curChart.height = height * canvasDpr;

      return this.$curChart;
    },
  },
};
</script>

<style>
.container {
  width: 100%;
  height: 100%;
  display: block;
}

.ec-canvas {
  width: 750rpx;
  height: 750rpx;
  display: block;
}
</style>
