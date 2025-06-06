import React from "react";
import { CONFIG } from "../../config/config";

/**
 * ViewModeToggle组件 - 用于切换序列视图模式
 * @param {Object} props
 * @param {string} props.currentView - 当前视图模式
 * @param {Function} props.onViewChange - 模式切换回调函数
 */
const ViewModeToggle = ({ currentView, onViewChange }) => {
  const { container, button, active, inactive, hover } = CONFIG.viewModeToggle;

  const getButtonStyle = (viewType) => ({
    ...button,
    ...(currentView === viewType ? active : inactive),
  });

  return (
    <div style={container}>
      <button
        style={getButtonStyle("linear")}
        onClick={() => onViewChange("linear")}
        onMouseOver={(e) => (e.currentTarget.style.opacity = hover.opacity)}
        onMouseOut={(e) => (e.currentTarget.style.opacity = 1)}
      >
        线性视图
      </button>
      <button
        style={getButtonStyle("circular")}
        onClick={() => onViewChange("circular")}
        onMouseOver={(e) => (e.currentTarget.style.opacity = hover.opacity)}
        onMouseOut={(e) => (e.currentTarget.style.opacity = 1)}
      >
        环形视图
      </button>
    </div>
  );
};

export default ViewModeToggle;
