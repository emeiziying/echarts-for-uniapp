<template>
  <view
    class="container"
    @touchstart="touchStart"
    @touchmove="touchMove"
    @touchend="touchEnd"
  >
    <canvas
      type="2d"
      v-if="isUseNewCanvas"
      class="ec-canvas"
      :id="canvasId"
      :canvas-id="canvasId"
    />
    <canvas
      v-else
      class="ec-canvas"
      :id="canvasId"
      :canvas-id="canvasId"
      :width="canvasWidth"
      :height="canvasHeight"
    />
  </view>
</template>

<script>
import EcCanvas from './ec-canvas';
import * as echarts from './echarts.min';

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
    height: {
      type: Number,
      default: 0,
    },
  },
  data() {
    return {
      toHandleList: [],
      isUseNewCanvas: true,
      canvasWidth: 0,
      canvasHeight: 0,
      canvasDpr: 1,
    };
  },
  watch: {
    'ec.option': {
      deep: true,
      handler(val, oldVal) {
        this.setOption(val);
      },
    },
    height(v) {
      this.canvasHeight = v * this.canvasDpr;
    },
  },
  onReady: function() {
    if (!this.ec) {
      console.warn(
        '组件需绑定 ec 变量，例：<ec-canvas id="mychart-dom-bar" ' +
          'canvas-id="mychart-bar" ec="{{ ec }}"></ec-canvas>'
      );
      return;
    }
    if (!this.ec.lazyLoad) {
      this.init();
    }
  },
  beforeDestroy() {
    this.chart && this.chart.dispose();
  },
  methods: {
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
      // #ifdef MP-DINGTALK
      this.isUseNewCanvas = false;
      this.initByOldWay(callback);
      return;
      // #endif

      // #ifdef MP-ALIPAY
      const version = my.SDKVersion;
      const baseVersion = '2.7.0';
      const lowestVersion = '1.0.0';
      // #endif

      // #ifdef MP-WEIXIN
      const version = uni.getSystemInfoSync().SDKVersion;
      const baseVersion = '2.9.0';
      const lowestVersion = '1.9.91';
      // #endif

      let canUseNewCanvas = this.compareVersion(version, baseVersion) >= 0;
      if (this.forceUseOldCanvas) {
        if (canUseNewCanvas) console.warn('开发者强制使用旧canvas,建议关闭');
        canUseNewCanvas = false;
      }
      this.isUseNewCanvas = canUseNewCanvas && !this.forceUseOldCanvas;
      if (this.isUseNewCanvas) {
        console.log(
          `基础库版本大于${baseVersion}，开始使用<canvas type="2d"/>`
        );
        // 2.9.0 可以使用 <canvas type="2d"></canvas>
        this.initByNewWay(callback);
      } else {
        const isValid = this.compareVersion(version, lowestVersion) >= 0;
        if (!isValid) {
          console.error(
            `基础库版本过低，需大于等于 ${lowestVersion}。` +
              '参见：https://github.com/ecomfe/echarts-for-weixin' +
              '#%E5%BE%AE%E4%BF%A1%E7%89%88%E6%9C%AC%E8%A6%81%E6%B1%82'
          );
          return;
        } else {
          console.warn(
            `建议将基础库调整大于等于${baseVersion}版本。升级后绘图将有更好性能`
          );
          this.initByOldWay(callback);
        }
      }
    },
    initByOldWay(callback) {
      // 1.9.91 <= version < 2.9.0：原来的方式初始化
      this.ctx = uni.createCanvasContext(this.canvasId, this);
      const canvas = new EcCanvas(this.ctx, this.canvasId, false);

      // #ifdef MP-WEIXIN
      const canvasDpr = 1;
      // #endif

      // #ifdef MP-ALIPAY
      const canvasDpr = uni.getSystemInfoSync().pixelRatio || 2;
      // #endif

      echarts.setCanvasCreator(() => {
        return canvas;
      });

      var query = uni.createSelectorQuery().in(this);
      query
        .select('.ec-canvas')
        .boundingClientRect((res) => {
          const canvasWidth = res.width;
          const canvasHeight = res.height;

          this.canvasDpr = canvasDpr;
          this.canvasWidth = Math.floor(canvasWidth * canvasDpr);
          this.canvasHeight = Math.floor(canvasHeight * canvasDpr);

          if (typeof callback === 'function') {
            this.chart = callback({
              echarts,
              canvas,
              canvasWidth,
              canvasHeight,
              canvasDpr,
            });
          } else if (this.ec) {
            this.chart = this.initChart(
              canvas,
              canvasWidth,
              canvasHeight,
              canvasDpr
            );
          } else {
            this.triggerEvent('init', {
              canvas: canvas,
              width: canvasWidth,
              height: canvasHeight,
              devicePixelRatio: canvasDpr, // 增加了dpr，可方便外面echarts.init
            });
          }
        })
        .exec();
    },
    initByNewWay(callback) {
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
          const canvas = new EcCanvas(ctx, this.canvasId, true, canvasNode);
          echarts.setCanvasCreator(() => {
            return canvas;
          });
          if (typeof callback === 'function') {
            this.chart = callback({
              echarts,
              canvas,
              canvasWidth,
              canvasHeight,
              canvasDpr,
            });
          } else if (this.ec) {
            this.chart = this.initChart(
              canvas,
              canvasWidth,
              canvasHeight,
              canvasDpr
            );
          } else {
            this.triggerEvent('init', {
              canvas: canvas,
              width: canvasWidth,
              height: canvasHeight,
              devicePixelRatio: canvasDpr,
            });
          }
        });
    },
    setOption(val) {
      if (!this.chart || !this.chart.setOption) {
        this.toHandleList.push(val);
      } else {
        this.chart.setOption(val);
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
        this.ctx.draw(true, () => {
          uni.canvasToTempFilePath(opt, this);
        });
      }
    },
    wrapTouch(event) {
      for (let i = 0; i < event.touches.length; ++i) {
        const touch = event.touches[i];

        touch.offsetX = touch.x;
        touch.offsetY = touch.y;
      }
      return event;
    },
    touchStart(e) {
      if (this.ec.stopTouchEvent) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      this.$emit('touchstart', e);
      if (this.chart && e.touches.length > 0) {
        var touch = e.touches[0];

        const {
          target: { offsetLeft, offsetTop },
        } = e;
        touch.x = touch.pageX - offsetLeft;
        touch.y = touch.pageY - offsetTop;

        var handler = this.chart.getZr().handler;

        if (handler) {
          handler.dispatch('mousedown', {
            zrX: touch.x,
            zrY: touch.y,
          });
          handler.dispatch('mousemove', {
            zrX: touch.x,
            zrY: touch.y,
          });
          handler.processGesture(this.wrapTouch(e), 'start');
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
      if (this.chart && e.touches.length > 0) {
        var touch = e.touches[0];

        const {
          target: { offsetLeft, offsetTop },
        } = e;
        touch.x = touch.pageX - offsetLeft;
        touch.y = touch.pageY - offsetTop;

        var handler = this.chart.getZr().handler;
        if (handler) {
          handler.dispatch('mousemove', {
            zrX: touch.x,
            zrY: touch.y,
          });
          handler.processGesture(this.wrapTouch(e), 'change');
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
      if (this.chart) {
        const touch = e.changedTouches ? e.changedTouches[0] : {};

        const {
          target: { offsetLeft, offsetTop },
        } = e;
        touch.x = touch.pageX - offsetLeft;
        touch.y = touch.pageY - offsetTop;

        var handler = this.chart.getZr().handler;
        if (handler) {
          handler.dispatch('mouseup', {
            zrX: touch.x,
            zrY: touch.y,
          });
          handler.dispatch('click', {
            zrX: touch.x,
            zrY: touch.y,
          });
          handler.processGesture(this.wrapTouch(e), 'end');
        }
      }
    },
    initChart(canvas, width, height, canvasDpr) {
      this.chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: canvasDpr,
      });
      canvas.setChart(this.chart);
      this.chart.setOption(this.ec.option);
      this.$emit('inited', this.chart);

      return this.chart;
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
  width: 100%;
  height: 100%;
  display: block;
}
</style>
