/**
 * @file LinearSequenceRenderer.jsx
 * @description 直线序列可视化渲染组件
 * 主要职责：
 * 1. 管理序列数据的可视化渲染
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
import "./LinearSequenceRenderer.css";

/**
 * 直线序列渲染组件
 * @param {Object} props - 组件属性
 * @param {Object} props.data - 序列数据对象
 * @param {number} props.width - 渲染区域宽度
 * @param {number} props.height - 渲染区域高度
 * @param {Function} props.onFeatureClick - 特征点击事件处理函数
 */
const LinearSequenceRenderer = ({
  data,
  width = 800,
  height = 600,
  onFeatureClick,
}) => {
  // SVG容器引用
  const svgRef = useRef(null);
  // 渲染区域尺寸状态
  const [dimensions, setDimensions] = useState(null);
  // 特征数据状态
  const [features, setFeatures] = useState([]);
  // 加载状态
  const [loading, setLoading] = useState(true);
  // 错误状态
  const [error, setError] = useState(null);
  // 渲染完成状态
  const [isRendered, setIsRendered] = useState(false);
  // 长度比例尺引用
  const lengthScaleRef = useRef(null);
  // 标注元素引用集合
  const annotationRefs = useRef({});
  // 悬停超时引用
  const hoverTimeoutRef = useRef(null);
  // 当前悬停的特征
  const [hoveredFeature, setHoveredFeature] = useState(null);
  // 布局管理器实例
  const layoutManager = useRef(
    new SimpleLayoutManager({
      rowHeight: CONFIG.dimensions.boxHeight,
      rowSpacing: CONFIG.dimensions.vSpace,
      textHeight: CONFIG.dimensions.fontSize,
      safetyMargin: CONFIG.dimensions.safetyMargin,
    })
  );
  // 初始宽度引用
  const initialWidthRef = useRef(null);
  // 新增：用于动态设置SVG宽度和高度
  const [svgWidth, setSvgWidth] = useState(800);
  const [svgHeight, setSvgHeight] = useState(400);
  // 只在首次加载时记录窗口宽度的比例（从CONFIG读取）
  const initialSvgWidthRef = useRef(null);

  /**
   * 更新布局管理器配置
   * 当尺寸变化时，重新创建布局管理器实例
   */
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

  /**
   * 移除所有悬停内容
   * 清理所有悬停相关的DOM元素
   */
  const removeAllHoverContent = useCallback(() => {
    Object.keys(annotationRefs.current).forEach((key) => {
      if (key.startsWith("hover-")) {
        d3.select(annotationRefs.current[key]).remove();
        annotationRefs.current[key] = null;
      }
    });
  }, []);

  /**
   * 获取特征边界
   * @param {Array} locations - 特征位置数组
   * @returns {Array} [最小起始位置, 最大结束位置]
   */
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

  /**
   * 初始化渲染尺寸
   * 计算并设置渲染区域的各种尺寸参数
   */
  useEffect(() => {
    if (!data) return;

    const totalLength = data.locus ? parseInt(data.locus.split(/\s+/)[1]) : 0;

    // 如果还没有初始宽度，则设置当前宽度为初始宽度
    if (!initialWidthRef.current) {
      initialWidthRef.current = width;
    }

    const margin = {
      top: height * CONFIG.dimensions.margin.top,
      right: initialWidthRef.current * CONFIG.dimensions.margin.right,
      bottom: height * CONFIG.dimensions.margin.bottom,
      left: initialWidthRef.current * CONFIG.dimensions.margin.left,
    };

    const contentWidth = initialWidthRef.current - margin.left - margin.right;
    const contentHeight = height - margin.top - margin.bottom;

    // 计算字体大小和行高
    const fontSize =
      CONFIG.dimensions.unit * CONFIG.dimensions.fontSizeMultiplier;
    const textLineHeight = fontSize * 1.2;
    const textSpaceHeight = textLineHeight * 3;

    // 计算Box高度和垂直间距
    const boxHeight =
      CONFIG.dimensions.unit * CONFIG.dimensions.boxHeightMultiplier;
    const vSpace = CONFIG.dimensions.vSpace;

    const newDimensions = {
      width: initialWidthRef.current,
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

  /**
   * 创建长度比例尺
   * 用于将序列位置映射到屏幕坐标
   */
  useEffect(() => {
    if (!dimensions) return;

    lengthScaleRef.current = d3
      .scaleLinear()
      .domain([0, dimensions.totalLength])
      .range([0, dimensions.contentWidth]);
  }, [dimensions]);

  /**
   * 处理鼠标悬停事件
   * @param {string} featureId - 特征ID
   * @param {Object} feature - 特征对象
   * @param {number} row - 特征所在行
   * @param {Event} event - 鼠标事件
   */
  const handleMouseOver = useCallback(
    (featureId, feature, row, event) => {
      removeAllHoverContent();
      setHoveredFeature(feature);

      const [start, end] = getFeatureBounds(feature.location);
      const width = lengthScaleRef.current(end) - lengthScaleRef.current(start);

      const featureGroup = d3.select(`#feature-${featureId}`);
      const text =
        feature.information.gene ||
        feature.information.product ||
        feature.information.note ||
        feature.type;

      featureGroup.raise();
      featureGroup.selectAll(".box").style("stroke-width", 2);

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

      if (text) {
        const textCenterX = lengthScaleRef.current(start) + width / 2;
        featureGroup.select(".annotation").remove();

        const textWidth = TextUtils.measureTextWidth(
          text,
          dimensions.fontSize,
          CONFIG.fonts.primary.family
        );

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

        featureGroup
          .append("text")
          .attr("class", "hover-text annotation")
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

  /**
   * 处理鼠标移出事件
   * @param {string} featureId - 特征ID
   * @param {Object} feature - 特征对象
   * @param {number} row - 特征所在行
   * @param {Event} event - 鼠标事件
   */
  const handleMouseOut = useCallback((featureId, feature, row, event) => {
    if (event && event.stopPropagation) {
      event.stopPropagation();
    }

    if (annotationRefs.current[`hover-${featureId}`]) {
      d3.select(annotationRefs.current[`hover-${featureId}`]).remove();
      annotationRefs.current[`hover-${featureId}`] = null;
    }
  }, []);

  /**
   * 添加全局鼠标移动监听
   * 用于处理鼠标在SVG容器上的移动事件
   */
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    const handleSvgMouseMove = debounce((event) => {
      const targetElement = document.elementFromPoint(
        event.clientX,
        event.clientY
      );

      const isOverFeature =
        targetElement &&
        (targetElement.closest(".feature") ||
          (targetElement.parentElement &&
            targetElement.parentElement.classList.contains("feature")));

      if (!isOverFeature) {
        removeAllHoverContent();
      }
    }, 50);

    svg.on("mousemove", handleSvgMouseMove);

    return () => {
      svg.on("mousemove", null);
    };
  }, [removeAllHoverContent]);

  /**
   * 组件卸载或数据更新时清理
   * 清理所有悬停内容和超时引用
   */
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      removeAllHoverContent();
    };
  }, [removeAllHoverContent]);

  /**
   * 强制重绘
   * 通过临时改变SVG尺寸触发重绘
   */
  const forceRedraw = useCallback(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const currentWidth = svg.attr("width");
    const currentHeight = svg.attr("height");

    svg.attr("width", currentWidth + 1);
    svg.attr("height", currentHeight + 1);

    setTimeout(() => {
      svg.attr("width", currentWidth);
      svg.attr("height", currentHeight);
      setIsRendered(true);
    }, 0);
  }, []);

  /**
   * 处理特征点击事件
   * @param {Object} feature - 被点击的特征
   * @param {Event} event - 点击事件
   */
  const handleFeatureClick = useCallback(
    (feature, event) => {
      const featureClickEvent = new CustomEvent("genomeFeatureClick", {
        detail: {
          feature: feature,
          timestamp: new Date().getTime(),
        },
      });
      window.dispatchEvent(featureClickEvent);

      if (onFeatureClick) {
        onFeatureClick(feature);
      }
    },
    [onFeatureClick]
  );

  /**
   * 渲染特征
   * @param {Object} container - D3容器对象
   */
  const renderFeatures = useCallback(
    (container) => {
      if (!container || !features.length) return;

      layoutManager.current.reset();

      lengthScaleRef.current = d3
        .scaleLinear()
        .domain([0, dimensions.totalLength])
        .range([0, dimensions.contentWidth]);

      const rowGroups = new Map();

      // 预分配行号和box高度
      features.forEach((feature, index) => {
        const [start, end] = getFeatureBounds(feature.location);
        const row = layoutManager.current.findAvailableRow(start, end);
        feature._row = row;
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

      // 锁定box布局，渲染所有box和骨架线
      layoutManager.current.lockBoxLayout();
      features.forEach((feature, index) => {
        const featureId = `feature-${index}`;
        const row = feature._row;
        let rowGroup = rowGroups.get(row);
        if (!rowGroup) {
          rowGroup = container.append("g").attr("class", `row-${row}`);
          rowGroups.set(row, rowGroup);
        }
        const featureGroup = rowGroup
          .append("g")
          .attr("class", "feature")
          .attr("id", featureId)
          .on("mouseover", (event) =>
            handleMouseOver(featureId, feature, row, event)
          )
          .on("mouseout", () => handleMouseOut(featureId))
          .on("click", (event) => handleFeatureClick(feature, event));

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

      // 渲染所有annotation
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

  /**
   * 计算内容实际高度
   * @returns {number} 内容区域的实际高度
   */
  const getContentHeight = () => {
    if (!features.length || !dimensions) return dimensions?.height || height;
    // 检查所有特征的 _row 分配
    let maxRow = 0;
    features.forEach((f, idx) => {
      if (typeof f._row === "number") {
        if (f._row > maxRow) maxRow = f._row;
        console.log(`feature[${idx}]._row =`, f._row);
      } else {
        console.log(`feature[${idx}]._row 未分配`);
      }
    });
    // 行高和行间距
    const rowHeight = dimensions.boxHeight;
    const rowSpacing = dimensions.vSpace;
    // 总高度 = margin.top + (maxRow+1)*rowSpacing + boxHeight + margin.bottom
    const totalHeight =
      dimensions.margin.top +
      (maxRow + 1) * rowSpacing +
      rowHeight +
      (dimensions.margin.bottom || 0);
    console.log(
      "features.length",
      features.length,
      "maxRow",
      maxRow,
      "totalHeight",
      totalHeight
    );
    return totalHeight;
  };

  /**
   * 主渲染效果
   * 处理SVG的创建、样式设置和特征渲染
   */
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

    if (!svgRef.current) {
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    annotationRefs.current = {};

    const container = svg
      .append("g")
      .attr(
        "transform",
        `translate(${dimensions.margin.left},${dimensions.margin.top})`
      );

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
        font-size: ${CONFIG.styles.annotation.fontSize}px;
        font-family: ${CONFIG.fonts.primary.family};
      }
      .annotation {
        fill: #e0e0e0;
        font-size: ${CONFIG.styles.annotation.fontSize}px;
        font-family: ${CONFIG.fonts.primary.family};
      }
      .annotation-avoided {
        fill: #6bff7d;
      }
    `);

    const topAxis = d3
      .axisTop(lengthScaleRef.current)
      .tickFormat(d3.format(",d"))
      .ticks(10);

    container.append("g").attr("class", "top-axis").call(topAxis);

    renderFeatures(container);

    setIsRendered(true);

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

  /**
   * 窗口大小变化监听
   * 处理窗口大小变化时的重绘
   */
  useEffect(() => {
    const handleResize = debounce(() => {
      if (isRendered) {
        forceRedraw();
      }
    }, 200);

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isRendered, forceRedraw]);

  // 调试输出：组件渲染时打印 features 和 dimensions
  useEffect(() => {
    console.log("LinearSequenceRenderer mounted");
    console.log("features.length", features.length, "dimensions", dimensions);
  }, [features, dimensions]);

  useEffect(() => {
    if (svgRef.current) {
      setTimeout(() => {
        try {
          const bbox = svgRef.current.getBBox();
          setSvgWidth(bbox.width * CONFIG.svgWidthPaddingRatio); // 用配置的宽度padding比例
          setSvgHeight(bbox.height * CONFIG.svgHeightPaddingRatio); // 用配置的高度padding比例
        } catch (e) {
          // getBBox 可能在SVG为空时抛错
        }
      }, 100);
    }
  }, [features, dimensions]);

  // 只在首次加载时记录窗口宽度的比例（从CONFIG读取）
  if (initialSvgWidthRef.current === null) {
    initialSvgWidthRef.current = Math.round(
      window.innerWidth * CONFIG.svgWidthRatio
    );
  }

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error) {
    return <div className="error">错误: {error}</div>;
  }

  return (
    <div
      className="sequence-renderer"
      style={{
        height: "100vh",
        overflowY: "auto",
        overflowX: "auto",
        position: "relative",
        background: "#121212",
      }}
    >
      <svg
        ref={svgRef}
        width={svgWidth}
        height={svgHeight}
        style={{
          fontFamily: CONFIG.fonts.primary.family,
          fontSize: `${CONFIG.styles.annotation.fontSize}px`,
          display: "block",
          backgroundColor: "#121212",
        }}
      />
    </div>
  );
};

export default LinearSequenceRenderer;
