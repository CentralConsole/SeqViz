/**
 * @file FeatureRenderer.jsx
 * @description 特征渲染组件
 * 主要职责：
 * 1. 负责单个基因组特征的渲染（如基因、CDS等）
 * 2. 处理特征的视觉表现（颜色、形状等）
 * 3. 实现特征的交互效果（悬停、点击等）
 * 4. 管理特征的文本标注
 * 5. 与布局管理器协作确定特征位置
 */

import React, { useRef, useEffect } from "react";
import * as d3 from "d3";
import { CONFIG } from "../../config/config";
import { DataUtils, TextUtils } from "../../utils/utils";
import SimpleLayoutManager from "../../utils/SimpleLayoutManager";

const FeatureRenderer = ({ container, dimensions, feature }) => {
  const featureCounterRef = useRef(1);
  const lengthScaleRef = useRef(null);
  const annotationRef = useRef(null);
  const layoutManager = useRef(null);

  // dimensions 变化时初始化 layoutManager
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

  // 设置长度比例尺
  useEffect(() => {
    if (!dimensions) return;
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

  // 计算文本宽度
  const measureTextWidth = (text, fontSize) => {
    const charWidth = fontSize * 0.6;
    return text.length * charWidth;
  };

  // 添加特征元素
  const addFeatureElements = (group, type, location, information) => {
    const [start, end] = getFeatureBounds(location);
    const row = layoutManager.current.findAvailableRow(start, end);
    addBoxElements(group, type, location, row, information);
  };

  // 添加框元素
  const addBoxElements = (group, type, location, row, information) => {
    const boxGroup = group
      .append("g")
      .attr("id", `feature-box-group-${featureCounterRef.current}`)
      .attr("class", "box-group");

    const [start, end] = getFeatureBounds(location);
    const position = layoutManager.current.calculatePosition(
      lengthScaleRef.current(start),
      lengthScaleRef.current(end),
      row
    );

    // 添加骨架线
    boxGroup
      .append("line")
      .attr("class", `box bone ${type}`)
      .attr("x1", position.x)
      .attr("y1", position.y + position.height / 2)
      .attr("x2", position.x + position.width)
      .attr("y2", position.y + position.height / 2)
      .style("stroke-width", position.height / 2)
      .style("stroke", CONFIG.colors[type] || CONFIG.colors.others);

    // 添加特征框
    location.forEach((loc) => {
      const [boxStart, boxEnd] = [
        Number(DataUtils.cleanString(loc[0])),
        Number(DataUtils.cleanString(loc[loc.length - 1])),
      ];

      const boxPosition = layoutManager.current.calculatePosition(
        lengthScaleRef.current(boxStart),
        lengthScaleRef.current(boxEnd),
        row
      );

      boxGroup
        .append("rect")
        .attr("class", `box ${type}`)
        .attr("x", boxPosition.x)
        .attr("y", boxPosition.y)
        .attr("width", boxPosition.width)
        .attr("height", boxPosition.height)
        .style("fill", CONFIG.colors[type] || CONFIG.colors.others)
        .style("stroke", "none");
    });

    // 添加文本
    const text = getAnnotationText(type, information);
    if (text) {
      const textPosition = layoutManager.current.calculateTextPosition(
        position,
        text
      );

      boxGroup
        .append("text")
        .attr("class", "annotation")
        .attr("x", textPosition.x)
        .attr("y", textPosition.y)
        .text(textPosition.text)
        .style("font-family", CONFIG.fonts.primary.family)
        .style("font-size", `${dimensions.fontSize}px`)
        .style("dominant-baseline", "middle")
        .style("text-anchor", "middle")
        .style("pointer-events", "none");
    }

    // 添加鼠标事件
    boxGroup
      .on("mouseover", () =>
        handleMouseOver(group, type, location, row, information)
      )
      .on("mouseout", () =>
        handleMouseOut(group, type, location, row, information)
      );
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
    const position = layoutManager.current.calculatePosition(
      lengthScaleRef.current(start),
      lengthScaleRef.current(end),
      row
    );

    // 创建背景
    const textWidth = measureTextWidth(text, dimensions.fontSize);
    const textPosition = layoutManager.current.calculateTextPosition(
      position,
      text
    );

    group
      .append("rect")
      .attr("class", "annotation-bg")
      .attr("x", textPosition.x - textWidth / 2 - 5)
      .attr("y", textPosition.y - dimensions.fontSize / 2 - 5)
      .attr("width", textWidth + 10)
      .attr("height", dimensions.fontSize + 10)
      .style("fill", "white")
      .style("stroke", "#ddd")
      .style("stroke-width", 1)
      .raise();

    // 更新文本
    if (annotationRef.current) {
      annotationRef.current
        .attr("x", textPosition.x)
        .attr("y", textPosition.y)
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
    const position = layoutManager.current.calculatePosition(
      lengthScaleRef.current(start),
      lengthScaleRef.current(end),
      row
    );
    const text = getAnnotationText(type, information);
    const textPosition = layoutManager.current.calculateTextPosition(
      position,
      text
    );

    // 移除背景
    group.selectAll(".annotation-bg").remove();

    // 恢复文本
    if (annotationRef.current) {
      annotationRef.current
        .attr("x", textPosition.x)
        .attr("y", textPosition.y)
        .text(text);
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
      .style("stroke-dasharray", CONFIG.styles.bone.strokeDasharray);

    container
      .selectAll(".annotation")
      .style("font-size", dimensions.fontSize)
      .style("font-family", CONFIG.fonts.primary.family);

    container
      .selectAll(".gap")
      .style("stroke-linecap", CONFIG.styles.gap.strokeLinecap);

    container
      .selectAll(".variation")
      .style("stroke-linecap", CONFIG.styles.variation.strokeLinecap);

    container
      .selectAll(".location-text")
      .style("font-family", CONFIG.fonts.primary.family);
  };

  // 渲染特征
  useEffect(() => {
    if (!container || !dimensions || !feature || !layoutManager.current) return;

    const { type, location, information } = feature;
    addFeatureElements(container, type, location, information);
    applyStyles();

    featureCounterRef.current++;
  }, [container, dimensions, feature]);

  return null;
};

export default FeatureRenderer;
