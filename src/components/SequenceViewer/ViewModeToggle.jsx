import React from "react";

/**
 * ViewModeToggle组件 - 用于切换序列视图模式
 * @param {Object} props
 * @param {string} props.currentView - 当前视图模式
 * @param {Function} props.onViewChange - 模式切换回调函数
 */
const ViewModeToggle = ({ currentView, onViewChange }) => {
  return (
    <div className="sv-view-mode-toggle">
      <button
        className={`sv-view-mode-button ${
          currentView === "linear" ? "active" : ""
        }`}
        onClick={() => onViewChange("linear")}
        title="Linear View"
      >
        &#x2550;
      </button>
      <button
        className={`sv-view-mode-button ${
          currentView === "circular" ? "active" : ""
        }`}
        onClick={() => onViewChange("circular")}
        title="Circular View"
      >
        &#xf0e95;
      </button>
      <button
        className={`sv-view-mode-button ${
          currentView === "detailed" ? "active" : ""
        }`}
        onClick={() => onViewChange("detailed")}
        title="Detailed View"
      >
        &#xe64e;
      </button>
    </div>
  );
};

export default ViewModeToggle;
