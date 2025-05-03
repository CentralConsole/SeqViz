/**
 * @file App.jsx
 * @description 应用入口组件
 * 主要职责：
 * 1. 提供应用的整体布局结构
 * 2. 管理全局状态（如主题、语言等）
 * 3. 作为其他组件的容器
 * 4. 处理全局路由（如果后续需要）
 */

import React from "react";
import SeqViewerLinear from "./components/GenomeVisualizer/SeqViewerLinear";
import "./App.css";

function App() {
  return (
    <div className="App">
      <SeqViewerLinear data="/test.json" style={{ flex: 1, height: "100vh" }} />
    </div>
  );
}

export default App;
