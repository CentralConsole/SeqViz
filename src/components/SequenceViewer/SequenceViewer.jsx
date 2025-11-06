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
import DetailedSequenceViewer from "./DetailedSequenceRenderer.jsx";
import ViewModeToggle from "./ViewModeToggle";
import MetadataPanel from "./MetadataPanel.jsx";
import {
  SelectionProvider,
  useSelection,
} from "../../contexts/SelectionContext";
import "./SequenceViewer.css";

/**
 * SequenceViewer组件 - 一个用于可视化DNA/RNA序列的可复用组件
 * @param {Object} props
 * @param {Object} props.data - 序列数据对象（推荐）
 * @param {Function} [props.loadData] - 懒加载数据的函数，返回 Promise<Object>
 * @param {Object} [props.style] - 可选的容器样式
 * @param {Function} [props.onFeatureClick] - 特征点击事件处理函数
 * @param {string} [props.viewMode="linear"] - 视图模式："linear"、"circular" 或 "detailed"
 */
// 内部组件，使用SelectionContext
const SequenceViewerInner = ({
  data,
  loadData,
  style = {},
  onFeatureClick,
  viewMode: initialViewMode = "linear",
}) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [genomeData, setGenomeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [showMeta, setShowMeta] = useState(false);

  // 使用SelectionContext
  const { setSequenceLength } = useSelection();

  // 更新尺寸的函数
  const updateDimensions = () => {
    if (containerRef.current) {
      // 使用clientWidth和clientHeight
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      console.log("SequenceViewer: 更新尺寸", {
        width,
        height,
        clientWidth: containerRef.current.clientWidth,
        clientHeight: containerRef.current.clientHeight,
        offsetWidth: containerRef.current.offsetWidth,
        offsetHeight: containerRef.current.offsetHeight,
        getBoundingClientRect: containerRef.current.getBoundingClientRect(),
      });
      setDimensions({ width, height });
    }
  };

  useEffect(() => {
    updateDimensions();

    window.addEventListener("resize", updateDimensions);

    return () => {
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (data) {
          console.log("SequenceViewer: 使用传入的data", data);
          setGenomeData(data);
          // 设置序列长度到SelectionContext
          if (data.locus?.sequenceLength) {
            setSequenceLength(data.locus.sequenceLength);
          }
          return;
        }
        if (typeof loadData === "function") {
          console.log("SequenceViewer: 开始加载数据...");
          setLoading(true);
          const result = await loadData();
          if (!cancelled) {
            console.log("SequenceViewer: 数据加载完成", result);
            setGenomeData(result || null);
            // 设置序列长度到SelectionContext
            if (result?.locus?.sequenceLength) {
              setSequenceLength(result.locus.sequenceLength);
            }
            setLoading(false);
            // 数据加载完成后，强制更新尺寸以确保渲染器能正确渲染
            setTimeout(() => {
              updateDimensions();
            }, 100);
          }
          return;
        }
        setGenomeData(null);
      } catch (e) {
        if (!cancelled) {
          console.error("SequenceViewer: 数据加载失败", e);
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

  // 确保有有效的尺寸才渲染
  if (dimensions.width <= 0 || dimensions.height <= 0) {
    console.log("SequenceViewer: 等待有效尺寸", {
      dimensions,
      hasContainerRef: !!containerRef.current,
      containerRect: containerRef.current
        ? containerRef.current.getBoundingClientRect()
        : null,
    });
    return <div>Loading...</div>;
  }

  return (
    <div
      ref={containerRef}
      className="sv-sequence-container"
      style={{
        ...style,
      }}
    >
      <ViewModeToggle
        currentView={viewMode}
        onViewChange={handleViewModeChange}
      />
      {/* Info button */}
      <button
        className={`sv-info-button ${showMeta ? "active" : ""}`}
        title="Toggle Info (Press 'i')"
        onClick={toggleMeta}
      >
        &#xf449;
      </button>
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
      {/* 调试信息 */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          background: "rgba(0,0,0,0.8)",
          color: "white",
          padding: "5px",
          fontSize: "12px",
          zIndex: 9999,
        }}
      >
        尺寸: {dimensions.width} x {dimensions.height}
      </div>
    </div>
  );
};

// 外层组件，提供SelectionProvider
const SequenceViewer = (props) => {
  return (
    <SelectionProvider>
      <SequenceViewerInner {...props} />
    </SelectionProvider>
  );
};

export default SequenceViewer;
