/**
 * @file SequenceViewer.jsx
 * @description 序列查看器组件
 * 主要职责：
 * 1. 作为序列可视化的包装组件
 * 2. 处理数据预处理（数据由外部传入）
 * 3. 管理查看器的尺寸和响应式布局
 * 4. 作为渲染器的容器组件
 */

import React, { useEffect, useState, useRef } from "react";
import LinearSequenceRenderer from "./LinearSequenceRenderer";
import CircularSequenceRenderer from "./CircularSequenceRenderer.jsx";
import DetailedSequenceViewer from "./DetailedSequenceViewer.jsx";
import ViewModeToggle from "./ViewModeToggle";
import MetadataPanel from "./MetadataPanel.jsx";
import { CONFIG } from "../../config/config";

/**
 * SequenceViewer组件 - 一个用于可视化DNA/RNA序列的可复用组件
 * @param {Object} props
 * @param {Object} props.data - 序列数据对象（推荐）
 * @param {Function} [props.loadData] - 懒加载数据的函数，返回 Promise<Object>
 * @param {Object} [props.style] - 可选的容器样式
 * @param {Function} [props.onFeatureClick] - 特征点击事件处理函数
 * @param {string} [props.viewMode="linear"] - 视图模式："linear"、"circular" 或 "detailed"
 */
const SequenceViewer = ({
  data,
  loadData,
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
  const [showMeta, setShowMeta] = useState(false);

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

    // 添加初始化渲染机制
    const initRender = () => {
      updateDimensions();
      // 使用 requestAnimationFrame 确保在下一帧渲染
      requestAnimationFrame(() => {
        updateDimensions();
        // 再次触发以确保尺寸计算正确
        setTimeout(updateDimensions, 100);
      });
    };

    // 组件挂载后立即触发初始化渲染
    initRender();

    return () => {
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  // 监听数据变化（仅通过对象或回调获取，不自行发起请求）
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (data) {
          setGenomeData(data);
          return;
        }
        if (typeof loadData === "function") {
          setLoading(true);
          const result = await loadData();
          if (!cancelled) {
            setGenomeData(result || null);
            setLoading(false);
          }
          return;
        }
        setGenomeData(null);
      } catch (e) {
        if (!cancelled) {
          setError(e);
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [data, loadData]);

  // 处理视图模式切换
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  const toggleMeta = () => setShowMeta((v) => !v);

  // 添加键盘快捷键监听
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === "i" || event.key === "I") {
        event.preventDefault();
        toggleMeta();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, []);

  if (loading) {
    return <div>加载中...</div>;
  }

  if (error) {
    return <div>加载数据时出错: {error.message}</div>;
  }

  if (!genomeData) {
    return <div>No sequence data provided</div>;
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
      {/* Info button with ViewModeToggle styling */}
      <div style={{ position: "absolute", top: 20, left: 20, zIndex: 1000 }}>
        <button
          style={{
            ...CONFIG.viewModeToggle.button,
            ...(showMeta
              ? CONFIG.viewModeToggle.active
              : CONFIG.viewModeToggle.inactive),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Toggle Info (Press 'i')"
          onClick={toggleMeta}
          onMouseOver={(e) =>
            (e.currentTarget.style.opacity =
              CONFIG.viewModeToggle.hover.opacity)
          }
          onMouseOut={(e) => (e.currentTarget.style.opacity = 1)}
        >
          &#xf449;
        </button>
      </div>
      {showMeta && <MetadataPanel data={genomeData} />}
      {viewMode === "linear" ? (
        <LinearSequenceRenderer
          data={genomeData}
          width={dimensions.width}
          height={dimensions.height}
          onFeatureClick={onFeatureClick}
          hideInlineMeta={true}
        />
      ) : viewMode === "circular" ? (
        <CircularSequenceRenderer
          data={genomeData}
          width={dimensions.width}
          height={dimensions.height}
          onFeatureClick={onFeatureClick}
          hideInlineMeta={true}
        />
      ) : (
        <DetailedSequenceViewer
          data={genomeData}
          width={dimensions.width}
          height={dimensions.height}
          onFeatureClick={onFeatureClick}
          hideInlineMeta={true}
        />
      )}
    </div>
  );
};

export default SequenceViewer;
