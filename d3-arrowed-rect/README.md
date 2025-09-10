# D3 Arrowed Rect

一个用于在 D3.js 中绘制带箭头的矩形的实用函数库。特别适用于基因序列可视化、流程图、时间线等需要方向指示的场景。

## 特性

- 🎯 **简单易用** - 一行代码创建漂亮的箭头矩形
- 🎨 **高度可定制** - 支持自定义颜色、尺寸、文本样式等
- 🔄 **双向支持** - 支持向左和向右的箭头方向
- 🎭 **交互友好** - 内置点击、悬停等事件支持
- 🏭 **工厂模式** - 支持创建统一风格的箭头工厂函数
- 📦 **批量创建** - 支持批量创建多个箭头矩形
- 🌐 **多模块支持** - 支持 CommonJS、AMD 和浏览器全局变量

## 安装

### 浏览器直接使用

```html
<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="d3-arrowed-rect.js"></script>
```

### NPM 安装

```bash
npm install d3-arrowed-rect
```

```javascript
import {
  d3ArrowedRect,
  d3ArrowedRectFactory,
  d3ArrowedRectBatch,
} from "d3-arrowed-rect";
```

## 基本用法

### 创建基本箭头矩形

```javascript
// 向右箭头
d3ArrowedRect(svg, {
  x: 100,
  y: 50,
  width: 200,
  height: 30,
  text: "Gene A",
  style: {
    fill: "#4CAF50",
    stroke: "#2E7D32",
  },
});

// 向左箭头
d3ArrowedRect(svg, {
  x: 100,
  y: 100,
  width: 200,
  height: 30,
  direction: "left",
  text: "Gene B",
  style: {
    fill: "#2196F3",
    stroke: "#1976D2",
  },
});
```

## API 文档

### d3ArrowedRect(parent, options)

主要的箭头矩形创建函数。

#### 参数

- `parent` (d3.Selection) - D3 选择器，父容器元素
- `options` (Object) - 配置选项

#### 选项参数

| 参数          | 类型     | 默认值  | 描述                        |
| ------------- | -------- | ------- | --------------------------- |
| `x`           | number   | 0       | 矩形的 x 坐标               |
| `y`           | number   | 0       | 矩形的 y 坐标               |
| `width`       | number   | 100     | 矩形的总宽度（包括箭头）    |
| `height`      | number   | 30      | 矩形的高度                  |
| `direction`   | string   | 'right' | 箭头方向：'left' 或 'right' |
| `text`        | string   | -       | 矩形内显示的文本            |
| `textStyle`   | Object   | -       | 文本样式配置                |
| `arrowStyle`  | Object   | -       | 箭头样式配置                |
| `style`       | Object   | -       | 矩形样式配置                |
| `onClick`     | Function | -       | 点击事件处理函数            |
| `onMouseOver` | Function | -       | 鼠标悬停事件处理函数        |
| `onMouseOut`  | Function | -       | 鼠标离开事件处理函数        |
| `className`   | string   | -       | CSS 类名                    |
| `id`          | string   | -       | 元素 ID                     |

#### 样式配置

**textStyle**

```javascript
{
  fontFamily: 'Arial',    // 字体族
  fontSize: 12,          // 字体大小
  fill: '#000',          // 文本颜色
  textAnchor: 'middle'   // 文本锚点
}
```

**arrowStyle**

```javascript
{
  widthRatio: 0.3,       // 箭头宽度占总宽度的比例（0-1）
  neckRatio: 0.6         // 箭头颈部高度比例（相对于矩形高度）
}
```

**style**

```javascript
{
  fill: '#4CAF50',       // 填充颜色
  stroke: '#2E7D32',     // 描边颜色
  strokeWidth: 1,        // 描边宽度
  fillOpacity: 1         // 填充透明度
}
```

### d3ArrowedRectFactory(defaultOptions)

创建箭头矩形的工厂函数，返回一个可重用的箭头矩形创建器。

```javascript
// 创建基因箭头工厂
const geneArrow = d3ArrowedRectFactory({
  height: 25,
  style: {
    fill: "#4CAF50",
    stroke: "#2E7D32",
  },
  textStyle: {
    fontSize: 10,
    fill: "#fff",
  },
});

// 使用工厂函数
geneArrow(svg, {
  x: 100,
  y: 50,
  width: 150,
  text: "Gene A",
});
```

### d3ArrowedRectBatch(parent, data, optionsFn)

批量创建箭头矩形。

```javascript
const genes = [
  { name: "Gene A", x: 100, y: 50, width: 150, direction: "right" },
  { name: "Gene B", x: 100, y: 100, width: 120, direction: "left" },
];

d3ArrowedRectBatch(svg, genes, (d, i) => ({
  x: d.x,
  y: d.y,
  width: d.width,
  height: 25,
  direction: d.direction,
  text: d.name,
  style: {
    fill: i % 2 === 0 ? "#4CAF50" : "#2196F3",
  },
}));
```

## 高级用法

### 自定义箭头样式

```javascript
d3ArrowedRect(svg, {
  x: 100,
  y: 50,
  width: 200,
  height: 40,
  text: "Custom Arrow",
  arrowStyle: {
    widthRatio: 0.4, // 箭头占40%宽度
    neckRatio: 0.8, // 颈部高度为矩形高度的80%
  },
  textStyle: {
    fontSize: 14,
    fill: "#fff",
    fontFamily: "Georgia",
  },
  style: {
    fill: "#FF5722",
    stroke: "#D84315",
    strokeWidth: 2,
    fillOpacity: 0.9,
  },
});
```

### 添加交互事件

```javascript
d3ArrowedRect(svg, {
  x: 100,
  y: 50,
  width: 180,
  height: 35,
  text: "Interactive Arrow",
  style: {
    fill: "#9C27B0",
    stroke: "#7B1FA2",
  },
  onClick: (event) => {
    console.log("Arrow clicked!");
    alert("You clicked the arrow!");
  },
  onMouseOver: (event) => {
    d3.select(event.target).style("opacity", 0.7);
  },
  onMouseOut: (event) => {
    d3.select(event.target).style("opacity", 1);
  },
});
```

### 基因序列可视化示例

```javascript
const geneSequence = [
  {
    name: "Promoter",
    x: 50,
    y: 50,
    width: 80,
    direction: "right",
    type: "promoter",
  },
  { name: "CDS", x: 150, y: 50, width: 200, direction: "right", type: "cds" },
  {
    name: "Terminator",
    x: 370,
    y: 50,
    width: 60,
    direction: "right",
    type: "terminator",
  },
];

geneSequence.forEach((gene) => {
  const colors = {
    promoter: { fill: "#FF9800", stroke: "#F57C00" },
    cds: { fill: "#4CAF50", stroke: "#2E7D32" },
    terminator: { fill: "#F44336", stroke: "#D32F2F" },
  };

  d3ArrowedRect(svg, {
    x: gene.x,
    y: gene.y,
    width: gene.width,
    height: 30,
    direction: gene.direction,
    text: gene.name,
    style: colors[gene.type],
    textStyle: { fontSize: 11, fill: "#fff" },
  });
});
```

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 依赖

- D3.js v5.0+

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0

- 初始版本发布
- 支持基本箭头矩形绘制
- 支持自定义样式和交互事件
- 提供工厂函数和批量创建功能
