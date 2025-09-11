# Genome Visualizer

一个用于可视化基因组数据的 React 组件，支持特征（features）的展示和交互。组件为纯渲染库：不内置网络请求与全局副作用，数据由外部以 props 传入。

## 安装

由于这是一个私有包，您需要通过本地路径安装：

```bash
npm install sequence-viewer
# 宿主需提供 peer 依赖（React 18 或 19、ReactDOM 18 或 19、D3 >= 7）
npm install react react-dom d3
```

## 使用方法

### 基本使用（对象数据）

```javascript
import React from "react";
import { SequenceViewer } from "sequence-viewer";

function App() {
  return (
    <div style={{ width: "100%", height: "600px" }}>
      <SequenceViewer
        data={{
          locus: { sequenceLength: 16569 },
          features: [],
          origin: "ACGT...",
        }}
        viewMode="circular"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
```

### Electron 集成示例（通过 preload/IPC 读取本地文件）

preload.js（启用 `contextIsolation: true`）

```javascript
// preload.js
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("genomeApi", {
  readGenome: async (filePath) => {
    // Returns parsed JSON object
    return await ipcRenderer.invoke("read-genome-json", filePath);
  },
});
```

main.js（注册 IPC 并配置 BrowserWindow）

```javascript
// main.js
import { app, BrowserWindow, ipcMain } from "electron";
import { readFile } from "fs/promises";
import path from "path";

ipcMain.handle("read-genome-json", async (_e, filePath) => {
  const content = await readFile(filePath, "utf-8");
  return JSON.parse(content);
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadURL("http://localhost:5173");
}

app.whenReady().then(createWindow);
```

渲染进程（React）

```javascript
// App.jsx (Renderer)
import React from "react";
import { SequenceViewer } from "sequence-viewer";

export default function App() {
  const loadData = async () => {
    // Call preload API to read local JSON file
    return await window.genomeApi.readGenome("C:/data/mito.json");
  };

  return (
    <div style={{ width: "100%", height: "600px" }}>
      <SequenceViewer loadData={loadData} viewMode="circular" />
    </div>
  );
}
```

安全建议：启用 `contextIsolation: true`，仅通过 preload 暴露最小必要 API，避免在组件内直接使用 Node API。

### 懒加载（通过回调）

```javascript
import React from "react";
import { SequenceViewer } from "sequence-viewer";

function App() {
  const loadData = async () => {
    // Fetch/IPC/file read outside of component; return parsed object
    const res = await fetch("/path/to/your/data.json");
    return await res.json();
  };

  return (
    <div style={{ width: "100%", height: "600px" }}>
      <SequenceViewer loadData={loadData} />
    </div>
  );
}
```

### 数据格式

组件期望的 JSON 数据格式如下：

```json
{
  "locus": {
    "sequenceLength": 1000000
  },
  "features": [
    {
      "id": "feature1",
      "type": "gene",
      "location": [["100", false, "200"]],
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
import React from "react";
import { SequenceViewer } from "genome-visualizer";

function App() {
  const handleFeatureClick = (feature) => {
    console.log("特征数据：", feature);
    // feature 包含完整的特征信息，包括：
    // - id: 特征ID
    // - type: 特征类型
    // - location: 位置信息
    // - information: 详细信息（gene, product, note等）
  };

  return (
    <div>
      <SequenceViewer data={dataObject} onFeatureClick={handleFeatureClick} />
    </div>
  );
}
```

#### 2. 通过自定义事件（可选）

```javascript
import React, { useEffect } from "react";
import { SequenceViewer } from "genome-visualizer";

function App() {
  useEffect(() => {
    const handleGenomeFeatureClick = (event) => {
      const { feature, timestamp } = event.detail;
      console.log("特征数据：", feature);
      console.log("点击时间：", timestamp);
    };

    window.addEventListener("genomeFeatureClick", handleGenomeFeatureClick);

    return () => {
      window.removeEventListener(
        "genomeFeatureClick",
        handleGenomeFeatureClick
      );
    };
  }, []);

  return (
    <div>
      <SequenceViewer data={dataObject} />
    </div>
  );
}
```

### 组件属性

| 属性           | 类型          | 必填 | 说明                         |
| -------------- | ------------- | ---- | ---------------------------- |
| data           | Object/String | 是   | 基因组数据对象或数据文件路径 |
| width          | Number        | 否   | 组件宽度，默认 800           |
| height         | Number        | 否   | 组件高度，默认 600           |
| style          | Object        | 否   | 自定义样式                   |
| onFeatureClick | Function      | 否   | 特征点击回调函数             |

### 特征数据结构

当用户点击特征时，返回的数据结构如下：

```javascript
{
  id: "feature1",           // 特征ID
  type: "gene",            // 特征类型
  location: [              // 位置信息数组
    ["100", false, "200"]         // 每个位置是一个数组，包含起始位置、是否位于互补链上、结束位置
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
    width: "100%",
    height: "600px",
    backgroundColor: "#f5f5f5",
    // 其他样式...
  }}
/>
```

## 注意事项

1. Requirements: React 18 or 19, ReactDOM 18 or 19, D3 >= 7（由宿主应用提供）
2. 数据文件需要符合指定的 JSON 格式
3. 建议在使用前对数据进行验证
4. 组件不内置网络请求；请使用 `data` 对象或 `loadData()` 回调传入数据

## 示例

完整的示例代码：

```javascript
import React, { useEffect } from "react";
import { SequenceViewer } from "genome-visualizer";

function App() {
  // 通过回调函数处理点击
  const handleFeatureClick = (feature) => {
    console.log("通过回调获取的特征数据：", feature);
  };

  // 通过事件监听处理点击
  useEffect(() => {
    const handleGenomeFeatureClick = (event) => {
      const { feature, timestamp } = event.detail;
      console.log("通过事件获取的特征数据：", feature);
      console.log("点击时间：", timestamp);
    };

    window.addEventListener("genomeFeatureClick", handleGenomeFeatureClick);

    return () => {
      window.removeEventListener(
        "genomeFeatureClick",
        handleGenomeFeatureClick
      );
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "600px" }}>
      <SequenceViewer
        data="/path/to/your/data.json"
        onFeatureClick={handleFeatureClick}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#f5f5f5",
        }}
      />
    </div>
  );
}
```
