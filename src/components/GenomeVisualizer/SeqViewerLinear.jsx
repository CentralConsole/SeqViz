/**
 * @file SeqViewerLinear.jsx
 * @description 线性序列查看器组件
 * 主要职责：
 * 1. 作为基因组可视化的包装组件
 * 2. 处理数据加载和预处理
 * 3. 提供序列查看的基本功能（如缩放、平移等）
 * 4. 管理查看器的尺寸和响应式布局
 * 5. 作为 GenomeVisualizer 的容器组件
 */

import React, { useEffect, useState, useRef } from "react";
import GenomeVisualizer from "./GenomeVisualizer";

/**
 * SeqViewerLinear组件 - 一个用于可视化基因组数据的可复用组件
 * @param {Object} props
 * @param {Object} props.data - 基因组数据对象
 * @param {Object} [props.style] - 可选的容器样式
 */
const SeqViewerLinear = ({ data, style = {} }) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [genomeData, setGenomeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  if (loading) {
    return <div>加载中...</div>;
  }

  if (error) {
    return <div>加载数据时出错: {error.message}</div>;
  }

  if (!genomeData) {
    return <div>未提供基因组数据</div>;
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        backgroundColor: "#121212",
        ...style,
      }}
    >
      <GenomeVisualizer
        data={genomeData}
        width={dimensions.width}
        height={dimensions.height}
      />
    </div>
  );
};

export default SeqViewerLinear;
