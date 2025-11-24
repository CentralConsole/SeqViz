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

// 配置：GBK 文件路径
// 可以通过环境变量或直接修改这里来指定后端文件路径
// const GBK_FILE_PATH = import.meta.env.VITE_GBK_FILE_PATH || "/mito2.gbk";
// 如果文件在后端 API，可以使用完整 URL，例如：
// const GBK_FILE_PATH = "http://localhost:3000/api/files/mito2.gbk";
// const GBK_FILE_PATH = "/api/genbank/mito2.gbk";
const GBK_FILE_PATH = "/Homo sapiens mitochondrion sequence.gb";
function App() {
  useEffect(() => {
    // 设置初始缩放
    document.body.style.zoom = "100%";
  }, []);

  const handleFeatureClick = (feature) => {
    console.log("点击的特征数据：", feature);
    // 这里可以添加更多的处理逻辑，比如显示在界面上
  };

  const loadData = async () => {
    // 支持从后端 API 或本地 public 目录加载 GBK 文件
    const res = await fetch(GBK_FILE_PATH);
    if (!res.ok) {
      throw new Error(
        `Failed to load GBK file from ${GBK_FILE_PATH}: ${res.statusText}`
      );
    }
    return await res.text();
  };

  return (
    <div className="App">
      <SequenceViewer
        loadData={loadData}
        style={{ width: "100%", height: "100vh" }}
        onFeatureClick={handleFeatureClick}
      />
    </div>
  );
}

export default App;
