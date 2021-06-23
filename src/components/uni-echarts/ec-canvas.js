export default class EcCanvas {
  constructor(ctx, canvasId, isNew, canvasNode) {
    this.ctx = ctx;
    this.canvasId = canvasId;
    this.chart = null;
    this.isNew = isNew;
    if (isNew) {
      this.canvasNode = canvasNode;
    } else {
      this._initStyle(ctx);
    }

    // this._initCanvas(zrender, ctx);

    this._initEvent();
  }

  getContext(contextType) {
    if (contextType === '2d') {
      return this.ctx;
    }
  }

  // canvasToTempFilePath(opt) {
  //   if (!opt.canvasId) {
  //     opt.canvasId = this.canvasId;
  //   }
  //   return wx.canvasToTempFilePath(opt, this);
  // }

  setChart(chart) {
    this.chart = chart;
  }

  attachEvent() {
    // noop
  }

  detachEvent() {
    // noop
  }

  _initCanvas(zrender, ctx) {
    zrender.util.getContext = function() {
      return ctx;
    };

    zrender.util.$override('measureText', function(text, font) {
      ctx.font = font || '12px sans-serif';
      // return ctx.measureText(text);
      return;
    });
  }

  _initStyle(ctx) {
    var styles = [
      'fillStyle',
      'strokeStyle',
      'globalAlpha',
      'textAlign',
      'textBaseAlign',
      'shadow',
      'lineWidth',
      'lineCap',
      'lineJoin',
      'lineDash',
      'miterLimit',
      'fontSize',
    ];
    styles.forEach((style) => {
      Object.defineProperty(ctx, style, {
        set: (value) => {
          if (
            (style !== 'fillStyle' && style !== 'strokeStyle') ||
            (value !== 'none' && value !== null)
          ) {
            ctx['set' + style.charAt(0).toUpperCase() + style.slice(1)](value);
          }
        },
      });
    });

    ctx.createRadialGradient = (...p) => {
      return ctx.createCircularGradient(...p);
    };

    // 钉钉钉钉小程序框架不支持 measureText 方法，用此方法 mock
    if (!ctx.measureText) {
      function strLen(str) {
        let len = 0;
        for (let i = 0; i < str.length; i++) {
          if (str.charCodeAt(i) > 0 && str.charCodeAt(i) < 128) {
            len++;
          } else {
            len += 2;
          }
        }
        return len;
      }

      ctx.measureText = (text) => {
        let fontSize = 12;
        const font = ctx.__font;

        if (font) {
          fontSize = parseInt(font.split(' ')[2], 10);
        }

        fontSize /= 2;
        return {
          width: strLen(text) * fontSize,
        };
      };
    }
  }

  _initEvent() {
    this.event = {};
    const eventNames = [
      {
        eName: 'touchStart',
        ecName: 'mousedown',
      },
      {
        eName: 'touchMove',
        ecName: 'mousemove',
      },
      {
        eName: 'touchEnd',
        ecName: 'mouseup',
      },
      {
        eName: 'touchEnd',
        ecName: 'click',
      },
    ];

    eventNames.forEach((name) => {
      this.event[name.eName] = (e) => {
        const touch = e.touches[0];
        this.chart.getZr().handler.dispatch(name.ecName, {
          zrX: name.eName === 'tap' ? touch.clientX : touch.x,
          zrY: name.eName === 'tap' ? touch.clientY : touch.y,
        });
      };
    });
  }

  set width(w) {
    if (this.canvasNode) this.canvasNode.width = w;
  }
  set height(h) {
    if (this.canvasNode) this.canvasNode.height = h;
  }

  get width() {
    if (this.canvasNode) return this.canvasNode.width;
    return 0;
  }
  get height() {
    if (this.canvasNode) return this.canvasNode.height;
    return 0;
  }
}
