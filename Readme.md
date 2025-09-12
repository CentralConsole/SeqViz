# Sequence Viewer

[![React](https://img.shields.io/badge/React-18%2B-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-Friendly-green.svg)](https://electronjs.org/)
[![Plug & Play](https://img.shields.io/badge/Plug%20%26%20Play-✅-brightgreen.svg)]()

一个用于可视化基因组数据的 React 组件，支持特征（features）的展示和交互。组件已实现真正的"即插即用"：内置所有必要的样式和字体资源，无需额外配置。

## 快速开始

```bash
npm install sequence-viewer react react-dom d3
```

```javascript
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
      />
    </div>
  );
}
```

## 安装

```bash
npm install sequence-viewer
# 宿主需提供 peer 依赖（React 18 或 19、ReactDOM 18 或 19、D3 >= 7）
npm install react react-dom d3
```

## 特性

本组件已内置所有必要的样式和字体资源，真正做到"即插即用"：

- ✅ **内置字体**：Maple Mono Nerd Font 已打包到组件内部，无需额外配置
- ✅ **内置样式**：所有 UI 样式已集成，使用 `sv-` 前缀避免冲突
- ✅ **零依赖**：组件不依赖外部 CSS 或字体文件
- ✅ **响应式**：支持浅色/深色主题自动切换
- ✅ **类型安全**：支持 TypeScript（类型声明即将提供）
- ✅ **Electron 友好**：专为 Electron 项目优化

## 字体说明

本组件渲染强依赖字体 Maple Mono Nerd Font（Maple Mono NF）。它不仅是等宽字体，同时其字形比例与 Nerd Font 符号集是可视化文字测量与图标渲染的基础。**组件已内置此字体，无需额外配置**。

### 自定义字体（可选）

如需在宿主项目中覆盖默认字体：

1. 通过 Public 静态资源路径（适用于 Vite/CRA/Electron 渲染进程）

将字体文件放到宿主应用可访问的公共目录，例如：

```
public/
  assets/
    fonts/
      maple-mono-nf/
        MapleMono-NF-Regular.ttf
        MapleMono-NF-Bold.ttf
        MapleMono-NF-Italic.ttf
```

在宿主全局 CSS 中声明 @font-face（路径根据你的部署调整）：

```css
@font-face {
  font-family: "Maple Mono NF";
  src: url("/assets/fonts/maple-mono-nf/MapleMono-NF-Regular.ttf") format("truetype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Maple Mono NF";
  src: url("/assets/fonts/maple-mono-nf/MapleMono-NF-Bold.ttf") format("truetype");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Maple Mono NF";
  src: url("/assets/fonts/maple-mono-nf/MapleMono-NF-Italic.ttf") format("truetype");
  font-weight: 400;
  font-style: italic;
  font-display: swap;
}
```

2. 通过打包器导入（将字体作为模块资产）

将字体放入宿主源码目录（例如 `src/assets/fonts/maple-mono-nf/`），在你的全局样式中用相对路径引用：

```css
@font-face {
  font-family: "Maple Mono NF";
  src: url("./assets/fonts/maple-mono-nf/MapleMono-NF-Regular.ttf") format("truetype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
/* 其余 Bold/Italic 同上 */
```

Electron 项目建议：在渲染进程可访问的静态目录（如 `resources` 或 `public`）托管字体，保持可被页面直接访问的 URL（例如 `win.loadURL` 提供的站点根下 `/assets/fonts/...`）。不要在组件内部通过 Node API 读取字体文件。

## 使用方法

### 基本使用（即插即用）

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

**✨ 即插即用**：组件已内置所有样式和字体，无需额外引入 CSS 或配置字体路径。

### 懒加载数据

```javascript
import React from "react";
import { SequenceViewer } from "sequence-viewer";

function App() {
  const loadData = async () => {
    // 从 API、文件或 IPC 获取数据
    const res = await fetch("/api/genome-data");
    return await res.json();
  };

  return (
    <div style={{ width: "100%", height: "600px" }}>
      <SequenceViewer
        loadData={loadData}
        viewMode="linear"
        onFeatureClick={(feature) => console.log("Feature:", feature)}
      />
    </div>
  );
}
```

### 受控视图模式

```javascript
import React, { useState } from "react";
import { SequenceViewer } from "sequence-viewer";

function App() {
  const [viewMode, setViewMode] = useState("circular");

  return (
    <div>
      <div>
        <button onClick={() => setViewMode("linear")}>Linear</button>
        <button onClick={() => setViewMode("circular")}>Circular</button>
        <button onClick={() => setViewMode("detailed")}>Detailed</button>
      </div>
      <div style={{ width: "100%", height: "600px" }}>
        <SequenceViewer data={yourData} viewMode={viewMode} />
      </div>
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

## 组件属性

| 属性           | 类型     | 必填 | 默认值   | 说明                                       |
| -------------- | -------- | ---- | -------- | ------------------------------------------ |
| data           | Object   | 否   | -        | 基因组数据对象（推荐）                     |
| loadData       | Function | 否   | -        | 懒加载数据的函数，返回 Promise<Object>     |
| viewMode       | String   | 否   | "linear" | 视图模式："linear"、"circular"、"detailed" |
| width          | Number   | 否   | 自动     | 组件宽度，默认自适应容器                   |
| height         | Number   | 否   | 自动     | 组件高度，默认自适应容器                   |
| style          | Object   | 否   | {}       | 自定义容器样式                             |
| onFeatureClick | Function | 否   | -        | 特征点击回调函数                           |
| className      | String   | 否   | -        | 自定义 CSS 类名                            |

### 数据格式

组件期望的 JSON 数据格式：

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
  ],
  "origin": "ACGTACGTACGT..."
}
```

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

## 测试和开发

### 本地测试

```bash
# 克隆仓库
git clone <repository-url>
cd sequence-viewer

# 安装依赖
npm install

# 运行完整开发环境
npm run dev

# 运行简化测试环境（仅组件）
npm run dev:simple

# 构建库
npm run build
```

### 测试组件即插即用特性

1. **简化测试**：运行 `npm run dev:simple` 查看组件在最小环境下的表现
2. **构建测试**：运行 `npm run build` 验证字体和样式正确打包
3. **独立测试**：打开 `test-standalone.html` 测试组件在纯 HTML 环境下的表现

### 开发指南

- 组件样式使用 `sv-` 前缀，避免与宿主样式冲突
- 字体文件位于 `src/components/SequenceViewer/assets/fonts/`
- 主要样式文件：`src/components/SequenceViewer/SequenceViewer.css`
- 构建产物：`dist/sequence-viewer.es.js` 和 `dist/sequence-viewer.cjs.js`

## 注意事项

1. **依赖要求**：React 18 或 19, ReactDOM 18 或 19, D3 >= 7（由宿主应用提供）
2. **数据格式**：数据文件需要符合指定的 JSON 格式
3. **数据验证**：建议在使用前对数据进行验证
4. **数据传入**：组件不内置网络请求；请使用 `data` 对象或 `loadData()` 回调传入数据
5. **容器尺寸**：确保给组件容器设置明确的宽高，避免初始尺寸为 0
6. **样式隔离**：组件使用 `sv-` 前缀，但仍需注意宿主全局样式的潜在影响

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
