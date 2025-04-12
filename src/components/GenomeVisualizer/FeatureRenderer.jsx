import React, { useRef, useEffect } from "react";
import * as d3 from "d3";
import { CONFIG } from "../../config/config";
import { DataUtils, LayoutUtils, TextUtils } from "../../utils/utils";

const FeatureRenderer = ({ container, dimensions, feature }) => {
  const featureCounterRef = useRef(1);
  const occupiedRef = useRef({ 1: [] });
  const lengthScaleRef = useRef(null);
  const annotationRef = useRef(null);

  // 设置长度比例尺
  useEffect(() => {
    lengthScaleRef.current = d3
      .scaleLinear()
      .domain([0, dimensions.totalLength])
      .range([0, dimensions.contentWidth]);
  }, [dimensions]);

  // 获取特征边界
  const getFeatureBounds = (location) => {
    let minPos = Infinity;
    let maxPos = -Infinity;

    for (const interval of location) {
      const start = Number(DataUtils.cleanString(interval[0]));
      const end = Number(DataUtils.cleanString(interval[interval.length - 1]));
      minPos = Math.min(minPos, start);
      maxPos = Math.max(maxPos, end);
    }

    return [minPos, maxPos];
  };

  // 计算文本宽度（针对等宽字体优化）
  const measureTextWidth = (text, fontSize) => {
    const charWidth = fontSize * 0.6; // 等宽字体中字符宽度与字体大小的比例
    return text.length * charWidth;
  };

  // 添加特征元素
  const addFeatureElements = (group, type, location, row, information) => {
    // 保存当前行的占用信息
    if (!occupiedRef.current[row]) {
      occupiedRef.current[row] = [];
    }

    const [start, end] = getFeatureBounds(location);
    // 将当前特征的范围添加到占用记录中
    occupiedRef.current[row].push([start, end]);
    // 同时在LayoutUtils中添加记录，确保两个系统保持同步
    LayoutUtils.addOccupationRecord(
      row,
      0,
      start,
      end,
      information.gene || information.product || type
    );

    addBoxElements(group, type, location, row, information);
    addAnnotation(group, type, location, row, information);
  };

  // 添加框元素
  const addBoxElements = (group, type, location, row, information) => {
    const boxGroup = group
      .append("g")
      .attr("id", `feature-box-group-${featureCounterRef.current}`)
      .attr("class", "box-group");

    const [start, end] = getFeatureBounds(location);
    boxGroup
      .append("line")
      .attr("class", `box bone ${type}`)
      .attr("x1", lengthScaleRef.current(start))
      .attr("y1", 0)
      .attr("x2", lengthScaleRef.current(end))
      .attr("y2", 0)
      .style("transform", `translateY(${dimensions.vSpace * row}px)`);

    location.forEach((loc) => {
      const [boxStart, boxEnd] = [
        Number(DataUtils.cleanString(loc[0])),
        Number(DataUtils.cleanString(loc[loc.length - 1])),
      ];

      const width =
        lengthScaleRef.current(boxEnd) - lengthScaleRef.current(boxStart);
      const height = dimensions.boxHeight;

      boxGroup
        .append("rect")
        .attr("class", `box ${type}`)
        .attr("x", lengthScaleRef.current(boxStart))
        .attr("y", dimensions.vSpace * row - height / 2)
        .attr("width", width)
        .attr("height", height)
        .style("fill", CONFIG.colors[type] || CONFIG.colors.others)
        .style("stroke", "none");
    });

    // 为框组添加鼠标事件
    boxGroup
      .on("mouseover", () =>
        handleMouseOver(group, type, location, row, information)
      )
      .on("mouseout", () =>
        handleMouseOut(group, type, location, row, information)
      );
  };

  // 添加注释
  const addAnnotation = (group, type, location, row, information) => {
    const [start, end] = getFeatureBounds(location);
    const text = getAnnotationText(type, information);
    const width = lengthScaleRef.current(end) - lengthScaleRef.current(start);

    // 确保初始状态下文本是截断的
    const truncatedText = TextUtils.truncateText(
      text,
      width,
      dimensions.fontSize,
      CONFIG.fonts.primary.family
    );

    // 计算文本的水平中心位置
    const textCenterX = lengthScaleRef.current(start) + width / 2;

    annotationRef.current = group
      .append("text")
      .attr("class", "annotation")
      .attr("x", textCenterX) // 使用计算出的中心位置
      .attr("y", dimensions.vSpace * row)
      .text(truncatedText)
      .style("font-family", CONFIG.fonts.primary.family)
      .style("font-size", `${dimensions.fontSize}px`)
      .style("dominant-baseline", "middle")
      .style("text-anchor", "middle") // 添加这行，使文本水平居中
      .style("pointer-events", "none"); // 防止文本干扰鼠标事件
  };

  // 获取注释文本
  const getAnnotationText = (type, information) => {
    const typeHandlers = {
      operon: () => `${information.operon} (operon)`,
      CDS: () => information.product,
      gene: () => information.gene,
      exon: () => "exon",
      intron: () => "intron",
      misc_feature: () => information.note,
      STS: () => `STS ${information.standard_name}`,
      variation: () => "variation",
      gap: () => "gap",
    };

    return typeHandlers[type] ? typeHandlers[type]() : type;
  };

  // 处理鼠标悬停
  const handleMouseOver = (group, type, location, row, information) => {
    group.raise();
    showFullAnnotation(group, type, location, row, information);
    showLocationMarks(group, location, row);
  };

  // 处理鼠标移出
  const handleMouseOut = (group, type, location, row, information) => {
    group.lower();
    restoreTruncatedAnnotation(group, type, location, row, information);
    group.selectAll(".location").remove();
  };

  // 显示完整注释
  const showFullAnnotation = (group, type, location, row, information) => {
    const [start, end] = getFeatureBounds(location);
    const text = getAnnotationText(type, information);

    // 创建背景
    const textWidth = measureTextWidth(text, dimensions.fontSize);
    const textCenterX =
      lengthScaleRef.current(start) +
      (lengthScaleRef.current(end) - lengthScaleRef.current(start)) / 2;

    group
      .append("rect")
      .attr("class", "annotation-bg")
      .attr("x", textCenterX - textWidth / 2 - 5)
      .attr("y", dimensions.vSpace * row - dimensions.boxHeight / 2)
      .attr("width", textWidth + 10)
      .attr("height", dimensions.boxHeight)
      .style("fill", "white")
      .style("stroke", "#ddd")
      .style("stroke-width", 1)
      .raise();

    // 更新文本为完整版本
    if (annotationRef.current) {
      annotationRef.current
        .attr("x", textCenterX) // 修改这里，使文本水平居中
        .text(text)
        .raise();
    }
  };

  // 恢复截断的注释
  const restoreTruncatedAnnotation = (
    group,
    type,
    location,
    row,
    information
  ) => {
    const [start, end] = getFeatureBounds(location);
    const text = getAnnotationText(type, information);
    const width = lengthScaleRef.current(end) - lengthScaleRef.current(start);
    const textCenterX = lengthScaleRef.current(start) + width / 2;

    // 移除背景
    group.selectAll(".annotation-bg").remove();

    // 恢复截断文本
    if (annotationRef.current) {
      const truncatedText = TextUtils.truncateText(
        text,
        width,
        dimensions.fontSize,
        CONFIG.fonts.primary.family
      );
      annotationRef.current.attr("x", textCenterX).text(truncatedText);
    }
  };

  // 显示位置标记
  const showLocationMarks = (group, location, row) => {
    location.forEach((loc) => {
      const position = Number(DataUtils.cleanString(loc[0]));
      const locationGroup = group.append("g").attr("class", "location");

      locationGroup
        .append("line")
        .attr("class", "location-mark")
        .attr("x1", lengthScaleRef.current(position))
        .attr("y1", dimensions.vSpace * row - dimensions.boxHeight)
        .attr("x2", lengthScaleRef.current(position))
        .attr("y2", dimensions.vSpace * row + dimensions.boxHeight)
        .style("stroke", "#666")
        .style("stroke-width", 1)
        .style("stroke-dasharray", "2,2");

      locationGroup
        .append("text")
        .attr("class", "location-text")
        .attr("x", lengthScaleRef.current(position))
        .attr("y", dimensions.vSpace * row - dimensions.boxHeight - 5)
        .text(DataUtils.formatNumber(position))
        .style("font-size", `${dimensions.fontSize * 0.8}px`)
        .style("text-anchor", "middle");
    });
  };

  // 应用样式
  const applyStyles = () => {
    container
      .selectAll(".box")
      .style("stroke-width", 1)
      .style("stroke", "#000");

    container
      .selectAll(".bone")
      .style("opacity", CONFIG.styles.bone.opacity)
      .style("stroke-linecap", CONFIG.styles.bone.strokeLinecap)
      .style("stroke-width", dimensions.boxHeight / 2)
      .style("stroke-dasharray", CONFIG.styles.bone.strokeDasharray);

    container
      .selectAll(".annotation")
      .style("font-size", dimensions.fontSize)
      .style("font-family", CONFIG.fonts.primary.family);

    container
      .selectAll(".gap")
      .style("stroke-linecap", CONFIG.styles.gap.strokeLinecap)
      .style("stroke-width", dimensions.boxHeight / 2);

    container
      .selectAll(".variation")
      .style("stroke-linecap", CONFIG.styles.variation.strokeLinecap)
      .style("stroke-width", dimensions.boxHeight / 5);

    container
      .selectAll(".location-text")
      .style("font-family", CONFIG.fonts.primary.family);
  };

  // 渲染特征
  useEffect(() => {
    if (!container || !dimensions || !feature) return;

    const { type, location, information } = feature;
    const [start, end] = getFeatureBounds(location);

    // 使用LayoutUtils找到可用行
    const row = LayoutUtils.findAvailableRow(
      occupiedRef.current,
      start,
      end,
      dimensions.vSpace
    );

    addFeatureElements(container, type, location, row, information);
    applyStyles();

    featureCounterRef.current++;

    // 调试输出当前占用情况
    console.log(
      `Feature #${featureCounterRef.current - 1} (${type}) 放置在行 ${row}`
    );
    console.log("当前占用行情况:", JSON.stringify(occupiedRef.current));
  }, [container, dimensions, feature]);

  return null;
};

export default FeatureRenderer;
