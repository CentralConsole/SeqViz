/**
 * @file App.simple.jsx
 * @description 简化的应用入口组件 - 仅用于测试组件
 * 主要职责：
 * 1. 提供最基本的容器
 * 2. 测试 SequenceViewer 组件
 */

import React from "react";
import SequenceViewer from "./components/SequenceViewer/SequenceViewer";

function App() {
  const handleFeatureClick = (feature) => {
    console.log("点击的特征数据：", feature);
  };

  const loadData = async () => {
    const res = await fetch("/mito.json");
    return await res.json();
  };

  return (
    <div style={{ width: "100vw", height: "100vh", margin: 0, padding: 0 }}>
      <SequenceViewer loadData={loadData} onFeatureClick={handleFeatureClick} />
    </div>
  );
}

export default App;
