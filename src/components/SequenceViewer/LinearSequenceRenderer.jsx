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
  const svgRef = useRef(null);
  const { sequenceViewer } = CONFIG;
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
  // 布局状态
  const layoutState = useRef({
    rowBoxInfo: new Map(),
    rowYs: new Map(),
    rowHeights: new Map(),
    lockedRowYs: new Map(),
    boxLayoutLocked: false,
  });
  // 初始宽度引用
  const initialWidthRef = useRef(null);
  // 新增：用于动态设置SVG宽度和高度
  const [svgWidth, setSvgWidth] = useState(800);
  const [svgHeight, setSvgHeight] = useState(400);
  // 只在首次加载时记录窗口宽度的比例（从CONFIG读取）
  const initialSvgWidthRef = useRef(null);

  // 计算所有行的y坐标
  const recalcRowYs = useCallback(() => {
    let y = CONFIG.dimensions.vSpace * 2;
    for (let row = 0; layoutState.current.rowHeights.has(row); row++) {
      layoutState.current.rowYs.set(row, y);
      y +=
        layoutState.current.rowHeights.get(row) +
        CONFIG.linearLayout.rowSpacing;
    }
    // 如果未锁定，更新lockedRowYs
    if (!layoutState.current.boxLayoutLocked) {
      layoutState.current.lockedRowYs = new Map(layoutState.current.rowYs);
    }
  }, []);

  // 计算元素位置
  const calculatePosition = useCallback(
    (start, end, row, rowHeight) => {
      // 更新行高
      const prevBoxInfo = layoutState.current.rowBoxInfo.get(row) || {
        height: 0,
      };
      const boxHeight = Math.max(prevBoxInfo.height, rowHeight);
      layoutState.current.rowBoxInfo.set(row, { height: boxHeight });

      // 计算最小行高
      const minRowHeight =
        boxHeight +
        CONFIG.linearLayout.minAnnotationHeight +
        CONFIG.linearLayout.textSpacing;
      const prevRowHeight = layoutState.current.rowHeights.get(row) || 0;

      // 更新行高
      if (
        !layoutState.current.rowHeights.has(row) ||
        prevRowHeight < minRowHeight
      ) {
        layoutState.current.rowHeights.set(row, minRowHeight);
        recalcRowYs();
      }

      // 使用锁定的y坐标（如果已锁定）
      const y = layoutState.current.boxLayoutLocked
        ? layoutState.current.lockedRowYs.get(row) || 0
        : layoutState.current.rowYs.get(row) || 0;

      return {
        x: start,
        y: y,
        width: end - start,
        height: boxHeight,
        row: row,
      };
    },
    [recalcRowYs]
  );

  // 重置布局
  const resetLayout = useCallback(() => {
    layoutState.current.rowBoxInfo.clear();
    layoutState.current.rowYs.clear();
    layoutState.current.rowHeights.clear();
    layoutState.current.lockedRowYs.clear();
    layoutState.current.boxLayoutLocked = false;
  }, []);

  // 按跨度贪心分配行号
  const assignRowsBySpan = useCallback((items, getStart, getEnd) => {
    // 1. 按跨度降序排序
    const sorted = [...items].sort(
      (a, b) => getEnd(b) - getStart(b) - (getEnd(a) - getStart(a))
    );
    const rows = []; // 每行存放已分配的区间

    sorted.forEach((item) => {
      let assigned = false;
      for (let row = 0; ; row++) {
        if (!rows[row]) rows[row] = [];
        // 检查该行是否有重叠
        const overlap = rows[row].some(
          (other) =>
            !(getEnd(item) < getStart(other) || getStart(item) > getEnd(other))
        );
        if (!overlap) {
          item._row = row;
          rows[row].push(item);
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        item._row = rows.length;
        rows.push([item]);
      }
    });
    return sorted;
  }, []);

  /**
   * 更新布局管理器配置
   * 当尺寸变化时，重新创建布局管理器实例
   */
  useEffect(() => {
    if (dimensions) {
      layoutState.current = {
        rowBoxInfo: new Map(),
        rowYs: new Map(),
        rowHeights: new Map(),
        lockedRowYs: new Map(),
        boxLayoutLocked: false,
      };
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
      // 如果是单个坐标，则结束位置等于起始位置
      const end =
        loc.length > 1
          ? Number(DataUtils.cleanString(loc[loc.length - 1]))
          : start;
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
        feature.information.gene || feature.information.product || feature.type;

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

      resetLayout();

      lengthScaleRef.current = d3
        .scaleLinear()
        .domain([0, dimensions.totalLength])
        .range([0, dimensions.contentWidth]);

      // 1. 按跨度贪心分配行号
      assignRowsBySpan(
        features,
        (f) => {
          // 取所有location的最小start
          return Math.min(
            ...f.location.map((loc) => Number(DataUtils.cleanString(loc[0])))
          );
        },
        (f) => {
          // 取所有location的最大end
          return Math.max(
            ...f.location.map((loc) => {
              const start = Number(DataUtils.cleanString(loc[0]));
              // 如果是单个坐标，则结束位置等于起始位置
              return loc.length > 1
                ? Number(DataUtils.cleanString(loc[loc.length - 1]))
                : start;
            })
          );
        }
      );

      // 2. 按行分组特征
      const featuresByRow = new Map();
      features.forEach((feature) => {
        const row = feature._row;
        if (!featuresByRow.has(row)) {
          featuresByRow.set(row, []);
        }
        featuresByRow.get(row).push(feature);
      });

      // 3. 逐行渲染
      const maxRow = Math.max(...features.map((f) => f._row));
      let currentRowY = CONFIG.dimensions.vSpace * 2; // 初始Y位置

      for (let row = 0; row <= maxRow; row++) {
        const rowFeatures = featuresByRow.get(row) || [];

        // 创建当前行的组
        const rowGroup = container.append("g").attr("class", `row-${row}`);

        // 临时设置当前行的Y坐标
        layoutState.current.rowYs.set(row, currentRowY);
        layoutState.current.rowHeights.set(
          row,
          CONFIG.linearLayout.minAnnotationHeight
        );

        // 渲染当前行的所有特征
        rowFeatures.forEach((feature, index) => {
          const featureId = `feature-${row}-${index}`;
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

          // 绘制骨架线（如果有多个location）
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
              const boxEnd =
                loc.length > 1
                  ? Number(DataUtils.cleanString(loc[loc.length - 1]))
                  : boxStart;
              if (boxStart > lastEnd) {
                const bonePosition = calculatePosition(
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
                    (CONFIG.colors[feature.type] || CONFIG.colors.others).stroke
                  )
                  .style("stroke-dasharray", CONFIG.styles.bone.strokeDasharray)
                  .style("stroke-linecap", CONFIG.styles.bone.strokeLinecap)
                  .style("opacity", CONFIG.styles.bone.opacity);
              }
              lastEnd = Math.max(lastEnd, boxEnd);
            });
          }

          // 绘制特征框
          feature.location.forEach((loc) => {
            const start = Number(DataUtils.cleanString(loc[0]));
            const end =
              loc.length > 1
                ? Number(DataUtils.cleanString(loc[loc.length - 1]))
                : start;
            const position = calculatePosition(
              lengthScaleRef.current(start),
              lengthScaleRef.current(end),
              row,
              dimensions.boxHeight
            );
            const width =
              loc.length === 1 ? Math.max(2, position.width) : position.width;
            featureGroup
              .append("rect")
              .attr("class", `box ${feature.type}`)
              .attr("x", position.x)
              .attr("y", position.y)
              .attr("width", width)
              .attr("height", position.height)
              .style(
                "fill",
                (CONFIG.colors[feature.type] || CONFIG.colors.others).fill
              )
              .style(
                "stroke",
                (CONFIG.colors[feature.type] || CONFIG.colors.others).stroke
              )
              .style("stroke-width", CONFIG.styles.box.strokeWidth);
          });
        });

        // 收集当前行的圈外文本节点
        const rowTextNodes = [];
        rowFeatures.forEach((feature, index) => {
          feature.location.forEach((loc) => {
            const [boxStart, boxEnd] = [
              Number(DataUtils.cleanString(loc[0])),
              Number(DataUtils.cleanString(loc[loc.length - 1])),
            ];
            const position = calculatePosition(
              lengthScaleRef.current(boxStart),
              lengthScaleRef.current(boxEnd),
              row,
              dimensions.boxHeight
            );
            const text =
              feature.information.gene ||
              feature.information.product ||
              feature.type;
            if (text) {
              const textWidth = TextUtils.measureTextWidth(
                text,
                dimensions.fontSize,
                CONFIG.fonts.primary.family
              );
              const availableWidth = position.width - 10;
              const isTruncated = textWidth > availableWidth;
              if (isTruncated) {
                rowTextNodes.push({
                  text,
                  width: textWidth,
                  height: dimensions.fontSize,
                  x: position.x + position.width / 2,
                  y: position.y + position.height + dimensions.fontSize / 2,
                  targetX: position.x + position.width / 2,
                  targetY:
                    position.y + position.height + dimensions.fontSize / 2,
                  box: { ...position, row },
                  isTruncated: true,
                  featureIndex: index,
                });
              }
            }
          });
        });

        // 对当前行的圈外文本应用力模拟
        if (rowTextNodes.length > 0) {
          const simulation = d3
            .forceSimulation(rowTextNodes)
            .velocityDecay(0.5)
            .force(
              "repel",
              d3.forceManyBody().strength(-1).distanceMax(50).distanceMin(0)
            )
            .force(
              "attract",
              d3.forceManyBody().strength(0.5).distanceMax(100).distanceMin(50)
            )
            .force("x", d3.forceX((d) => d.targetX).strength(1))
            .force("y", d3.forceY((d) => d.targetY).strength(1))
            .force("gravity", d3.forceY(() => 0).strength(-0.35 / (1 + row)))
            .force(
              "collide",
              d3
                .forceCollide()
                .radius((d) => d.width / 2 + 5)
                .iterations(4)
            )
            .stop();

          // 执行力模拟
          for (let i = 0; i < 75; ++i) {
            simulation.tick();
          }
        }

        // 渲染当前行的文本
        rowFeatures.forEach((feature, index) => {
          const featureGroup = rowGroup.select(`#feature-${row}-${index}`);
          feature.location.forEach((loc) => {
            const [boxStart, boxEnd] = [
              Number(DataUtils.cleanString(loc[0])),
              Number(DataUtils.cleanString(loc[loc.length - 1])),
            ];
            const position = calculatePosition(
              lengthScaleRef.current(boxStart),
              lengthScaleRef.current(boxEnd),
              row,
              dimensions.boxHeight
            );
            const text =
              feature.information.gene ||
              feature.information.product ||
              feature.type;
            if (text) {
              const textWidth = TextUtils.measureTextWidth(
                text,
                dimensions.fontSize,
                CONFIG.fonts.primary.family
              );
              const availableWidth = position.width - 10;
              const isTruncated = textWidth > availableWidth;

              if (isTruncated) {
                // 从力模拟结果中找到对应的文本节点
                const textNode = rowTextNodes.find(
                  (n) =>
                    n.text === text &&
                    n.box.x === position.x &&
                    n.box.y === position.y &&
                    n.featureIndex === index
                );
                if (textNode) {
                  // 添加引导线
                  featureGroup
                    .append("line")
                    .attr("class", "annotation-leader")
                    .attr("x1", textNode.x)
                    .attr("y1", textNode.y)
                    .attr("x2", textNode.box.x + textNode.box.width / 2)
                    .attr("y2", textNode.box.y + textNode.box.height)
                    .attr("stroke", "#aaa")
                    .attr("stroke-width", 1)
                    .style("pointer-events", "none");

                  // 添加文本背景
                  featureGroup
                    .append("rect")
                    .attr("class", "text-bg")
                    .attr("x", textNode.x - textNode.width / 2 - 5)
                    .attr("y", textNode.y - textNode.height / 2)
                    .attr("width", textNode.width + 10)
                    .attr("height", textNode.height)
                    .style("fill", "none")
                    .style("opacity", 0);

                  // 添加文本
                  featureGroup
                    .append("text")
                    .attr("class", "annotation truncated")
                    .attr("x", textNode.x)
                    .attr("y", textNode.y)
                    .text(textNode.text)
                    .style("font-family", CONFIG.fonts.primary.family)
                    .style("font-size", `${dimensions.fontSize}px`)
                    .style("dominant-baseline", "middle")
                    .style("text-anchor", "middle")
                    .style("pointer-events", "none")
                    .style("fill", CONFIG.styles.annotation.fillDark);
                }
              } else {
                // 普通文本直接渲染
                featureGroup
                  .append("text")
                  .attr("class", "annotation")
                  .attr("x", position.x + position.width / 2)
                  .attr("y", position.y + position.height / 2)
                  .text(text)
                  .style("font-family", CONFIG.fonts.primary.family)
                  .style("font-size", `${dimensions.fontSize}px`)
                  .style("dominant-baseline", "middle")
                  .style("text-anchor", "middle")
                  .style("pointer-events", "none");
              }
            }
          });
        });

        // 计算当前行的实际高度（包括力模拟后的文本）
        let rowMaxY = currentRowY + dimensions.boxHeight;
        if (rowTextNodes.length > 0) {
          const textMaxY = Math.max(
            ...rowTextNodes.map((node) => node.y + node.height / 2)
          );
          rowMaxY = Math.max(rowMaxY, textMaxY);
        }

        // 更新下一行的起始Y坐标
        currentRowY = rowMaxY + CONFIG.linearLayout.rowSpacing;

        // 更新当前行的实际高度记录
        const actualRowHeight = rowMaxY - layoutState.current.rowYs.get(row);
        layoutState.current.rowHeights.set(row, actualRowHeight);
      }
    },
    [
      features,
      dimensions,
      resetLayout,
      assignRowsBySpan,
      calculatePosition,
      handleMouseOver,
      handleMouseOut,
      handleFeatureClick,
      getFeatureBounds,
    ]
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
        stroke: ${CONFIG.styles.axis.stroke};
        stroke-width: ${CONFIG.styles.axis.strokeWidth};
      }
      .top-axis text {
        fill: ${CONFIG.styles.annotation.fillDark};
        font-size: ${CONFIG.styles.annotation.fontSize}px;
        font-family: ${CONFIG.fonts.primary.family};
      }
      .annotation {
        fill: ${CONFIG.styles.annotation.fillDark};
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
      const calculateSvgDimensions = () => {
        try {
          const bbox = svgRef.current.getBBox();
          const contentHeight = getContentHeight();
          setSvgWidth(bbox.width * CONFIG.svgWidthPaddingRatio);
          setSvgHeight(
            Math.max(contentHeight, bbox.height * CONFIG.svgHeightPaddingRatio)
          );
        } catch (e) {
          console.warn("SVG dimensions calculation failed:", e);
        }
      };

      // 立即计算一次
      calculateSvgDimensions();

      // 使用 requestAnimationFrame 确保在下一帧再次计算
      requestAnimationFrame(() => {
        calculateSvgDimensions();
      });
    }
  }, [features, dimensions, getContentHeight]);

  // 只在首次加载时记录窗口宽度的比例（从CONFIG读取）
  if (initialSvgWidthRef.current === null) {
    initialSvgWidthRef.current = Math.round(
      window.innerWidth * CONFIG.svgWidthRatio
    );
  }

  if (loading) {
    return <div style={sequenceViewer.loading}>加载中...</div>;
  }

  if (error) {
    return <div style={sequenceViewer.error}>错误: {error}</div>;
  }

  return (
    <div style={sequenceViewer.renderer}>
      <svg
        ref={svgRef}
        style={sequenceViewer.svg}
        width={svgWidth}
        height={svgHeight}
      />
    </div>
  );
};

export default LinearSequenceRenderer;
