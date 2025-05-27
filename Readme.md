# Genome Visualizer

一个用于可视化基因组数据的React组件，支持特征（features）的展示和交互。

## 安装

由于这是一个私有包，您需要通过本地路径安装：

```bash
npm install genome-visualizer
```

## 使用方法

### 基本使用

```javascript
import React from 'react';
import { SequenceViewer } from 'genome-visualizer';

function App() {
  return (
    <div style={{ width: '100%', height: '600px' }}>
      <SequenceViewer 
        data="/path/to/your/data.json"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
```

### 数据格式

组件期望的JSON数据格式如下：

```json
{
  "locus": "NC_000001.11 1..1000000",
  "features": [
    {
      "id": "feature1",
      "type": "gene",
      "location": [["100", "200"]],
      "information": {
        "gene": "GENE1",
        "product": "Protein 1",
        "note": "Some notes"
      }
    }
    // ... 更多特征
  ]
}
```

### 获取特征数据

有两种方式可以获取用户点击的特征数据：

#### 1. 通过回调函数

```javascript
import React from 'react';
import { SequenceViewer } from 'genome-visualizer';

function App() {
  const handleFeatureClick = (feature) => {
    console.log('特征数据：', feature);
    // feature 包含完整的特征信息，包括：
    // - id: 特征ID
    // - type: 特征类型
    // - location: 位置信息
    // - information: 详细信息（gene, product, note等）
  };

  return (
    <div>
      <SequenceViewer 
        data="/path/to/your/data.json"
        onFeatureClick={handleFeatureClick}
      />
    </div>
  );
}
```

#### 2. 通过自定义事件

```javascript
import React, { useEffect } from 'react';
import { SequenceViewer } from 'genome-visualizer';

function App() {
  useEffect(() => {
    const handleGenomeFeatureClick = (event) => {
      const { feature, timestamp } = event.detail;
      console.log('特征数据：', feature);
      console.log('点击时间：', timestamp);
    };

    window.addEventListener('genomeFeatureClick', handleGenomeFeatureClick);
  
    return () => {
      window.removeEventListener('genomeFeatureClick', handleGenomeFeatureClick);
    };
  }, []);

  return (
    <div>
      <SequenceViewer data="/path/to/your/data.json" />
    </div>
  );
}
```

### 组件属性

| 属性           | 类型          | 必填 | 说明                         |
| -------------- | ------------- | ---- | ---------------------------- |
| data           | Object/String | 是   | 基因组数据对象或数据文件路径 |
| width          | Number        | 否   | 组件宽度，默认800            |
| height         | Number        | 否   | 组件高度，默认600            |
| style          | Object        | 否   | 自定义样式                   |
| onFeatureClick | Function      | 否   | 特征点击回调函数             |

### 特征数据结构

当用户点击特征时，返回的数据结构如下：

```javascript
{
  id: "feature1",           // 特征ID
  type: "gene",            // 特征类型
  location: [              // 位置信息数组
    ["100", "200"]         // 每个位置是一个数组，包含起始和结束位置
  ],
  information: {           // 特征详细信息
    gene: "GENE1",         // 基因名称
    product: "Protein 1",  // 产物名称
    note: "Some notes"     // 备注信息
  }
}
```

### 样式定制

您可以通过 `style` 属性来自定义组件样式：

```javascript
<SequenceViewer 
  data="/path/to/your/data.json"
  style={{
    width: '100%',
    height: '600px',
    backgroundColor: '#f5f5f5',
    // 其他样式...
  }}
/>
```

## 注意事项

1. 组件需要 React 18.2.0 或更高版本
2. 数据文件需要符合指定的JSON格式
3. 建议在使用前对数据进行验证
4. 组件会自动处理数据加载和错误状态

## 示例

完整的示例代码：

```javascript
import React, { useEffect } from 'react';
import { SequenceViewer } from 'genome-visualizer';

function App() {
  // 通过回调函数处理点击
  const handleFeatureClick = (feature) => {
    console.log('通过回调获取的特征数据：', feature);
  };

  // 通过事件监听处理点击
  useEffect(() => {
    const handleGenomeFeatureClick = (event) => {
      const { feature, timestamp } = event.detail;
      console.log('通过事件获取的特征数据：', feature);
      console.log('点击时间：', timestamp);
    };

    window.addEventListener('genomeFeatureClick', handleGenomeFeatureClick);
  
    return () => {
      window.removeEventListener('genomeFeatureClick', handleGenomeFeatureClick);
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <SequenceViewer 
        data="/path/to/your/data.json"
        onFeatureClick={handleFeatureClick}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#f5f5f5'
        }}
      />
    </div>
  );
}
```
