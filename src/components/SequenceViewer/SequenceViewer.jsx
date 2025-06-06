/**
 * @file SequenceViewer.jsx
 * @description 序列查看器组件
 * 主要职责：
 * 1. 作为序列可视化的包装组件
 * 2. 处理数据加载和预处理
 * 3. 管理查看器的尺寸和响应式布局
 * 4. 作为渲染器的容器组件
 */

import React, { useEffect, useState, useRef } from "react";
import LinearSequenceRenderer from "./LinearSequenceRenderer";
import CircularSequenceRenderer from "./CircularSequenceRenderer.jsx";
import ViewModeToggle from "./ViewModeToggle";

/**
 * SequenceViewer组件 - 一个用于可视化DNA/RNA序列的可复用组件
 * @param {Object} props
 * @param {Object} props.data - 序列数据对象
 * @param {Object} [props.style] - 可选的容器样式
 * @param {Function} [props.onFeatureClick] - 特征点击事件处理函数
 * @param {string} [props.viewMode="linear"] - 视图模式："linear" 或 "circular"
 */
const SequenceViewer = ({
  data,
  style = {},
  onFeatureClick,
  viewMode: initialViewMode = "linear",
}) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [genomeData, setGenomeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState(initialViewMode);

  // 更新尺寸的函数
  const updateDimensions = () => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });
    }
  };

  // 监听窗口大小变化
  useEffect(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // 监听数据变化
  useEffect(() => {
    if (typeof data === "string") {
      setLoading(true);
      fetch(data)
        .then((response) => response.json())
        .then((json) => {
          setGenomeData(json);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error loading genome data:", error);
          setError(error);
          setLoading(false);
        });
    } else {
      setGenomeData(data);
    }
  }, [data]);

  // 处理视图模式切换
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  if (loading) {
    return <div>加载中...</div>;
  }

  if (error) {
    return <div>加载数据时出错: {error.message}</div>;
  }

  if (!genomeData) {
    return <div>未提供序列数据</div>;
  }

  return (
    <div
      ref={containerRef}
      className="sequence-container"
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "auto",
        ...style,
      }}
    >
      <ViewModeToggle
        currentView={viewMode}
        onViewChange={handleViewModeChange}
      />
      {viewMode === "linear" ? (
        <LinearSequenceRenderer
          data={genomeData}
          width={dimensions.width}
          height={dimensions.height}
          onFeatureClick={onFeatureClick}
        />
      ) : (
        <CircularSequenceRenderer
          data={genomeData}
          width={dimensions.width}
          height={dimensions.height}
          onFeatureClick={onFeatureClick}
        />
      )}
    </div>
  );
};

export default SequenceViewer;
