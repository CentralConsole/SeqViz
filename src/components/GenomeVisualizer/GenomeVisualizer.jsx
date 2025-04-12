import React, { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";
import { CONFIG } from "../../config/config";
import { DataUtils, LayoutUtils, TextUtils, debounce } from "../../utils/utils";
import "./GenomeVisualizer.css";

const GenomeVisualizer = ({ data, width = 800, height = 600 }) => {
  const svgRef = useRef(null);
  const [dimensions, setDimensions] = useState(null);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const occupiedRowsRef = useRef({});
  const lengthScaleRef = useRef(null);
  const annotationRefs = useRef({});
  const hoverTimeoutRef = useRef(null);

  // 初始化尺寸
  useEffect(() => {
    if (!data) return;

    const totalLength = data.locus ? parseInt(data.locus.split(/\s+/)[1]) : 0;

    const margin = {
      top: height * CONFIG.dimensions.margin.top,
      right: width * CONFIG.dimensions.margin.right,
      bottom: height * CONFIG.dimensions.margin.bottom,
      left: width * CONFIG.dimensions.margin.left,
    };

    const contentWidth = width - margin.left - margin.right;
    const contentHeight = height - margin.top - margin.bottom;

    setDimensions({
      width,
      height,
      margin,
      contentWidth,
      contentHeight,
      unit: CONFIG.dimensions.unit,
      boxHeight: CONFIG.dimensions.unit * CONFIG.dimensions.boxHeightMultiplier,
      vSpace: CONFIG.dimensions.unit * CONFIG.dimensions.vSpaceMultiplier,
      fontSize: CONFIG.dimensions.unit * CONFIG.dimensions.fontSizeMultiplier,
      totalLength,
    });
  }, [width, height, data]);

  // 处理数据
  useEffect(() => {
    if (!data || !data.features) return;

    try {
      setFeatures(data.features);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [data]);

  // 创建比例尺
  useEffect(() => {
    if (!dimensions) return;

    lengthScaleRef.current = d3
      .scaleLinear()
      .domain([0, dimensions.totalLength])
      .range([0, dimensions.contentWidth]);
  }, [dimensions]);

  // 处理鼠标悬停
  const handleMouseOver = useCallback(
    (featureId, feature, row, event) => {
      // 阻止事件冒泡
      event.stopPropagation();

      if (!annotationRefs.current[featureId]) return;

      // 清除之前的超时
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      // 如果已经有悬停内容，不重复创建
      if (annotationRefs.current[`hover-${featureId}`]) return;

      const [start] = LayoutUtils.getFeatureBounds(feature.location);
      const text =
        feature.information.gene ||
        feature.information.product ||
        feature.information.note ||
        feature.type;

      // 创建背景
      const textWidth = TextUtils.measureTextWidth(
        text,
        dimensions.fontSize,
        CONFIG.fonts.primary.family
      );

      // 获取SVG根元素
      const svgRoot = d3.select(svgRef.current);

      // 创建一个新的顶层组用于显示悬停内容
      const hoverGroup = svgRoot
        .append("g")
        .attr("class", "hover-content")
        .attr(
          "transform",
          `translate(${dimensions.margin.left},${dimensions.margin.top})`
        )
        .style("pointer-events", "none"); // 防止悬停内容接收鼠标事件

      // 添加背景到顶层组
      hoverGroup
        .append("rect")
        .attr("class", "annotation-bg")
        .attr("x", lengthScaleRef.current(start) - 5)
        .attr("y", dimensions.vSpace * row - dimensions.boxHeight / 2)
        .attr("width", textWidth + 10)
        .attr("height", dimensions.boxHeight)
        .style("fill", "rgba(50, 50, 50, 0.85)")
        .style("stroke", "#333")
        .style("stroke-width", 1)
        .style("pointer-events", "none"); // 防止背景接收鼠标事件

      // 添加文本到顶层组
      hoverGroup
        .append("text")
        .attr("class", "annotation")
        .attr("x", lengthScaleRef.current(start))
        .attr("y", dimensions.vSpace * row)
        .text(text)
        .style("dominant-baseline", "middle")
        .style("font-family", CONFIG.fonts.primary.family)
        .style("font-size", `${dimensions.fontSize}px`)
        .style("fill", "#FFFFFF")
        .style("pointer-events", "none"); // 防止文本接收鼠标事件

      // 存储引用以便后续移除
      annotationRefs.current[`hover-${featureId}`] = hoverGroup.node();
    },
    [dimensions]
  );

  // 处理鼠标移出
  const handleMouseOut = useCallback(
    (featureId, feature, row, event) => {
      // 阻止事件冒泡
      event.stopPropagation();

      if (!annotationRefs.current[featureId]) return;

      // 清除之前的超时
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      // 使用防抖处理鼠标移出
      hoverTimeoutRef.current = setTimeout(() => {
        // 移除顶层悬停内容
        if (annotationRefs.current[`hover-${featureId}`]) {
          d3.select(annotationRefs.current[`hover-${featureId}`]).remove();
          annotationRefs.current[`hover-${featureId}`] = null;
        }
      }, 100); // 增加防抖延迟到100ms
    },
    [dimensions]
  );

  // 移除所有悬停内容
  const removeAllHoverContent = useCallback(() => {
    // 查找并移除所有悬停内容
    Object.keys(annotationRefs.current).forEach((key) => {
      if (key.startsWith("hover-")) {
        d3.select(annotationRefs.current[key]).remove();
        annotationRefs.current[key] = null;
      }
    });
  }, []);

  // 添加全局鼠标移动监听
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    // 监听SVG容器上的鼠标移动
    const handleSvgMouseMove = (event) => {
      // 获取鼠标下的元素
      const targetElement = document.elementFromPoint(
        event.clientX,
        event.clientY
      );

      // 检查鼠标是否在特征元素上
      const isOverFeature =
        targetElement &&
        (targetElement.closest(".feature") ||
          (targetElement.parentElement &&
            targetElement.parentElement.classList.contains("feature")));

      // 如果鼠标不在特征上，移除所有悬停内容
      if (!isOverFeature) {
        removeAllHoverContent();
      }
    };

    // 添加监听器
    svg.on("mousemove", handleSvgMouseMove);

    // 清理函数
    return () => {
      svg.on("mousemove", null);
    };
  }, [removeAllHoverContent]);

  // 组件卸载或数据更新时清理所有悬停内容
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      removeAllHoverContent();
    };
  }, [removeAllHoverContent]);

  // 渲染可视化
  useEffect(() => {
    if (
      !dimensions ||
      !features.length ||
      loading ||
      error ||
      !lengthScaleRef.current
    )
      return;

    // 清理之前的内容
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    occupiedRowsRef.current = {};
    annotationRefs.current = {};

    // 确保移除之前的所有悬停内容
    removeAllHoverContent();

    // 创建主容器
    const container = svg
      .append("g")
      .attr(
        "transform",
        `translate(${dimensions.margin.left},${dimensions.margin.top})`
      );

    // 添加全局样式
    svg.append("style").text(`
      .feature { cursor: pointer; }
      .feature rect, .feature line, .feature text { cursor: pointer; }
      .hover-content, .hover-content * { pointer-events: none; }
      .top-axis path, .top-axis line {
        stroke: #666;
        stroke-width: 1;
      }
      .top-axis text {
        fill: #e0e0e0;
        font-size: ${dimensions.fontSize * 0.9}px;
      }
    `);

    // 添加顶部坐标轴
    const topAxis = d3
      .axisTop(lengthScaleRef.current)
      .tickFormat(d3.format(",d"))
      .ticks(10);

    container.append("g").attr("class", "top-axis").call(topAxis);

    // 渲染所有特征
    features.forEach((feature, index) => {
      const featureId = `feature-${index}`;
      const featureGroup = container
        .append("g")
        .attr("class", "feature")
        .attr("id", featureId);

      annotationRefs.current[featureId] = featureGroup.node();

      // 获取特征边界
      const [start, end] = LayoutUtils.getFeatureBounds(feature.location);

      // 找到可用的行
      const row = LayoutUtils.findAvailableRow(
        occupiedRowsRef.current,
        start,
        end,
        dimensions.vSpace
      );

      // 渲染骨架线 - 只在特征框之外的区域显示
      if (feature.location.length > 1) {
        // 特征有多个位置时才显示骨架线
        // 对每个特征框的间隙添加骨架线
        let lastEnd = start;

        // 按起始位置排序特征位置
        const sortedLocations = [...feature.location].sort((a, b) => {
          return (
            Number(DataUtils.cleanString(a[0])) -
            Number(DataUtils.cleanString(b[0]))
          );
        });

        sortedLocations.forEach((loc) => {
          const boxStart = Number(DataUtils.cleanString(loc[0]));
          const boxEnd = Number(DataUtils.cleanString(loc[loc.length - 1]));

          // 如果有间隙，添加骨架线
          if (boxStart > lastEnd) {
            featureGroup
              .append("line")
              .attr("class", `box bone ${feature.type}`)
              .attr("x1", lengthScaleRef.current(lastEnd))
              .attr("y1", 0)
              .attr("x2", lengthScaleRef.current(boxStart))
              .attr("y2", 0)
              .style("transform", `translateY(${dimensions.vSpace * row}px)`);
          }

          lastEnd = Math.max(lastEnd, boxEnd);
        });
      }

      // 渲染特征框
      feature.location.forEach((loc) => {
        const [boxStart, boxEnd] = [
          Number(DataUtils.cleanString(loc[0])),
          Number(DataUtils.cleanString(loc[loc.length - 1])),
        ];

        const width =
          lengthScaleRef.current(boxEnd) - lengthScaleRef.current(boxStart);
        const height = dimensions.boxHeight;

        featureGroup
          .append("rect")
          .attr("class", `box ${feature.type}`)
          .attr("x", lengthScaleRef.current(boxStart))
          .attr("y", dimensions.vSpace * row - height / 2)
          .attr("width", width)
          .attr("height", height)
          .style("fill", CONFIG.colors[feature.type] || CONFIG.colors.others)
          .style("stroke", "#222") // 添加深色边框
          .style("stroke-width", 1) // 设置边框宽度
          .style("opacity", 1); // 设置为完全不透明
      });

      // 将鼠标事件绑定到整个特征组，而不是单个框
      featureGroup
        .on("mouseenter", (event) =>
          handleMouseOver(featureId, feature, row, event)
        )
        .on("mouseleave", (event) =>
          handleMouseOut(featureId, feature, row, event)
        );

      // 渲染注释
      const text =
        feature.information.gene ||
        feature.information.product ||
        feature.information.note ||
        feature.type;

      const truncatedText = TextUtils.truncateText(
        text,
        lengthScaleRef.current(end) - lengthScaleRef.current(start),
        dimensions.fontSize,
        CONFIG.fonts.primary.family
      );

      // 删除文本背景，只在鼠标悬停时显示

      featureGroup
        .append("text")
        .attr("class", "annotation")
        .attr("x", lengthScaleRef.current(start))
        .attr("y", dimensions.vSpace * row)
        .text(truncatedText)
        .style("dominant-baseline", "middle")
        .style("user-select", "none"); // 防止文本被选中

      // 更新占用行
      if (!occupiedRowsRef.current[row]) {
        occupiedRowsRef.current[row] = [];
      }
      occupiedRowsRef.current[row].push([start, end]);
    });
  }, [
    dimensions,
    features,
    loading,
    error,
    handleMouseOver,
    handleMouseOut,
    removeAllHoverContent,
  ]);

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error) {
    return <div className="error">错误: {error}</div>;
  }

  return (
    <div className="genome-visualizer">
      <svg
        ref={svgRef}
        width={dimensions?.width || width}
        height={dimensions?.height || height}
        style={{
          fontFamily: CONFIG.fonts.primary.family,
          fontSize: `${dimensions?.fontSize || 12}px`,
        }}
      />
    </div>
  );
};

export default GenomeVisualizer;
