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
import { parseGenbankText } from "../ParseAndPreparation/parse-genbank-input/browser-genbank-parser";
import { annotateRestrictionSites } from "../ParseAndPreparation/restriction-sites.browser";
import "./SequenceViewer.css";

/**
 * GenBank数据处理器组件
 * 负责将GBK文本解析为JSON格式，并注释酶切位点
 * @param {string} gbkText - GenBank格式的文本
 * @returns {Object} 符合mito2.json格式的数据对象
 */
function processGenBankData(gbkText) {
  if (!gbkText || typeof gbkText !== "string") {
    throw new Error("Invalid GenBank text input");
  }

  // 解析GenBank文本
  const parsed = parseGenbankText(gbkText);

  // 构建符合mito2.json格式的数据对象
  const normalized = {
    locus: parsed.locus || {},
    definition: parsed.definition || "",
    accession: parsed.accession || "",
    version: parsed.version || "",
    dblink: parsed.dblink || "",
    keywords: parsed.keywords || "",
    source: parsed.source || "",
    reference: parsed.reference || "",
    comment: parsed.comment || "",
    features: parsed.features || [],
    origin: parsed.origin || "",
    res_site: parsed.res_site || [],
  };

  // 使用restriction-sites.browser.js注释酶切位点
  try {
    if (
      normalized.origin &&
      (!normalized.res_site || normalized.res_site.length === 0)
    ) {
      const topology = (normalized.locus?.topology || "").toLowerCase();
      const isCircular = topology.includes("circular");
      const sites = annotateRestrictionSites(normalized.origin, {
        topology: isCircular ? "circular" : "linear",
      });
      normalized.res_site = sites;
    }
  } catch (e) {
    // 如果注释失败，使用空数组
    console.warn("Failed to annotate restriction sites:", e);
    normalized.res_site = normalized.res_site || [];
  }

  return normalized;
}

/**
 * SequenceViewer组件 - 一个用于可视化DNA/RNA序列的可复用组件
 * @param {Object} props
 * @param {Object} props.data - 序列数据对象（推荐）
 * @param {Function} [props.loadData] - 懒加载数据的函数，返回 Promise<string> (GBK文本) 或 Promise<Object> (已解析的JSON)
 * @param {Object} [props.style] - 可选的容器样式
 * @param {Function} [props.onFeatureClick] - 特征点击事件处理函数
 * @param {string} [props.viewMode="linear"] - 视图模式："linear"、"circular" 或 "detailed"
 */
// 内部组件，管理选区状态
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
          return;
        }
        if (typeof loadData === "function") {
          console.log("SequenceViewer: 开始加载数据...");
          setLoading(true);
          const result = await loadData();
          if (!cancelled) {
            console.log("SequenceViewer: 数据加载完成", result);

            // 判断返回的是GBK文本还是已解析的JSON对象
            let processedData;
            if (typeof result === "string") {
              // 如果是字符串，当作GBK文本处理
              console.log("SequenceViewer: 检测到GBK文本，开始解析...");
              processedData = processGenBankData(result);
            } else if (result && typeof result === "object") {
              // 如果已经是对象，直接使用
              processedData = result;
            } else {
              throw new Error("Invalid data format from loadData");
            }

            setGenomeData(processedData || null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, loadData]);

  // Local file reader for GenBank input
  const handleFileChosen = async (file) => {
    if (!file) return;
    try {
      setLoading(true);
      setError(null);
      const text = await file.text();
      // 使用统一的处理函数
      const processedData = processGenBankData(text);
      setGenomeData(processedData);
      setLoading(false);
      // ensure layout after data load
      setTimeout(() => updateDimensions(), 50);
    } catch (e) {
      console.error("SequenceViewer: GenBank parse error", e);
      setError(e);
      setLoading(false);
    }
  };

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
    return (
      <div
        ref={containerRef}
        className="sv-sequence-container"
        style={{
          ...style,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ color: "#666", fontSize: 14 }}>
          Load a GenBank file (.gb/.gbk) to view
        </div>
        <input
          type="file"
          accept=".gb,.gbk,.genbank,.txt"
          onChange={(e) => handleFileChosen(e.target.files?.[0])}
          style={{ cursor: "pointer" }}
        />
      </div>
    );
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

// 外层组件
const SequenceViewer = (props) => {
  return <SequenceViewerInner {...props} />;
};

export default SequenceViewer;
