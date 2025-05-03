# 基因序列可视化程序

## 项目概述

这是一个基于 React 和 D3.js 的基因序列可视化程序，用于展示基因序列上的特征（如基因、CDS 等）及其注释信息。

## 核心功能

1. 基因序列特征的可视化展示
2. 特征注释信息的显示
3. 交互式查看详细信息
4. 自适应布局管理

## 程序逻辑

### 1. 数据流

```
JSON数据 -> 数据解析 -> 布局计算 -> 可视化渲染
```

### 2. 核心组件

#### 2.1 数据层

- `DataUtils`: 数据处理工具

  - 数据清洗和格式化
  - 数值转换
  - 字符串处理

- `TextUtils`: 文本处理工具

  - 文本宽度测量
  - 文本截断处理
  - 字体相关计算

#### 2.2 布局层

- `LayoutManager`: 布局管理器

  - 特征位置计算
  - 行分配
  - 空间占用管理
  - 文本位置计算

- `LayoutUtils`: 布局工具

  - 空间占用记录
  - 重叠检测
  - 可用空间查找

#### 2.3 可视化层

- `GenomeVisualizer`: 主可视化组件
  - SVG 画布管理
  - 特征渲染
  - 交互处理
  - 事件管理

### 3. 渲染流程

1. **初始化阶段**

   - 创建 SVG 画布
   - 设置尺寸和比例尺
   - 初始化布局系统

2. **数据处理阶段**

   - 解析输入数据
   - 提取特征信息
   - 计算特征边界

3. **布局计算阶段**

   - 分配特征行
   - 计算特征位置
   - 处理文本显示

4. **渲染阶段**

   - 绘制特征框
   - 添加注释文本
   - 设置交互事件

### 4. 交互功能

1. **鼠标悬停**

   - 高亮显示特征
   - 显示完整注释信息
   - 显示位置标记

2. **自适应布局**

   - 响应窗口大小变化
   - 自动调整布局
   - 保持显示比例

### 5. 文本处理策略

1. **文本显示规则**

   - 文本直接显示在特征框内
   - 超出长度的文本自动截断
   - 使用省略号表示截断

2. **文本截断逻辑**

   - 计算可用空间
   - 测量文本宽度
   - 智能截断处理

### 6. 性能优化

1. **渲染优化**

   - 使用 D3.js 的数据绑定
   - 最小化 DOM 操作
   - 批量更新策略

2. **布局优化**

   - 空间占用记录
   - 快速重叠检测
   - 高效行分配算法

## 使用说明

1. **数据格式**

   - 支持标准 JSON 格式
   - 需要包含特征位置和注释信息
   - 支持多特征类型

2. **配置选项**

   - 可自定义显示尺寸
   - 可调整字体大小
   - 可配置颜色方案

3. **交互方式**

   - 鼠标悬停查看详情
   - 自动适应窗口大小
   - 支持缩放和平移

## 注意事项

1. **数据要求**

   - 确保数据格式正确
   - 特征位置信息完整
   - 注释信息合理

2. **性能考虑**

   - 大量特征时注意性能
   - 合理设置显示范围
   - 避免过度交互

3. **兼容性**

   - 支持现代浏览器
   - 需要 JavaScript 支持
   - 依赖 D3.js 库

## 安装

```bash
npm install seq-viewer-linear
# 或
yarn add seq-viewer-linear
```

## 快速开始

```jsx
import { SeqViewerLinear } from "seq-viewer-linear";

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

  return <SeqViewerLinear data={data} width={800} height={600} />;
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
<SeqViewerLinear
  data={data}
  theme="dark"
/>

// 浅色主题
<SeqViewerLinear
  data={data}
  theme="light"
/>

// 自定义颜色
const customColors = {
  gene: '#FF0000',
  CDS: '#00FF00',
  others: '#0000FF'
};

<SeqViewerLinear
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

<SeqViewerLinear
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
