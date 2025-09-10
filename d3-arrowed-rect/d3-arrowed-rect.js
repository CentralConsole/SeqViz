/**
 * @file d3-arrowed-rect.js
 * @description D3.js 箭头矩形绘制函数
 * 一个用于在D3.js中绘制带箭头的矩形的实用函数
 * 支持自定义长度、宽度、方向、文本等参数
 *
 * @author Your Name
 * @version 1.0.0
 * @license MIT
 */

/**
 * 在D3.js中绘制带箭头的矩形
 * @param {d3.Selection} parent - D3选择器，父容器元素
 * @param {Object} options - 配置选项
 * @param {number} options.x - 矩形的x坐标
 * @param {number} options.y - 矩形的y坐标
 * @param {number} options.width - 矩形的总宽度（包括箭头）
 * @param {number} options.height - 矩形的高度
 * @param {string} [options.direction='right'] - 箭头方向：'left' 或 'right'
 * @param {string} [options.text] - 矩形内显示的文本
 * @param {Object} [options.textStyle] - 文本样式配置
 * @param {string} [options.textStyle.fontFamily='Arial'] - 字体族
 * @param {number} [options.textStyle.fontSize=12] - 字体大小
 * @param {string} [options.textStyle.fill='#000'] - 文本颜色
 * @param {string} [options.textStyle.textAnchor='middle'] - 文本锚点
 * @param {Object} [options.arrowStyle] - 箭头样式配置
 * @param {number} [options.arrowStyle.widthRatio=0.3] - 箭头宽度占总宽度的比例（0-1）
 * @param {number} [options.arrowStyle.neckRatio=0.6] - 箭头颈部高度比例（相对于矩形高度）
 * @param {Object} [options.style] - 矩形样式配置
 * @param {string} [options.style.fill='#4CAF50'] - 填充颜色
 * @param {string} [options.style.stroke='#2E7D32'] - 描边颜色
 * @param {number} [options.style.strokeWidth=1] - 描边宽度
 * @param {number} [options.style.fillOpacity=1] - 填充透明度
 * @param {Function} [options.onClick] - 点击事件处理函数
 * @param {Function} [options.onMouseOver] - 鼠标悬停事件处理函数
 * @param {Function} [options.onMouseOut] - 鼠标离开事件处理函数
 * @param {string} [options.className] - CSS类名
 * @param {string} [options.id] - 元素ID
 * @returns {d3.Selection} 返回创建的箭头矩形元素
 *
 * @example
 * // 基本用法 - 向右箭头
 * const arrowRect = d3ArrowedRect(svg, {
 *   x: 100,
 *   y: 50,
 *   width: 200,
 *   height: 30,
 *   text: "Gene A",
 *   style: {
 *     fill: "#4CAF50",
 *     stroke: "#2E7D32"
 *   }
 * });
 *
 * @example
 * // 向左箭头
 * const leftArrow = d3ArrowedRect(svg, {
 *   x: 100,
 *   y: 100,
 *   width: 200,
 *   height: 30,
 *   direction: "left",
 *   text: "Gene B",
 *   style: {
 *     fill: "#2196F3",
 *     stroke: "#1976D2"
 *   }
 * });
 *
 * @example
 * // 带事件处理
 * const interactiveArrow = d3ArrowedRect(svg, {
 *   x: 100,
 *   y: 150,
 *   width: 200,
 *   height: 30,
 *   text: "Click me!",
 *   onClick: (event, data) => {
 *     console.log("Arrow clicked!");
 *   },
 *   onMouseOver: (event, data) => {
 *     d3.select(event.target).style("opacity", 0.8);
 *   },
 *   onMouseOut: (event, data) => {
 *     d3.select(event.target).style("opacity", 1);
 *   }
 * });
 */
function d3ArrowedRect(parent, options) {
  // 参数验证和默认值设置
  if (!parent || !options) {
    throw new Error("d3ArrowedRect: parent and options are required");
  }

  const {
    x = 0,
    y = 0,
    width = 100,
    height = 30,
    direction = "right",
    text,
    textStyle = {},
    arrowStyle = {},
    style = {},
    onClick,
    onMouseOver,
    onMouseOut,
    className,
    id,
  } = options;

  // 验证必需参数
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof width !== "number" ||
    typeof height !== "number"
  ) {
    throw new Error("d3ArrowedRect: x, y, width, height must be numbers");
  }

  if (width <= 0 || height <= 0) {
    throw new Error("d3ArrowedRect: width and height must be positive");
  }

  if (!["left", "right"].includes(direction)) {
    throw new Error("d3ArrowedRect: direction must be 'left' or 'right'");
  }

  // 合并默认样式
  const finalTextStyle = {
    fontFamily: "Arial",
    fontSize: 12,
    fill: "#000",
    textAnchor: "middle",
    ...textStyle,
  };

  const finalArrowStyle = {
    widthRatio: 0.3,
    neckRatio: 0.6,
    ...arrowStyle,
  };

  const finalStyle = {
    fill: "#4CAF50",
    stroke: "#2E7D32",
    strokeWidth: 1,
    fillOpacity: 1,
    ...style,
  };

  // 计算箭头参数
  const arrowWidth = Math.min(height * 1.2, width * finalArrowStyle.widthRatio);
  const arrowNeck = height * finalArrowStyle.neckRatio;
  const rectWidth = width - arrowWidth;

  // 计算多边形顶点
  let points;
  if (direction === "left") {
    // 向左箭头
    const leftTop = [x + width, y];
    const rightTop = [x + arrowWidth, y];
    const neckTop = [x + arrowWidth, y + height / 2 - (height + arrowNeck) / 2];
    const tip = [x, y + height / 2];
    const neckBottom = [
      x + arrowWidth,
      y + height / 2 + (height + arrowNeck) / 2,
    ];
    const rightBottom = [x + arrowWidth, y + height];
    const leftBottom = [x + width, y + height];
    points = [
      leftTop,
      rightTop,
      neckTop,
      tip,
      neckBottom,
      rightBottom,
      leftBottom,
    ];
  } else {
    // 向右箭头
    const leftTop = [x, y];
    const rightTop = [x + rectWidth, y];
    const neckTop = [x + rectWidth, y + height / 2 - (height + arrowNeck) / 2];
    const tip = [x + width, y + height / 2];
    const neckBottom = [
      x + rectWidth,
      y + height / 2 + (height + arrowNeck) / 2,
    ];
    const rightBottom = [x + rectWidth, y + height];
    const leftBottom = [x, y + height];
    points = [
      leftTop,
      rightTop,
      neckTop,
      tip,
      neckBottom,
      rightBottom,
      leftBottom,
    ];
  }

  // 创建箭头矩形组
  const arrowGroup = parent
    .append("g")
    .attr("class", className || "arrowed-rect")
    .attr("id", id);

  // 绘制箭头多边形
  const arrowElement = arrowGroup
    .append("polygon")
    .attr("points", points.map((p) => p.join(",")).join(" "))
    .attr("fill", finalStyle.fill)
    .attr("stroke", finalStyle.stroke)
    .attr("stroke-width", finalStyle.strokeWidth)
    .attr("fill-opacity", finalStyle.fillOpacity)
    .style("cursor", onClick || onMouseOver ? "pointer" : "default");

  // 添加事件监听器
  if (onClick) {
    arrowElement.on("click", onClick);
  }
  if (onMouseOver) {
    arrowElement.on("mouseover", onMouseOver);
  }
  if (onMouseOut) {
    arrowElement.on("mouseout", onMouseOut);
  }

  // 添加文本（如果提供）
  if (text) {
    const textX =
      direction === "left" ? x + arrowWidth + rectWidth / 2 : x + rectWidth / 2;
    const textY = y + height / 2;

    arrowGroup
      .append("text")
      .attr("x", textX)
      .attr("y", textY)
      .attr("text-anchor", finalTextStyle.textAnchor)
      .attr("dominant-baseline", "middle")
      .style("font-family", finalTextStyle.fontFamily)
      .style("font-size", `${finalTextStyle.fontSize}px`)
      .style("fill", finalTextStyle.fill)
      .style("pointer-events", "none")
      .text(text);
  }

  // 返回箭头组元素，方便后续操作
  return arrowGroup;
}

/**
 * 创建箭头矩形的工厂函数，返回一个可重用的箭头矩形创建器
 * @param {Object} defaultOptions - 默认配置选项
 * @returns {Function} 返回一个配置了默认选项的箭头矩形创建函数
 *
 * @example
 * // 创建基因箭头工厂
 * const geneArrow = d3ArrowedRectFactory({
 *   height: 25,
 *   style: {
 *     fill: "#4CAF50",
 *     stroke: "#2E7D32"
 *   },
 *   textStyle: {
 *     fontSize: 10,
 *     fill: "#fff"
 *   }
 * });
 *
 * // 使用工厂函数
 * geneArrow(svg, {
 *   x: 100,
 *   y: 50,
 *   width: 150,
 *   text: "Gene A"
 * });
 */
function d3ArrowedRectFactory(defaultOptions = {}) {
  return function (parent, options) {
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      textStyle: {
        ...defaultOptions.textStyle,
        ...options.textStyle,
      },
      arrowStyle: {
        ...defaultOptions.arrowStyle,
        ...options.arrowStyle,
      },
      style: {
        ...defaultOptions.style,
        ...options.style,
      },
    };
    return d3ArrowedRect(parent, mergedOptions);
  };
}

/**
 * 批量创建箭头矩形
 * @param {d3.Selection} parent - D3选择器，父容器元素
 * @param {Array} data - 数据数组
 * @param {Function} optionsFn - 选项函数，接收数据项和索引，返回选项对象
 * @returns {d3.Selection} 返回创建的箭头矩形元素集合
 *
 * @example
 * const genes = [
 *   { name: "Gene A", x: 100, y: 50, width: 150, direction: "right" },
 *   { name: "Gene B", x: 100, y: 100, width: 120, direction: "left" }
 * ];
 *
 * const arrowRects = d3ArrowedRectBatch(svg, genes, (d, i) => ({
 *   x: d.x,
 *   y: d.y,
 *   width: d.width,
 *   height: 25,
 *   direction: d.direction,
 *   text: d.name,
 *   style: {
 *     fill: i % 2 === 0 ? "#4CAF50" : "#2196F3"
 *   }
 * }));
 */
function d3ArrowedRectBatch(parent, data, optionsFn) {
  if (!Array.isArray(data)) {
    throw new Error("d3ArrowedRectBatch: data must be an array");
  }

  const arrowGroups = parent
    .selectAll(".arrowed-rect-batch")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "arrowed-rect-batch");

  arrowGroups.each(function (d, i) {
    const options = typeof optionsFn === "function" ? optionsFn(d, i) : d;
    d3ArrowedRect(d3.select(this), options);
  });

  return arrowGroups;
}

// 导出函数（支持多种模块系统）
if (typeof module !== "undefined" && module.exports) {
  // CommonJS
  module.exports = {
    d3ArrowedRect,
    d3ArrowedRectFactory,
    d3ArrowedRectBatch,
  };
} else if (typeof define === "function" && define.amd) {
  // AMD
  define(function () {
    return {
      d3ArrowedRect,
      d3ArrowedRectFactory,
      d3ArrowedRectBatch,
    };
  });
} else if (typeof window !== "undefined") {
  // 浏览器全局变量
  window.d3ArrowedRect = d3ArrowedRect;
  window.d3ArrowedRectFactory = d3ArrowedRectFactory;
  window.d3ArrowedRectBatch = d3ArrowedRectBatch;
}
