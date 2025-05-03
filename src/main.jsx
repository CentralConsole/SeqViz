/**
 * @file main.jsx
 * @description 应用入口文件
 * 主要职责：
 * 1. 初始化 React 应用
 * 2. 设置全局样式
 * 3. 配置开发工具（如 React DevTools）
 * 4. 挂载根组件
 */

import React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
