import React, { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";
import { CONFIG } from "../../config/config";
import { DataUtils, TextUtils, debounce } from "../../utils/utils";
import { LayoutUtils } from "../../utils/LayoutUtils";
import "./GenomeVisualizer.css";

const GenomeVisualizer = ({ data, width = 800, height = 600 }) => {
  const svgRef = useRef(null);
  const [dimensions, setDimensions] = useState(null);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRendered, setIsRendered] = useState(false);
  const occupiedRowsRef = useRef({});
  const lengthScaleRef = useRef(null);
  const annotationRefs = useRef({});
  const hoverTimeoutRef = useRef(null);
  const [hoveredFeature, setHoveredFeature] = useState(null);

  // 移除所有悬停内容
  const removeAllHoverContent = useCallback(() => {
    Object.keys(annotationRefs.current).forEach((key) => {
      if (key.startsWith("hover-")) {
        d3.select(annotationRefs.current[key]).remove();
        annotationRefs.current[key] = null;
      }
    });
  }, []);

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
    const vSpace = boxHeight + textSpaceHeight; // Box高度加上文字空间高度

    setDimensions({
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
      // 清除之前的悬停内容
      removeAllHoverContent();

      // 设置当前悬停项
      setHoveredFeature(feature);

      // 获取特征边界
      const [start, end] = LayoutUtils.getFeatureBounds(feature.location);
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

    // 确保SVG元素存在
    if (!svgRef.current) {
      console.error("SVG element not found");
      return;
    }

    // 清理之前的内容
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    occupiedRowsRef.current = {};
    annotationRefs.current = {};

    // 重置布局系统
    LayoutUtils.resetLayout();

    // 添加避让文字统计
    const avoidanceStats = {
      needsAvoidance: 0,
      rendered: 0,
      noPosition: 0,
    };

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

    // 渲染特征前打印记录
    console.log(
      "%c=== 渲染特征前占用记录 ===",
      "color: yellow; font-weight: bold; font-size: 14px"
    );
    console.log(
      "occupiedRowsRef.current:",
      JSON.stringify(occupiedRowsRef.current)
    );
    LayoutUtils.printOccupationRecords();

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

      // 渲染骨架线
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
          .style("stroke", "#222")
          .style("stroke-width", 1)
          .style("opacity", 1);
      });

      // 将鼠标事件绑定到整个特征组
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

      const maxWidth =
        lengthScaleRef.current(end) - lengthScaleRef.current(start);
      const needsAvoidance = LayoutUtils.needsAvoidance(
        text,
        maxWidth,
        dimensions.fontSize,
        CONFIG.fonts.primary.family
      );

      if (needsAvoidance) {
        // 记录需要避让的文字
        avoidanceStats.needsAvoidance++;

        // 需要避让，查找可用的文字行位置
        const textLinePosition = LayoutUtils.findAvailableTextLine(
          start,
          end,
          row,
          maxWidth,
          dimensions.fontSize,
          CONFIG.fonts.primary.family,
          text
        );

        // 如果找到了可用位置，则显示文字
        if (textLinePosition !== null) {
          // 计算文字的垂直位置 (向下避让)
          const baseY = dimensions.vSpace * row;
          const textY = baseY + dimensions.boxHeight / 2 + textLinePosition;

          // 更新统计信息
          avoidanceStats.rendered++;

          // 渲染避让的文字
          featureGroup
            .append("text")
            .attr("class", "annotation annotation-avoided")
            .attr("x", lengthScaleRef.current(start) + maxWidth / 2)
            .attr("y", textY)
            .text(text)
            .style("dominant-baseline", "middle")
            .style("text-anchor", "middle")
            .style("user-select", "none");

          console.log(
            `%c成功渲染避让文字: "${text}"`,
            "color: #6bff7d; font-weight: bold"
          );
        } else {
          // 更新统计信息
          avoidanceStats.noPosition++;
          console.log(
            `%c文字需要避让但没有可用位置: "${text}" [${start}, ${end}]`,
            "color: orange; font-weight: bold"
          );
        }
      } else {
        // 不需要避让，直接在box内显示
        const truncatedText = TextUtils.truncateText(
          text,
          maxWidth,
          dimensions.fontSize,
          CONFIG.fonts.primary.family
        );

        // 记录box内的文字占用，确保避让系统正常工作
        LayoutUtils.addOccupationRecord(row, 0, start, end);

        featureGroup
          .append("text")
          .attr("class", "annotation")
          .attr("x", lengthScaleRef.current(start) + maxWidth / 2)
          .attr("y", dimensions.vSpace * row)
          .text(truncatedText)
          .style("dominant-baseline", "middle")
          .style("text-anchor", "middle")
          .style("user-select", "none");
      }

      // 更新占用行
      if (!occupiedRowsRef.current[row]) {
        occupiedRowsRef.current[row] = [];
      }
      occupiedRowsRef.current[row].push([start, end]);
    });

    // 标记渲染完成
    setIsRendered(true);

    // 渲染特征后打印记录
    console.log(
      "%c=== 渲染特征后占用记录 ===",
      "color: yellow; font-weight: bold; font-size: 14px"
    );
    console.log(
      "occupiedRowsRef.current:",
      JSON.stringify(occupiedRowsRef.current)
    );
    LayoutUtils.printOccupationRecords();

    // 输出避让文字统计信息
    console.log(
      "%c=== 避让文字统计 ===",
      "color: #6bff7d; font-weight: bold; font-size: 14px"
    );
    console.log(
      `%c需要避让的文字总数: ${avoidanceStats.needsAvoidance}`,
      "color: #6bff7d"
    );
    console.log(
      `%c成功渲染的避让文字: ${avoidanceStats.rendered}`,
      "color: #6bff7d"
    );
    console.log(
      `%c没有找到可用位置的文字: ${avoidanceStats.noPosition}`,
      "color: orange"
    );
    console.log(
      "%c===================",
      "color: #6bff7d; font-weight: bold; font-size: 14px"
    );

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
          height={dimensions.height || height}
          style={{
            fontFamily: CONFIG.fonts.primary.family,
            fontSize: `${dimensions.fontSize || 12}px`,
            display: "block", // 确保SVG元素显示为块级元素
            backgroundColor: "#121212", // 添加背景色以便于调试
          }}
        />
      )}
    </div>
  );
};

export default GenomeVisualizer;
