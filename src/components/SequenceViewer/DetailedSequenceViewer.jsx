/**
 * @file DetailedSequenceViewer.jsx
 * @description 详细序列查看器组件
 * 主要职责：
 * 1. 以类似文本阅读器的方式显示序列数据
 * 2. 显示完整的DNA/RNA序列字符
 * 3. 提供特征的详细信息显示
 * 4. 支持序列搜索和位置定位
 * 5. 提供序列行号和位置标记
 */

import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { CONFIG } from "../../config/config";
import { DataUtils, TextUtils } from "../../utils/utils";

/**
 * 详细序列渲染组件
 * @param {Object} props - 组件属性
 * @param {Object} props.data - 序列数据对象
 * @param {number} props.width - 渲染区域宽度
 * @param {number} props.height - 渲染区域高度
 * @param {Function} [props.onFeatureClick] - 特征点击事件处理函数
 */
const DetailedSequenceViewer = ({
  data,
  width = 800,
  height = 600,
  onFeatureClick,
}) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [selectedFeature, setSelectedFeature] = useState(null);

  // 获取序列数据
  const sequence = data?.origin || "";
  const totalLength = data?.locus?.sequenceLength || sequence.length;
  const features = data?.features || [];

  // 配置参数
  const margin = { top: 60, right: 40, bottom: 40, left: 100 };
  const contentWidth = width - margin.left - margin.right;
  const contentHeight = height - margin.top - margin.bottom;

  // 从配置文件获取序列显示参数
  const detailedConfig = CONFIG.detailedSequenceViewer;
  const lineHeight = detailedConfig.lineHeight;
  const fontSize = detailedConfig.fontSize;
  const positionWidth = detailedConfig.positionWidth;

  // 计算每行核苷酸数量，确保是10的整数倍且自适应宽度
  const charWidth = 12; // 每个字符的宽度
  const maxNucleotidesFromWidth = Math.floor(contentWidth / charWidth);
  const nucleotidesPerRow = Math.max(
    10,
    Math.floor(maxNucleotidesFromWidth / 10) * 10
  );

  useEffect(() => {
    if (!svgRef.current || !data || !sequence) return;

    renderDetailedView();
  }, [data, width, height, sequence]);

  const renderDetailedView = () => {
    // 清除之前的渲染内容
    d3.select(svgRef.current).selectAll("*").remove();

    // 主容器
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("background-color", CONFIG.styles.background.color);

    // 创建内容组
    const contentGroup = svg
      .append("g")
      .attr("class", "content")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // 添加标题和信息栏
    renderHeader(svg);

    // 渲染序列内容
    renderSequenceContent(contentGroup);

    // 添加滚动功能
    addScrollBehavior(svg, contentGroup);
  };

  const renderHeader = (svg) => {
    const headerGroup = svg.append("g").attr("class", "header");

    // 标题
    headerGroup
      .append("text")
      .attr("x", width / 2)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .style("fill", CONFIG.styles.axis.text.fill)
      .text(data.definition || "序列详细视图");

    // 基本信息
    const infoText = [
      `长度: ${totalLength.toLocaleString()} bp`,
      `类型: ${data.locus?.moleculeType || ""}`,
      `拓扑: ${data.locus?.topology || ""}`,
      `特征: ${features.length}个`,
    ].join(" | ");

    headerGroup
      .append("text")
      .attr("x", width / 2)
      .attr("y", 45)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", CONFIG.styles.axis.text.fill)
      .text(infoText);
  };

  const renderSequenceContent = (contentGroup) => {
    if (!sequence) return;

    const totalRows = Math.ceil(sequence.length / nucleotidesPerRow);
    const visibleRows = Math.floor(contentHeight / lineHeight);
    // 显示所有行，让滚动功能来控制可见区域
    const startRow = 0;
    const endRow = totalRows;

    // 为每一行创建组
    for (let rowIndex = startRow; rowIndex < endRow; rowIndex++) {
      const rowY = rowIndex * lineHeight;
      const startPos = rowIndex * nucleotidesPerRow;
      const endPos = Math.min(startPos + nucleotidesPerRow, sequence.length);
      const rowSequence = sequence.slice(startPos, endPos);

      renderSequenceRow(contentGroup, rowIndex, rowY, startPos, rowSequence);
    }

    // 渲染特征标记
    renderFeatureAnnotations(contentGroup, startRow, endRow);
  };

  const renderSequenceRow = (parent, rowIndex, y, startPos, rowSequence) => {
    const rowGroup = parent
      .append("g")
      .attr("class", `sequence-row-${rowIndex}`);

    // 位置标记
    rowGroup
      .append("text")
      .attr("x", -10)
      .attr("y", y + fontSize)
      .attr("text-anchor", "end")
      .style("font-family", CONFIG.styles.annotation.fontFamily)
      .style("font-size", `${fontSize}px`)
      .style("fill", CONFIG.styles.axis.text.fill)
      .text((startPos + 1).toLocaleString());

    // 渲染每个核苷酸
    for (let i = 0; i < rowSequence.length; i++) {
      const nucleotide = rowSequence[i];
      const position = startPos + i;
      const x = i * 12; // 12px per character

      // 核苷酸字符背景
      const nucleotideGroup = rowGroup
        .append("g")
        .attr("class", "nucleotide-group");

      // 背景矩形（用于高亮）
      nucleotideGroup
        .append("rect")
        .attr("x", x - 1)
        .attr("y", y)
        .attr("width", 12)
        .attr("height", lineHeight)
        .attr("fill", getNucleotideBackground(nucleotide, position))
        .attr("stroke", "none")
        .style("opacity", 0.3);

      // 核苷酸文字
      nucleotideGroup
        .append("text")
        .attr("x", x + 6)
        .attr("y", y + fontSize)
        .attr("text-anchor", "middle")
        .style("font-family", CONFIG.styles.annotation.fontFamily)
        .style("font-size", `${fontSize}px`)
        .style("font-weight", "normal")
        .style("fill", getNucleotideColor(nucleotide))
        .text(nucleotide.toUpperCase());

      // 每10个核苷酸添加间隔标记
      if ((i + 1) % 10 === 0) {
        rowGroup
          .append("text")
          .attr("x", x + 18)
          .attr("y", y - 5)
          .attr("text-anchor", "middle")
          .style("font-size", "10px")
          .style("fill", CONFIG.styles.axis.text.fill)
          .style("opacity", 0.7)
          .text(position + 1);
      }
    }
  };

  const renderFeatureAnnotations = (parent, startRow, endRow) => {
    const startPos = startRow * nucleotidesPerRow;
    const endPos = endRow * nucleotidesPerRow;

    // 过滤当前可见区域的特征
    const visibleFeatures = features.filter((feature) => {
      return feature.location.some((loc) => {
        const featureStart = Number(DataUtils.cleanString(loc[0]));
        const featureEnd =
          loc.length > 1
            ? Number(DataUtils.cleanString(loc[loc.length - 1]))
            : featureStart;
        return !(featureEnd < startPos || featureStart > endPos);
      });
    });

    // 在序列右侧显示特征标记
    visibleFeatures.forEach((feature, index) => {
      feature.location.forEach((loc) => {
        const featureStart = Number(DataUtils.cleanString(loc[0])) - 1; // 转为0-based
        const featureEnd =
          loc.length > 1
            ? Number(DataUtils.cleanString(loc[loc.length - 1])) - 1
            : featureStart;

        if (featureStart >= startPos && featureStart < endPos) {
          const row = Math.floor(featureStart / nucleotidesPerRow) - startRow;
          const col = featureStart % nucleotidesPerRow;

          if (row >= 0 && row < endRow - startRow) {
            const x = col * 12;
            const y = row * lineHeight;

            // 特征标记线
            const typeConf =
              CONFIG.featureType[feature.type] || CONFIG.featureType.others;

            parent
              .append("line")
              .attr("x1", x + 6)
              .attr("y1", y + lineHeight + 2)
              .attr("x2", x + 6)
              .attr("y2", y + lineHeight + 10)
              .attr("stroke", typeConf.stroke)
              .attr("stroke-width", 2)
              .style("cursor", "pointer")
              .on("click", () => handleFeatureClick(feature));
          }
        }
      });
    });
  };

  const getNucleotideColor = (nucleotide) => {
    const colors = detailedConfig.nucleotideColors;
    return colors[nucleotide.toUpperCase()] || colors.default;
  };

  const getNucleotideBackground = (nucleotide, position) => {
    return "transparent";
  };

  const handleFeatureClick = (feature) => {
    setSelectedFeature(feature);
    if (onFeatureClick) {
      onFeatureClick(feature);
    }
  };

  const addScrollBehavior = (svg, contentGroup) => {
    const totalRows = Math.ceil(sequence.length / nucleotidesPerRow);
    const visibleRows = Math.floor(contentHeight / lineHeight);
    const maxScrollRows = Math.max(0, totalRows - visibleRows);
    const maxScroll = maxScrollRows * lineHeight;

    let currentScrollRow = 0;

    // 创建一个透明的滚动区域覆盖整个SVG
    const scrollArea = svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .style("cursor", "default");

    // 鼠标滚轮事件 - 逐行滚动
    scrollArea.on("wheel", (event) => {
      event.preventDefault();

      // 计算滚动方向，每次滚动一行
      const scrollDirection = event.deltaY > 0 ? 1 : -1;
      const newScrollRow = Math.max(
        0,
        Math.min(maxScrollRows, currentScrollRow + scrollDirection)
      );

      if (newScrollRow !== currentScrollRow) {
        currentScrollRow = newScrollRow;
        const scrollY = -currentScrollRow * lineHeight;

        // 直接设置内容组的变换
        contentGroup.attr(
          "transform",
          `translate(${margin.left}, ${margin.top + scrollY})`
        );
      }
    });

    // 禁用D3的zoom行为，使用我们自己的滚动逻辑
    svg.on(".zoom", null);
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        backgroundColor: CONFIG.styles.background.color,
        overflow: "hidden",
      }}
    >
      {/* SVG渲染区域 */}
      <svg
        ref={svgRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />

      {/* 特征详情面板 */}
      {selectedFeature && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            right: "20px",
            width: "300px",
            ...detailedConfig.featurePanel,
            color: "#e0e0e0",
            fontSize: "12px",
            overflow: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <h4 style={{ margin: 0, fontSize: "14px" }}>特征详情</h4>
            <button
              onClick={() => setSelectedFeature(null)}
              style={{
                background: "none",
                border: "none",
                color: "#ccc",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              ×
            </button>
          </div>

          <div>
            <strong>类型:</strong> {selectedFeature.type}
          </div>
          <div>
            <strong>位置:</strong>{" "}
            {selectedFeature.location
              .map(
                (loc) =>
                  `${loc[0]}-${loc.length > 1 ? loc[loc.length - 1] : loc[0]}`
              )
              .join(", ")}
          </div>

          {selectedFeature.information.gene && (
            <div>
              <strong>基因:</strong> {selectedFeature.information.gene}
            </div>
          )}
          {selectedFeature.information.product && (
            <div>
              <strong>产物:</strong> {selectedFeature.information.product}
            </div>
          )}
          {selectedFeature.information.note && (
            <div>
              <strong>备注:</strong> {selectedFeature.information.note}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DetailedSequenceViewer;
