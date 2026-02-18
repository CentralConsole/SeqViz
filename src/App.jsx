/**
 * @file App.jsx
 * @description 应用入口组件
 * 主要职责：
 * 1. 提供应用的整体布局结构
 * 2. 管理全局状态（如主题、语言等）
 * 3. 作为其他组件的容器
 * 4. 处理全局路由（如果后续需要）
 */

import React, { useEffect } from "react";
import SequenceViewer from "./components/SequenceViewer/SequenceViewer";
import "./App.css";

function App() {
  useEffect(() => {
    // 设置初始缩放
    document.body.style.zoom = "100%";
  }, []);

  const handleFeatureClick = (feature) => {
    console.log("点击的特征数据：", feature);
    // 这里可以添加更多的处理逻辑，比如显示在界面上
  };

  // No loadData prop - component will show file selection interface by default
  return (
    <div className="App">
      <SequenceViewer
        style={{ width: "100%", height: "100vh" }}
        onFeatureClick={handleFeatureClick}
      />
    </div>
  );
}

export default App;
