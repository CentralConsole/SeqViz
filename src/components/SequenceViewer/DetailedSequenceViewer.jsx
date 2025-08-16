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

  // 缓存互补链序列计算结果
  const complementSequenceRef = useRef(null);
  const lastSequenceRef = useRef(null);

  // 获取序列数据
  const sequence = data?.origin || "";
  const totalLength = data?.locus?.sequenceLength || sequence.length;
  const features = data?.features || [];

  // DNA互补配对规则
  const getComplementBase = (base) => {
    const complementMap = {
      A: "T",
      T: "A",
      C: "G",
      G: "C",
      a: "t",
      t: "a",
      c: "g",
      g: "c",
      N: "N",
      n: "n",
    };
    return complementMap[base] || base;
  };

  // 生成互补链序列（5' to 3' -> 3' to 5'）- 使用缓存优化
  const getComplementSequence = () => {
    if (lastSequenceRef.current === sequence && complementSequenceRef.current) {
      return complementSequenceRef.current;
    }

    console.time("Complement sequence calculation");
    const complementSequence = sequence
      .split("")
      .map((base) => getComplementBase(base))
      .reverse()
      .join("");
    console.timeEnd("Complement sequence calculation");

    // 缓存结果
    lastSequenceRef.current = sequence;
    complementSequenceRef.current = complementSequence;

    return complementSequence;
  };

  const complementSequence = getComplementSequence();

  // 配置参数
  const margin = { top: 100, right: 40, bottom: 100, left: 120 };
  const contentWidth = width - margin.left - margin.right;
  const contentHeight = height - margin.top - margin.bottom;

  // 从配置文件获取序列显示参数
  const detailedConfig = CONFIG.detailedSequenceViewer;
  const lineHeight = detailedConfig.lineHeight;
  const fontSize = detailedConfig.fontSize;
  //const positionWidth = detailedConfig.positionWidth;

  // 计算每行核苷酸数量，确保是10的整数倍且自适应宽度
  const charWidth = 12; // 每个字符的宽度
  const maxNucleotidesFromWidth = Math.floor(contentWidth / charWidth);
  const nucleotidesPerRow = Math.max(
    10,
    Math.floor(maxNucleotidesFromWidth / 10) * 10
  );

  // 双链DNA显示参数
  const strandSpacing = detailedConfig.strandSpacing; // 两条链之间的间距
  const rowPadding = detailedConfig.rowPadding; // 行与行之间的额外间距
  const doubleStrandHeight = lineHeight * 2 + strandSpacing + rowPadding; // 双链总高度

  useEffect(() => {
    if (!svgRef.current || !data || !sequence) return;

    renderDetailedView();
  }, [data, width, height, sequence]);

  const renderDetailedView = () => {
    console.time("DetailedSequenceViewer total render");
    console.log(
      `🧬 Rendering DetailedSequenceViewer - Sequence length: ${totalLength}`
    );

    // 清除之前的渲染内容
    console.time("DOM cleanup");
    d3.select(svgRef.current).selectAll("*").remove();
    console.timeEnd("DOM cleanup");

    // 主容器
    console.time("SVG setup");
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
    console.timeEnd("SVG setup");

    // 添加标题和信息栏
    console.time("Header rendering");
    renderHeader(svg);
    console.timeEnd("Header rendering");

    // 渲染序列内容
    renderSequenceContent(contentGroup);

    // 添加滚动功能
    console.time("Scroll setup");
    addScrollBehavior(svg, contentGroup);
    console.timeEnd("Scroll setup");

    console.timeEnd("DetailedSequenceViewer total render");

    // 性能统计
    const totalRows = Math.ceil(sequence.length / nucleotidesPerRow);
    const visibleRows = Math.floor(contentHeight / doubleStrandHeight);
    console.log(`📊 Performance stats:
    - Total sequence length: ${totalLength.toLocaleString()} bp
    - Nucleotides per row: ${nucleotidesPerRow}
    - Total rows: ${totalRows}
    - Visible rows: ${visibleRows}
    - Virtualization ratio: ${Math.round((visibleRows / totalRows) * 100)}%`);
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

  const renderSequenceContent = (contentGroup, scrollOffset = 0) => {
    if (!sequence) return;

    console.time("Sequence content rendering");

    const totalRows = Math.ceil(sequence.length / nucleotidesPerRow);
    const visibleRows = Math.floor(contentHeight / doubleStrandHeight);

    // 虚拟化：只渲染可见区域 + 缓冲区
    const bufferRows = 2; // 上下各2行缓冲
    const currentTopRow = Math.floor(scrollOffset / doubleStrandHeight);
    const startRow = Math.max(0, currentTopRow - bufferRows);
    const endRow = Math.min(
      totalRows,
      currentTopRow + visibleRows + bufferRows
    );

    console.log(
      `Rendering rows ${startRow} to ${endRow} (${
        endRow - startRow
      } rows) out of ${totalRows} total`
    );

    // 为每一行创建组
    for (let rowIndex = startRow; rowIndex < endRow; rowIndex++) {
      const rowY = rowIndex * doubleStrandHeight;
      const startPos = rowIndex * nucleotidesPerRow;
      const endPos = Math.min(startPos + nucleotidesPerRow, sequence.length);
      const rowSequence = sequence.slice(startPos, endPos);
      const rowComplementSequence = complementSequence.slice(startPos, endPos);

      renderDoubleStrandRow(
        contentGroup,
        rowIndex,
        rowY,
        startPos,
        rowSequence,
        rowComplementSequence
      );
    }

    // 渲染特征标记
    renderFeatureAnnotations(contentGroup, startRow, endRow);

    console.timeEnd("Sequence content rendering");
  };

  const renderDoubleStrandRow = (
    parent,
    rowIndex,
    y,
    startPos,
    topSequence,
    bottomSequence
  ) => {
    const rowGroup = parent
      .append("g")
      .attr("class", `double-strand-row-${rowIndex}`);

    // 5' to 3' 方向标记（正链）
    rowGroup
      .append("text")
      .attr("x", -80)
      .attr("y", y + fontSize)
      .attr("text-anchor", "start")
      .style("font-family", CONFIG.styles.annotation.fontFamily)
      .style("font-size", "10px")
      .style("fill", CONFIG.styles.axis.text.fill)
      .text("5'");

    rowGroup
      .append("text")
      .attr("x", topSequence.length * 12 + 5)
      .attr("y", y + fontSize)
      .attr("text-anchor", "start")
      .style("font-family", CONFIG.styles.annotation.fontFamily)
      .style("font-size", "10px")
      .style("fill", CONFIG.styles.axis.text.fill)
      .text("3'");

    // 3' to 5' 方向标记（互补链）
    const complementY = y + lineHeight + strandSpacing;
    rowGroup
      .append("text")
      .attr("x", -80)
      .attr("y", complementY + fontSize)
      .attr("text-anchor", "start")
      .style("font-family", CONFIG.styles.annotation.fontFamily)
      .style("font-size", "10px")
      .style("fill", CONFIG.styles.axis.text.fill)
      .text("3'");

    rowGroup
      .append("text")
      .attr("x", bottomSequence.length * 12 + 5)
      .attr("y", complementY + fontSize)
      .attr("text-anchor", "start")
      .style("font-family", CONFIG.styles.annotation.fontFamily)
      .style("font-size", "10px")
      .style("fill", CONFIG.styles.axis.text.fill)
      .text("5'");

    // 位置标记（放在两条链之间）
    const middleY = y + lineHeight + strandSpacing / 2;
    rowGroup
      .append("text")
      .attr("x", -50)
      .attr("y", middleY)
      .attr("text-anchor", "end")
      .style("font-family", CONFIG.styles.annotation.fontFamily)
      .style("font-size", `${fontSize}px`)
      .style("fill", CONFIG.styles.axis.text.fill)
      .text((startPos + 1).toLocaleString());

    // 优化：使用单个text元素渲染整行正链核苷酸
    const topStrandText = topSequence
      .split("")
      .map((nucleotide, i) => {
        const x = i * 12 + 6;
        return `<tspan x="${x}" fill="${getNucleotideColor(
          nucleotide
        )}">${nucleotide.toUpperCase()}</tspan>`;
      })
      .join("");

    rowGroup
      .append("text")
      .attr("class", "top-strand-sequence")
      .attr("y", y + fontSize)
      .attr("text-anchor", "middle")
      .style("font-family", CONFIG.styles.annotation.fontFamily)
      .style("font-size", `${fontSize}px`)
      .style("font-weight", "normal")
      .html(topStrandText);

    // 每10个核苷酸添加间隔标记（放在两条链之间的右侧）
    for (let i = 9; i < topSequence.length; i += 10) {
      const x = i * 12 + 6;
      const position = startPos + i;

      rowGroup
        .append("text")
        .attr("x", x + 15)
        .attr("y", middleY)
        .attr("text-anchor", "start")
        .style("font-size", "10px")
        .style("fill", CONFIG.styles.axis.text.fill)
        .style("opacity", 0.7)
        .text(position + 1);
    }

    // 优化：使用单个text元素渲染整行互补链核苷酸
    const bottomStrandText = bottomSequence
      .split("")
      .map((nucleotide, i) => {
        const x = i * 12 + 6;
        return `<tspan x="${x}" fill="${getNucleotideColor(
          nucleotide
        )}">${nucleotide.toUpperCase()}</tspan>`;
      })
      .join("");

    rowGroup
      .append("text")
      .attr("class", "bottom-strand-sequence")
      .attr("y", complementY + fontSize)
      .attr("text-anchor", "middle")
      .style("font-family", CONFIG.styles.annotation.fontFamily)
      .style("font-size", `${fontSize}px`)
      .style("font-weight", "normal")
      .html(bottomStrandText);

    // 绘制氢键连线（碱基配对）
    // 注意：既然我们自己生成的互补链，所有配对都应该是正确的
    for (
      let i = 0;
      i < Math.min(topSequence.length, bottomSequence.length);
      i++
    ) {
      const x = i * 12 + 6;

      // 绘制氢键 - 所有连线都是正确配对（细实线）
      const topCharY = y + fontSize; // 正链字符的基线位置
      const bottomCharY = complementY + fontSize; // 互补链字符的基线位置

      rowGroup
        .append("line")
        .attr("class", "hydrogen-bond")
        .attr("x1", x)
        .attr("y1", topCharY + 2) // 正链字符下方一点
        .attr("x2", x)
        .attr("y2", bottomCharY - 2) // 互补链字符上方一点
        .attr("stroke", "#666") // 灰色
        .attr("stroke-width", 1) // 细实线
        .style("opacity", 0.6);
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
            const y = row * doubleStrandHeight;

            // 特征标记线
            const typeConf =
              CONFIG.featureType[feature.type] || CONFIG.featureType.others;

            parent
              .append("line")
              .attr("x1", x + 6)
              .attr("y1", y + doubleStrandHeight + 2)
              .attr("x2", x + 6)
              .attr("y2", y + doubleStrandHeight + 15)
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
    const visibleRows = Math.floor(contentHeight / doubleStrandHeight);
    const maxScrollRows = Math.max(0, totalRows - visibleRows);
    const maxScroll = maxScrollRows * doubleStrandHeight;

    let currentScrollRow = 0;
    let lastRenderedRange = { start: 0, end: 0 };

    // 创建一个透明的滚动区域覆盖整个SVG
    const scrollArea = svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .style("cursor", "default");

    // 虚拟化重渲染函数
    const updateVisibleContent = (scrollOffset) => {
      const bufferRows = 2;
      const currentTopRow = Math.floor(scrollOffset / doubleStrandHeight);
      const startRow = Math.max(0, currentTopRow - bufferRows);
      const endRow = Math.min(
        totalRows,
        currentTopRow + visibleRows + bufferRows
      );

      // 只有当可见范围发生显著变化时才重新渲染
      if (
        startRow !== lastRenderedRange.start ||
        endRow !== lastRenderedRange.end
      ) {
        console.log(
          `Re-rendering due to scroll: ${startRow}-${endRow} (was ${lastRenderedRange.start}-${lastRenderedRange.end})`
        );

        // 清除内容并重新渲染可见区域
        contentGroup.selectAll("*").remove();
        renderSequenceContent(contentGroup, scrollOffset);

        lastRenderedRange = { start: startRow, end: endRow };
      }
    };

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
        const scrollY = -currentScrollRow * doubleStrandHeight;

        // 设置内容组的变换
        contentGroup.attr(
          "transform",
          `translate(${margin.left}, ${margin.top + scrollY})`
        );

        // 虚拟化更新
        updateVisibleContent(currentScrollRow * doubleStrandHeight);
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
