/**
 * @file main.simple.jsx
 * @description 简化的应用入口文件 - 仅用于测试组件
 * 主要职责：
 * 1. 初始化 React 应用
 * 2. 挂载根组件
 */

import React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.simple.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
