# GenomeViewer

一个基于 React.js 和 D3.js 的基因可视化组件，用于展示基因组序列、基因位置和注释信息。

## 特性

- 🧬 支持基因组序列可视化
- 🎯 交互式特征展示
- 🎨 可定制的主题和样式
- 📊 支持大规模数据渲染
- 🖱️ 丰富的交互事件
- 🌓 支持深色/浅色主题

## 安装

```bash
npm install genome-viewer
# 或
yarn add genome-viewer
```

## 快速开始

```jsx
import { GenomeViewer } from "genome-viewer";

function App() {
  const data = {
    locus: "NC_000913.3 4641652 bp",
    features: [
      {
        type: "gene",
        location: [["100", "200"]],
        information: {
          gene: "example_gene",
          product: "Example Protein",
          note: "Example note",
        },
      },
    ],
  };
  // 或直接输入JSON文件路径

  return <GenomeViewer data={data} width={800} height={600} />;
}
```

## 属性

### 必需属性

| 属性名 | 类型   | 描述             |
| ------ | ------ | ---------------- |
| data   | Object | 基因组数据对象   |
| width  | number | 组件宽度（像素） |
| height | number | 组件高度（像素） |

### 可选属性

| 属性名         | 类型     | 默认值 | 描述               |
| -------------- | -------- | ------ | ------------------ |
| theme          | string   | 'dark' | 主题设置           |
| onFeatureClick | function | -      | 特征点击事件回调   |
| onFeatureHover | function | -      | 特征悬停事件回调   |
| customColors   | Object   | -      | 自定义特征颜色配置 |

## 数据格式

```javascript
{
  locus: string,  // 格式: "NC_000913.3 4641652 bp"
  features: [
    {
      type: string,  // 特征类型
      location: [[string, string]],  // 特征位置
      information: {
        gene?: string,     // 基因名
        product?: string,  // 产物名称
        note?: string      // 注释信息
      }
    }
  ]
}
```

## 主题定制

```jsx
// 深色主题
<GenomeViewer
  data={data}
  theme="dark"
/>

// 浅色主题
<GenomeViewer
  data={data}
  theme="light"
/>

// 自定义颜色
const customColors = {
  gene: '#FF0000',
  CDS: '#00FF00',
  others: '#0000FF'
};

<GenomeViewer
  data={data}
  customColors={customColors}
/>
```

## 事件处理

```jsx
function handleFeatureClick(feature) {
  console.log("Clicked feature:", feature);
}

function handleFeatureHover(feature) {
  console.log("Hovered feature:", feature);
}

<GenomeViewer
  data={data}
  onFeatureClick={handleFeatureClick}
  onFeatureHover={handleFeatureHover}
/>;
```

## 样式定制

组件使用 CSS 模块，可以通过覆盖以下类名来自定义样式：

```css
.genome-visualizer {
  /* 容器样式 */
}

.feature {
  /* 特征样式 */
}

.annotation {
  /* 注释文本样式 */
}

.top-axis {
  /* 顶部坐标轴样式 */
}
```

## 浏览器兼容性

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 注意事项

1. 确保提供的数据格式正确
2. 大数据量时注意性能影响
3. 自定义样式时注意保持视觉一致性

## 常见问题

### Q: 为什么特征不可见？

A: 检查数据格式是否正确，特别是 location 数组的格式。

### Q: 如何自定义特征颜色？

A: 使用 `customColors` 属性提供自定义颜色配置。

### Q: 如何处理大数据量？

A: 考虑实现数据分页或虚拟滚动。

## 更新日志

### v1.0.0

- 初始版本发布
- 支持基本特征展示
- 支持交互操作

## 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进组件。

## 许可证

MIT License
