/**
 * @file GenomeVisualizer.jsx
 * @description 基因组可视化主组件
 * 主要职责：
 * 1. 管理基因组数据的可视化渲染
 * 2. 处理特征（features）的布局和显示
 * 3. 实现交互功能（如悬停、缩放等）
 * 4. 协调子组件（如坐标轴、特征框、文本标注等）的渲染
 * 5. 处理性能优化（如防抖、懒加载等）
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";
import { CONFIG } from "../../config/config";
import { DataUtils, TextUtils, debounce } from "../../utils/utils";
import SimpleLayoutManager from "../../utils/SimpleLayoutManager";
import "./GenomeVisualizer.css";

const GenomeVisualizer = ({ data, width = 800, height = 600 }) => {
  const svgRef = useRef(null);
  const [dimensions, setDimensions] = useState(null);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRendered, setIsRendered] = useState(false);
  const lengthScaleRef = useRef(null);
  const annotationRefs = useRef({});
  const hoverTimeoutRef = useRef(null);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const layoutManager = useRef(
    new SimpleLayoutManager({
      rowHeight: CONFIG.dimensions.boxHeight,
      rowSpacing: CONFIG.dimensions.vSpace,
      textHeight: CONFIG.dimensions.fontSize,
      safetyMargin: CONFIG.dimensions.safetyMargin,
    })
  );

  // 添加 dimensions 变化时的配置更新
  useEffect(() => {
    if (dimensions) {
      layoutManager.current = new SimpleLayoutManager({
        rowHeight: dimensions.boxHeight,
        rowSpacing: dimensions.vSpace,
        textHeight: dimensions.fontSize,
        safetyMargin: CONFIG.dimensions.safetyMargin,
      });
    }
  }, [dimensions]);

  // 移除所有悬停内容
  const removeAllHoverContent = useCallback(() => {
    Object.keys(annotationRefs.current).forEach((key) => {
      if (key.startsWith("hover-")) {
        d3.select(annotationRefs.current[key]).remove();
        annotationRefs.current[key] = null;
      }
    });
  }, []);

  // 获取特征边界
  const getFeatureBounds = (locations) => {
    let minStart = Infinity;
    let maxEnd = -Infinity;

    locations.forEach((loc) => {
      const start = Number(DataUtils.cleanString(loc[0]));
      const end = Number(DataUtils.cleanString(loc[loc.length - 1]));
      minStart = Math.min(minStart, start);
      maxEnd = Math.max(maxEnd, end);
    });

    return [minStart, maxEnd];
  };

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

    // 计算字体大小和行高
    const fontSize =
      CONFIG.dimensions.unit * CONFIG.dimensions.fontSizeMultiplier;
    const textLineHeight = fontSize * 1.2; // 文字行高，使用字体大小的1.2倍
    const textSpaceHeight = textLineHeight * 3; // 3行文字的高度

    // 计算Box高度和垂直间距
    const boxHeight =
      CONFIG.dimensions.unit * CONFIG.dimensions.boxHeightMultiplier;
    const vSpace = CONFIG.dimensions.vSpace; // 使用配置中的固定值

    const newDimensions = {
      width,
      height,
      margin,
      contentWidth,
      contentHeight,
      unit: CONFIG.dimensions.unit,
      boxHeight,
      vSpace,
      fontSize,
      textLineHeight,
      textSpaceHeight,
      totalLength,
    };

    setDimensions(newDimensions);
    setFeatures(data.features || []);
    setLoading(false);
  }, [data, width, height]);

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
      // 清除之前的悬停内容
      removeAllHoverContent();

      // 设置当前悬停项
      setHoveredFeature(feature);

      // 获取特征边界
      const [start, end] = getFeatureBounds(feature.location);
      const width = lengthScaleRef.current(end) - lengthScaleRef.current(start);

      // 提取特征文本和特征组
      const featureGroup = d3.select(`#feature-${featureId}`);
      const text =
        feature.information.gene ||
        feature.information.product ||
        feature.information.note ||
        feature.type;

      // 高亮特征
      featureGroup.raise();
      featureGroup.selectAll(".box").style("stroke-width", 2);

      // 位置标记
      feature.location.forEach((loc) => {
        const position = Number(DataUtils.cleanString(loc[0]));
        featureGroup
          .append("line")
          .attr("class", "hover-location-mark")
          .attr("x1", lengthScaleRef.current(position))
          .attr("y1", dimensions.vSpace * row - dimensions.boxHeight)
          .attr("x2", lengthScaleRef.current(position))
          .attr("y2", dimensions.vSpace * row + dimensions.boxHeight)
          .style("stroke", "#000")
          .style("stroke-width", 1)
          .style("stroke-dasharray", "2,2");

        // 添加坐标文本
        featureGroup
          .append("text")
          .attr("class", "hover-location-text")
          .attr("x", lengthScaleRef.current(position))
          .attr("y", dimensions.vSpace * row - dimensions.boxHeight - 5)
          .text(DataUtils.formatNumber(position))
          .style("font-size", `${dimensions.fontSize * 0.8}px`)
          .style("font-family", CONFIG.fonts.primary.family)
          .style("text-anchor", "middle")
          .style("fill", "#000");
      });

      // 文本背景和完整文本
      if (text) {
        // 计算文本中心位置
        const textCenterX = lengthScaleRef.current(start) + width / 2;

        // 移除现有文本
        featureGroup.select(".annotation").remove();

        // 添加背景
        const textWidth = TextUtils.measureTextWidth(
          text,
          dimensions.fontSize,
          CONFIG.fonts.primary.family
        );

        // 创建文本背景
        featureGroup
          .append("rect")
          .attr("class", "hover-text-bg")
          .attr("x", textCenterX - textWidth / 2 - 5)
          .attr("y", dimensions.vSpace * row - dimensions.boxHeight / 2)
          .attr("width", textWidth + 10)
          .attr("height", dimensions.boxHeight)
          .style("fill", "white")
          .style("stroke", "#ddd")
          .style("opacity", 0.9);

        // 添加完整文本
        featureGroup
          .append("text")
          .attr("class", "hover-text annotation") // 添加annotation类，确保应用同样的字体
          .attr("x", textCenterX)
          .attr("y", dimensions.vSpace * row)
          .text(text)
          .style("font-size", `${dimensions.fontSize}px`)
          .style("font-family", CONFIG.fonts.primary.family)
          .style("text-anchor", "middle")
          .style("dominant-baseline", "middle")
          .style("user-select", "none");
      }
    },
    [dimensions, lengthScaleRef, removeAllHoverContent]
  );

  // 处理鼠标移出
  const handleMouseOut = useCallback((featureId, feature, row, event) => {
    // 阻止事件冒泡
    event.stopPropagation();

    // 直接移除悬停内容，不使用setTimeout
    if (annotationRefs.current[`hover-${featureId}`]) {
      d3.select(annotationRefs.current[`hover-${featureId}`]).remove();
      annotationRefs.current[`hover-${featureId}`] = null;
    }
  }, []);

  // 添加全局鼠标移动监听
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    // 监听SVG容器上的鼠标移动
    const handleSvgMouseMove = debounce((event) => {
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
    }, 50); // 使用50ms的防抖时间

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

  // 强制重绘
  const forceRedraw = useCallback(() => {
    if (!svgRef.current) return;

    // 触发重绘
    const svg = d3.select(svgRef.current);
    const currentWidth = svg.attr("width");
    const currentHeight = svg.attr("height");

    // 临时改变尺寸触发重绘
    svg.attr("width", currentWidth + 1);
    svg.attr("height", currentHeight + 1);

    // 立即恢复尺寸
    setTimeout(() => {
      svg.attr("width", currentWidth);
      svg.attr("height", currentHeight);
      setIsRendered(true);
    }, 0);
  }, []);

  // 渲染特征
  const renderFeatures = useCallback(
    (container) => {
      if (!container || !features.length) return;

      // 重置布局管理器
      layoutManager.current.reset();

      // 设置长度比例尺
      lengthScaleRef.current = d3
        .scaleLinear()
        .domain([0, dimensions.totalLength])
        .range([0, dimensions.contentWidth]);

      // 创建行组
      const rowGroups = new Map();

      // 1. 预分配行号和box高度（不渲染）
      features.forEach((feature, index) => {
        const [start, end] = getFeatureBounds(feature.location);
        const row = layoutManager.current.findAvailableRow(start, end);
        feature._row = row; // 记录分配的row，后续使用
        // 预计算所有box位置，保证行高和y坐标初始化
        feature.location.forEach((loc) => {
          const [boxStart, boxEnd] = [
            Number(DataUtils.cleanString(loc[0])),
            Number(DataUtils.cleanString(loc[loc.length - 1])),
          ];
          layoutManager.current.calculatePosition(
            lengthScaleRef.current(boxStart),
            lengthScaleRef.current(boxEnd),
            row,
            dimensions.boxHeight
          );
        });
      });
      // 2. 锁定box布局，渲染所有box和骨架线
      layoutManager.current.lockBoxLayout();
      features.forEach((feature, index) => {
        const featureId = `feature-${index}`;
        const row = feature._row;
        // 获取或创建行组
        let rowGroup = rowGroups.get(row);
        if (!rowGroup) {
          rowGroup = container.append("g").attr("class", `row-${row}`);
          rowGroups.set(row, rowGroup);
        }
        const featureGroup = rowGroup
          .append("g")
          .attr("class", "feature")
          .attr("id", featureId);
        // 渲染骨架线
        const [start, end] = getFeatureBounds(feature.location);
        if (feature.location.length > 1) {
          let lastEnd = start;
          const sortedLocations = [...feature.location].sort((a, b) => {
            return (
              Number(DataUtils.cleanString(a[0])) -
              Number(DataUtils.cleanString(b[0]))
            );
          });
          sortedLocations.forEach((loc) => {
            const boxStart = Number(DataUtils.cleanString(loc[0]));
            const boxEnd = Number(DataUtils.cleanString(loc[loc.length - 1]));
            if (boxStart > lastEnd) {
              const bonePosition = layoutManager.current.calculatePosition(
                lengthScaleRef.current(lastEnd),
                lengthScaleRef.current(boxStart),
                row,
                dimensions.boxHeight
              );
              featureGroup
                .append("line")
                .attr("class", `box bone ${feature.type}`)
                .attr("x1", bonePosition.x)
                .attr("y1", bonePosition.y + bonePosition.height / 2)
                .attr("x2", bonePosition.x + bonePosition.width)
                .attr("y2", bonePosition.y + bonePosition.height / 2)
                .style("stroke-width", bonePosition.height / 4)
                .style(
                  "stroke",
                  CONFIG.colors[feature.type] || CONFIG.colors.others
                );
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
          const position = layoutManager.current.calculatePosition(
            lengthScaleRef.current(boxStart),
            lengthScaleRef.current(boxEnd),
            row,
            dimensions.boxHeight
          );
          featureGroup
            .append("rect")
            .attr("class", `box ${feature.type}`)
            .attr("x", position.x)
            .attr("y", position.y)
            .attr("width", position.width)
            .attr("height", position.height)
            .style("fill", CONFIG.colors[feature.type] || CONFIG.colors.others)
            .style("stroke", "none");
        });
      });
      layoutManager.current.unlockBoxLayout();
      // 3. 渲染所有annotation
      features.forEach((feature, index) => {
        const row = feature._row;
        let rowGroup = rowGroups.get(row);
        if (!rowGroup) return;
        const featureGroup = rowGroup.select(`#feature-${index}`);
        feature.location.forEach((loc) => {
          const [boxStart, boxEnd] = [
            Number(DataUtils.cleanString(loc[0])),
            Number(DataUtils.cleanString(loc[loc.length - 1])),
          ];
          const position = layoutManager.current.calculatePosition(
            lengthScaleRef.current(boxStart),
            lengthScaleRef.current(boxEnd),
            row,
            dimensions.boxHeight
          );
          // 修正：优先显示gene、product、note，没有则显示type
          const text =
            feature.information.gene ||
            feature.information.product ||
            feature.information.note ||
            feature.type;
          if (text) {
            const charWidth = dimensions.fontSize * 0.6;
            const textWidth = text.length * charWidth;
            const availableWidth = position.width - 10;
            const isTruncated = textWidth > availableWidth;
            let displayText = text;
            if (isTruncated) {
              displayText = text;
            }
            const textPosition = layoutManager.current.calculateTextPosition(
              { ...position, row },
              displayText,
              isTruncated
            );
            featureGroup
              .append("text")
              .attr("class", `annotation ${isTruncated ? "truncated" : ""}`)
              .attr("x", textPosition.x)
              .attr("y", textPosition.y)
              .text(displayText)
              .style("font-family", CONFIG.fonts.primary.family)
              .style("font-size", `${dimensions.fontSize}px`)
              .style("dominant-baseline", "middle")
              .style("text-anchor", "middle")
              .style("pointer-events", "none");
          }
        });
      });
    },
    [features, dimensions]
  );

  // 计算内容实际高度
  const getContentHeight = () => {
    if (
      !layoutManager.current ||
      !layoutManager.current.rowYs ||
      !layoutManager.current.rowHeights
    )
      return dimensions?.height || height;
    const rowYs = Array.from(layoutManager.current.rowYs.values());
    const rowHeights = Array.from(layoutManager.current.rowHeights.values());
    if (!rowYs.length || !rowHeights.length)
      return dimensions?.height || height;
    const lastRowY = rowYs[rowYs.length - 1];
    const lastRowHeight = rowHeights[rowHeights.length - 1];
    return lastRowY + lastRowHeight + (dimensions?.margin?.bottom || 0);
  };

  // 渲染可视化
  useEffect(() => {
    if (
      !dimensions ||
      !features?.length ||
      loading ||
      error ||
      !lengthScaleRef.current
    ) {
      return;
    }

    // 确保SVG元素存在
    if (!svgRef.current) {
      return;
    }

    // 清理之前的内容
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    annotationRefs.current = {};

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
        font-family: ${CONFIG.fonts.primary.family};
      }
      .annotation {
        fill: #e0e0e0;
        font-size: ${dimensions.fontSize}px;
        font-family: ${CONFIG.fonts.primary.family};
      }
      .annotation-avoided {
        fill: #6bff7d;
      }
    `);

    // 添加顶部坐标轴
    const topAxis = d3
      .axisTop(lengthScaleRef.current)
      .tickFormat(d3.format(",d"))
      .ticks(10);

    container.append("g").attr("class", "top-axis").call(topAxis);

    // 渲染所有特征
    renderFeatures(container);

    // 标记渲染完成
    setIsRendered(true);

    // 解决浏览器渲染优化导致的SVG不可见问题
    requestAnimationFrame(() => {
      const svgElement = svgRef.current;
      if (!svgElement) return;
      const event = new Event("resize");
      window.dispatchEvent(event);
    });
  }, [
    dimensions,
    features,
    loading,
    error,
    handleMouseOver,
    handleMouseOut,
    removeAllHoverContent,
    renderFeatures,
  ]);

  // 添加窗口大小变化监听
  useEffect(() => {
    const handleResize = debounce(() => {
      if (isRendered) {
        forceRedraw();
      }
    }, 200);

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isRendered, forceRedraw]);

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error) {
    return <div className="error">错误: {error}</div>;
  }

  return (
    <div className="genome-visualizer">
      {!loading && !error && dimensions && (
        <svg
          ref={svgRef}
          width={dimensions.width || width}
          height={getContentHeight()}
          style={{
            fontFamily: CONFIG.fonts.primary.family,
            fontSize: `${dimensions.fontSize || 12}px`,
            display: "block",
            backgroundColor: "#121212",
          }}
        />
      )}
    </div>
  );
};

export default GenomeVisualizer;
