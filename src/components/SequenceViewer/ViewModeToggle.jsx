import React from "react";

/**
 * ViewModeToggle组件 - 用于切换序列视图模式
 * @param {Object} props
 * @param {string} props.currentMode - 当前视图模式
 * @param {Function} props.onModeChange - 模式切换回调函数
 */
const ViewModeToggle = ({ currentMode, onModeChange }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: "20px",
        right: "20px",
        zIndex: 1000,
        display: "flex",
        gap: "10px",
      }}
    >
      <button
        onClick={() => onModeChange("linear")}
        style={{
          backgroundColor: currentMode === "linear" ? "#4caf50" : "#ccc",
          color: "white",
          border: "none",
          padding: "8px 16px",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "14px",
          transition: "background-color 0.3s",
        }}
      >
        线性视图
      </button>
      <button
        onClick={() => onModeChange("circular")}
        style={{
          backgroundColor: currentMode === "circular" ? "#4caf50" : "#ccc",
          color: "white",
          border: "none",
          padding: "8px 16px",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "14px",
          transition: "background-color 0.3s",
        }}
      >
        环形视图
      </button>
    </div>
  );
};

export default ViewModeToggle;
