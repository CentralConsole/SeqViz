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

    // 渲染初始序列内容（使用传统方法）
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

    // 使用累积高度进行布局
    let currentY = 0;

    // 为每一行创建包含序列和特征的完整行容器
    for (let i = 0; i < endRow - startRow; i++) {
      const rowIndex = startRow + i;

      // 如果不是第一行，需要计算前面所有行的累积高度
      if (rowIndex > 0) {
        currentY = calculateCumulativeHeight(0, rowIndex);
      }

      const startPos = rowIndex * nucleotidesPerRow;
      const endPos = Math.min(startPos + nucleotidesPerRow, sequence.length);
      const rowSequence = sequence.slice(startPos, endPos);
      const rowComplementSequence = complementSequence.slice(startPos, endPos);

      // 创建完整的行容器（包含序列和特征）
      const rowContainer = contentGroup
        .append("g")
        .attr("class", `sequence-row-${rowIndex}`)
        .attr("transform", `translate(0, ${currentY})`);

      // 渲染双链序列
      renderDoubleStrandRow(
        rowContainer,
        rowIndex,
        0, // 在行容器内使用相对坐标
        startPos,
        rowSequence,
        rowComplementSequence
      );

      // 渲染该行的特征
      renderRowFeatures(rowContainer, rowIndex);
    }

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

  // 计算指定行的高度
  const calculateRowHeight = (rowIndex) => {
    const vSpace = CONFIG.dimensions.vSpace;
    const boxHeight =
      (CONFIG.dimensions.unit * CONFIG.dimensions.boxHeightMultiplier) / 2;

    const rowStart = rowIndex * nucleotidesPerRow;
    const rowEnd = (rowIndex + 1) * nucleotidesPerRow - 1;

    // 计算该行的特征数量
    let maxFeatureRows = 0;
    const rowFeatures = [];

    features.forEach((feature) => {
      const typeConf =
        CONFIG.featureType[feature.type] || CONFIG.featureType.others;
      if (!typeConf.isDisplayed) return;

      feature.location.forEach((loc) => {
        const featureStart = Number(DataUtils.cleanString(loc[0])) - 1;
        const featureEnd =
          loc.length > 1
            ? Number(DataUtils.cleanString(loc[loc.length - 1])) - 1
            : featureStart;

        if (!(featureEnd < rowStart || featureStart > rowEnd)) {
          const segmentStart = Math.max(featureStart, rowStart);
          const segmentEnd = Math.min(featureEnd, rowEnd);

          rowFeatures.push({
            segmentStartCol: segmentStart % nucleotidesPerRow,
            segmentEndCol: segmentEnd % nucleotidesPerRow,
          });
        }
      });
    });

    // 使用相同的行分配算法计算特征行数
    if (rowFeatures.length > 0) {
      const featureRows = [];
      rowFeatures.forEach((item) => {
        let assigned = false;
        for (let featureRow = 0; ; featureRow++) {
          if (!featureRows[featureRow]) featureRows[featureRow] = [];

          const overlap = featureRows[featureRow].some((other) => {
            return !(
              item.segmentEndCol < other.segmentStartCol ||
              item.segmentStartCol > other.segmentEndCol
            );
          });

          if (!overlap) {
            featureRows[featureRow].push(item);
            assigned = true;
            break;
          }
        }
        if (!assigned) {
          featureRows.push([item]);
        }
      });
      maxFeatureRows = featureRows.length;
    }

    // 计算该行的总高度
    const totalFeatureHeight =
      maxFeatureRows > 0 ? vSpace + maxFeatureRows * (boxHeight + vSpace) : 0;
    const totalRowHeight = doubleStrandHeight + totalFeatureHeight;

    return totalRowHeight;
  };

  // 计算从startRow到endRow(不包含)的累积高度
  const calculateCumulativeHeight = (startRow, endRow) => {
    let totalHeight = 0;
    for (let i = startRow; i < endRow; i++) {
      totalHeight += calculateRowHeight(i);
    }
    return totalHeight;
  };

  // 预先计算每行的高度（用于累积布局）
  const calculateRowHeights = (startRow, endRow) => {
    const vSpace = CONFIG.dimensions.vSpace;
    const boxHeight =
      (CONFIG.dimensions.unit * CONFIG.dimensions.boxHeightMultiplier) / 2;

    const rowHeights = [];

    for (let rowIndex = startRow; rowIndex < endRow; rowIndex++) {
      const rowStart = rowIndex * nucleotidesPerRow;
      const rowEnd = (rowIndex + 1) * nucleotidesPerRow - 1;

      // 计算该行的特征数量
      let maxFeatureRows = 0;
      const rowFeatures = [];

      features.forEach((feature) => {
        const typeConf =
          CONFIG.featureType[feature.type] || CONFIG.featureType.others;
        if (!typeConf.isDisplayed) return;

        feature.location.forEach((loc) => {
          const featureStart = Number(DataUtils.cleanString(loc[0])) - 1;
          const featureEnd =
            loc.length > 1
              ? Number(DataUtils.cleanString(loc[loc.length - 1])) - 1
              : featureStart;

          if (!(featureEnd < rowStart || featureStart > rowEnd)) {
            const segmentStart = Math.max(featureStart, rowStart);
            const segmentEnd = Math.min(featureEnd, rowEnd);

            rowFeatures.push({
              segmentStartCol: segmentStart % nucleotidesPerRow,
              segmentEndCol: segmentEnd % nucleotidesPerRow,
            });
          }
        });
      });

      // 使用相同的行分配算法计算特征行数
      if (rowFeatures.length > 0) {
        const featureRows = [];
        rowFeatures.forEach((item) => {
          let assigned = false;
          for (let featureRow = 0; ; featureRow++) {
            if (!featureRows[featureRow]) featureRows[featureRow] = [];

            const overlap = featureRows[featureRow].some((other) => {
              return !(
                item.segmentEndCol < other.segmentStartCol ||
                item.segmentStartCol > other.segmentEndCol
              );
            });

            if (!overlap) {
              featureRows[featureRow].push(item);
              assigned = true;
              break;
            }
          }
          if (!assigned) {
            featureRows.push([item]);
          }
        });
        maxFeatureRows = featureRows.length;
      }

      // 计算该行的总高度
      const totalFeatureHeight =
        maxFeatureRows > 0 ? vSpace + maxFeatureRows * (boxHeight + vSpace) : 0;
      const totalRowHeight = doubleStrandHeight + totalFeatureHeight;

      rowHeights.push(totalRowHeight);
    }

    return rowHeights;
  };

  const renderRowFeatures = (rowContainer, rowIndex) => {
    const vSpace = CONFIG.dimensions.vSpace;
    const boxHeight =
      (CONFIG.dimensions.unit * CONFIG.dimensions.boxHeightMultiplier) / 2;

    const rowStart = rowIndex * nucleotidesPerRow;
    const rowEnd = (rowIndex + 1) * nucleotidesPerRow - 1;

    // 找到与当前行相交的特征
    const rowFeatures = [];

    console.log(
      `🎨 Rendering features for row ${rowIndex} (${rowStart}-${rowEnd}), total features: ${features.length}`
    );
    console.log(
      `🔍 Features array:`,
      features.slice(0, 3).map((f) => f.type)
    ); // 显示前3个特征的类型

    features.forEach((feature) => {
      const typeConf =
        CONFIG.featureType[feature.type] || CONFIG.featureType.others;
      if (!typeConf.isDisplayed) return;

      feature.location.forEach((loc) => {
        const featureStart = Number(DataUtils.cleanString(loc[0])) - 1;
        const featureEnd =
          loc.length > 1
            ? Number(DataUtils.cleanString(loc[loc.length - 1])) - 1
            : featureStart;

        // 检查是否与当前行相交
        if (!(featureEnd < rowStart || featureStart > rowEnd)) {
          const segmentStart = Math.max(featureStart, rowStart);
          const segmentEnd = Math.min(featureEnd, rowEnd);

          rowFeatures.push({
            feature,
            loc,
            segmentStart,
            segmentEnd,
            segmentStartCol: segmentStart % nucleotidesPerRow,
            segmentEndCol: segmentEnd % nucleotidesPerRow,
          });
        }
      });
    });

    console.log(`🔍 Found ${rowFeatures.length} features for row ${rowIndex}`);

    if (rowFeatures.length > 0) {
      // 使用类似LinearSequenceRenderer的行分配算法
      const featureRows = [];
      rowFeatures.forEach((item) => {
        let assigned = false;
        for (let featureRow = 0; ; featureRow++) {
          if (!featureRows[featureRow]) featureRows[featureRow] = [];

          const overlap = featureRows[featureRow].some((other) => {
            return !(
              item.segmentEndCol < other.segmentStartCol ||
              item.segmentStartCol > other.segmentEndCol
            );
          });

          if (!overlap) {
            item._featureRow = featureRow;
            featureRows[featureRow].push(item);
            assigned = true;
            break;
          }
        }
        if (!assigned) {
          item._featureRow = featureRows.length;
          featureRows.push([item]);
        }
      });

      // 创建特征组容器
      console.log(
        `🎯 Creating features group for row ${rowIndex} with ${featureRows.length} feature rows`
      );
      const featuresGroup = rowContainer
        .append("g")
        .attr("class", "features")
        .attr("transform", `translate(0, ${doubleStrandHeight + vSpace})`);

      // 为每个特征行绘制箭头
      featureRows.forEach((featureRowItems, featureRowIndex) => {
        const featureY = featureRowIndex * (boxHeight + vSpace);

        featureRowItems.forEach((item) => {
          const typeConf =
            CONFIG.featureType[item.feature.type] || CONFIG.featureType.others;
          const x = item.segmentStartCol * 12;
          const width = (item.segmentEndCol - item.segmentStartCol + 1) * 12;
          const isComplementary = item.loc[1];

          console.log(
            `🎨 Rendering feature: ${item.feature.type} at x=${x}, width=${width}, y=${featureY}`
          );

          renderFeatureArrow(
            featuresGroup,
            x,
            featureY,
            width,
            boxHeight,
            isComplementary,
            typeConf,
            item.feature
          );
        });
      });

      // 计算实际行高度
      const totalFeatureHeight =
        vSpace + featureRows.length * (boxHeight + vSpace);
      const actualRowHeight = doubleStrandHeight + totalFeatureHeight;
      rowContainer.attr("data-total-height", actualRowHeight);
      return actualRowHeight;
    } else {
      // 没有特征时，记录基础高度
      const actualRowHeight = doubleStrandHeight;
      rowContainer.attr("data-total-height", actualRowHeight);
      return actualRowHeight;
    }
  };

  const renderFeatureArrow = (
    parent,
    x,
    y,
    width,
    boxHeight,
    isComplementary,
    typeConf,
    feature
  ) => {
    if (typeConf.shape === "arrow") {
      // 使用与LinearSequenceRenderer完全相同的箭头参数
      const arrowWidth = Math.min(boxHeight * 1.2, width / 3);
      const arrowNeck = boxHeight * 0.6;
      const rectW = width - arrowWidth;

      let points;
      if (isComplementary) {
        // 向左箭头
        const leftTop = [x + width, y];
        const rightTop = [x + arrowWidth, y];
        const neckTop = [
          x + arrowWidth,
          y + boxHeight / 2 - (boxHeight + arrowNeck) / 2,
        ];
        const tip = [x, y + boxHeight / 2];
        const neckBottom = [
          x + arrowWidth,
          y + boxHeight / 2 + (boxHeight + arrowNeck) / 2,
        ];
        const rightBottom = [x + arrowWidth, y + boxHeight];
        const leftBottom = [x + width, y + boxHeight];
        points = [
          leftTop,
          rightTop,
          neckTop,
          tip,
          neckBottom,
          rightBottom,
          leftBottom,
        ];
      } else {
        // 向右箭头
        const leftTop = [x, y];
        const rightTop = [x + rectW, y];
        const neckTop = [
          x + rectW,
          y + boxHeight / 2 - (boxHeight + arrowNeck) / 2,
        ];
        const tip = [x + width, y + boxHeight / 2];
        const neckBottom = [
          x + rectW,
          y + boxHeight / 2 + (boxHeight + arrowNeck) / 2,
        ];
        const rightBottom = [x + rectW, y + boxHeight];
        const leftBottom = [x, y + boxHeight];
        points = [
          leftTop,
          rightTop,
          neckTop,
          tip,
          neckBottom,
          rightBottom,
          leftBottom,
        ];
      }

      parent
        .append("polygon")
        .attr("points", points.map((p) => p.join(",")).join(" "))
        .attr("fill", typeConf.fill)
        .attr("stroke", typeConf.stroke)
        .attr("stroke-width", CONFIG.styles.box.strokeWidth)
        .attr("class", "arrow-rect")
        .style("cursor", CONFIG.interaction.hover.cursor)
        .on("click", () => handleFeatureClick(feature));
    } else {
      // 绘制矩形（非箭头特征）
      parent
        .append("rect")
        .attr("class", `box ${feature.type}`)
        .attr("x", x)
        .attr("y", y)
        .attr("width", width > 0 ? width : 2)
        .attr("height", boxHeight > 0 ? boxHeight : 2)
        .attr("fill", typeConf.fill)
        .attr("stroke", typeConf.stroke)
        .attr("stroke-width", CONFIG.styles.box.strokeWidth)
        .attr("fill-opacity", CONFIG.styles.box.fillOpacity)
        .style("cursor", CONFIG.interaction.hover.cursor)
        .on("click", () => handleFeatureClick(feature));
    }
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

    // 预计算所有行的累积高度，用于滚动计算
    const rowCumulativeHeights = [];
    let cumulativeHeight = 0;
    for (let i = 0; i < totalRows; i++) {
      rowCumulativeHeights[i] = cumulativeHeight;
      cumulativeHeight += calculateRowHeight(i);
    }
    const totalContentHeight = cumulativeHeight;

    // 计算可见行数（基于平均行高的估算）
    const averageRowHeight = totalContentHeight / totalRows;
    const estimatedVisibleRows = Math.ceil(contentHeight / averageRowHeight);

    // 修复：确保最后一行可以完全显示，添加一些缓冲空间
    // 如果总高度小于可视区域，maxScroll应该为0
    // 否则，maxScroll应该确保最后一行能够完全显示在可视区域内
    const lastRowHeight = calculateRowHeight(totalRows - 1);
    const maxScroll = Math.max(
      0,
      totalContentHeight - contentHeight + lastRowHeight * 0.5
    );

    let currentScrollOffset = 0;
    let lastRenderedRange = { start: 0, end: 0 };

    // 根据滚动偏移量查找当前顶部行
    const findTopRowByOffset = (scrollOffset) => {
      // 修复：当scrollOffset为0或负数时，应该返回第0行
      if (scrollOffset <= 0) {
        return 0;
      }

      // 使用二分查找提高性能并确保准确性
      let left = 0;
      let right = totalRows - 1;

      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const midOffset = rowCumulativeHeights[mid];
        const nextOffset =
          mid + 1 < totalRows
            ? rowCumulativeHeights[mid + 1]
            : totalContentHeight;

        if (scrollOffset >= midOffset && scrollOffset < nextOffset) {
          return mid;
        } else if (scrollOffset < midOffset) {
          right = mid - 1;
        } else {
          left = mid + 1;
        }
      }

      // 备用逻辑：如果二分查找失败，回退到线性查找
      for (let i = 0; i < totalRows; i++) {
        if (rowCumulativeHeights[i] > scrollOffset) {
          return Math.max(0, i - 1);
        }
      }
      return Math.max(0, totalRows - 1);
    };

    // 根据起始行和可见高度计算结束行
    const findEndRowByHeight = (startRow, visibleHeight) => {
      const startOffset = rowCumulativeHeights[startRow];
      const targetOffset = startOffset + visibleHeight;

      for (let i = startRow; i < totalRows; i++) {
        if (rowCumulativeHeights[i] >= targetOffset) {
          return i;
        }
      }
      return totalRows;
    };

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
      const currentTopRow = findTopRowByOffset(scrollOffset);
      let startRow = Math.max(0, currentTopRow - bufferRows);
      let endRow = Math.min(
        totalRows,
        findEndRowByHeight(startRow, contentHeight) + bufferRows
      );

      console.log(
        `🔍 updateVisibleContent: scrollOffset=${Math.round(
          scrollOffset
        )}, topRow=${currentTopRow}, startRow=${startRow}, endRow=${endRow}`
      );

      // 改进：确保边界正确处理
      // 在接近底部时，确保包含足够的行来填满可视区域
      if (endRow === totalRows && startRow > 0) {
        // 如果已经到达最后一行，往前调整startRow以确保填满可视区域
        const visibleHeightFromEnd = calculateCumulativeHeight(
          startRow,
          endRow
        );
        if (visibleHeightFromEnd < contentHeight) {
          // 尝试往前包含更多行
          while (startRow > 0) {
            const newStartRow = startRow - 1;
            const newVisibleHeight = calculateCumulativeHeight(
              newStartRow,
              endRow
            );
            if (
              newVisibleHeight >=
              contentHeight + calculateRowHeight(newStartRow)
            ) {
              break; // 如果加入这一行会超出太多，就停止
            }
            startRow = newStartRow;
          }
        }
      }

      // 确保总是渲染至少一行
      if (endRow <= startRow) {
        endRow = Math.min(totalRows, startRow + 1);
      }

      // 只有当可见范围发生显著变化时才重新渲染
      if (
        startRow !== lastRenderedRange.start ||
        endRow !== lastRenderedRange.end
      ) {
        console.log(
          `🔄 Re-rendering due to scroll: rows ${startRow}-${endRow} (offset: ${Math.round(
            scrollOffset
          )}px, topRow: ${currentTopRow})`
        );

        // 清除内容并重新渲染可见区域
        contentGroup.selectAll("*").remove();
        renderSequenceContentWithOffset(
          contentGroup,
          startRow,
          endRow,
          scrollOffset
        );

        lastRenderedRange = { start: startRow, end: endRow };
      }
    };

    // 改进的滚动事件处理
    svg.on("wheel", (event) => {
      event.preventDefault();

      // 计算滚动增量，添加滚动速度调节
      const scrollSensitivity = 1.0; // 滚动敏感度
      const scrollDelta = event.deltaY * scrollSensitivity;

      // 计算新的滚动偏移量，添加更严格的边界检查
      let newScrollOffset = currentScrollOffset + scrollDelta;

      // 确保滚动偏移在有效范围内
      newScrollOffset = Math.max(0, Math.min(maxScroll, newScrollOffset));

      // 添加滚动边界的微调，确保在边界处有正确的行为
      if (newScrollOffset === 0) {
        // 在顶部时确保显示第一行
        newScrollOffset = 0;
      } else if (newScrollOffset >= maxScroll) {
        // 在底部时确保最后一行可见
        newScrollOffset = maxScroll;
      }

      console.log(
        `Scroll: delta=${Math.round(scrollDelta)}, current=${Math.round(
          currentScrollOffset
        )}, new=${Math.round(newScrollOffset)}, max=${Math.round(maxScroll)}`
      );

      if (Math.abs(newScrollOffset - currentScrollOffset) > 0.1) {
        // 添加最小变化阈值
        currentScrollOffset = newScrollOffset;

        // 只设置基础变换，滚动偏移由虚拟化渲染处理
        contentGroup.attr(
          "transform",
          `translate(${margin.left}, ${margin.top})`
        );

        // 虚拟化更新
        updateVisibleContent(currentScrollOffset);
      }
    });

    // 禁用D3的zoom行为，使用我们自己的滚动逻辑
    svg.on(".zoom", null);

    // 打印初始化信息
    console.log(`🔧 Scroll setup complete:
    - Total rows: ${totalRows}
    - Total content height: ${totalContentHeight}px
    - Content area height: ${contentHeight}px
    - Max scroll: ${Math.round(maxScroll)}px
    - Last row height: ${Math.round(lastRowHeight)}px
    - Average row height: ${Math.round(averageRowHeight)}px`);

    // 注意：不需要在初始化时调用 updateVisibleContent(0)，
    // 因为 renderSequenceContent() 已经正确渲染了初始内容
    // updateVisibleContent(0) 只有在滚动发生时才需要调用
  };

  // 带偏移量的序列内容渲染函数
  const renderSequenceContentWithOffset = (
    contentGroup,
    startRow,
    endRow,
    scrollOffset
  ) => {
    if (!sequence) return;

    console.time("Sequence content rendering with offset");

    // 计算内容的全局Y偏移：负的scrollOffset实现滚动效果
    const globalYOffset = -scrollOffset;

    console.log(
      `📝 Rendering rows ${startRow} to ${endRow} with scrollOffset ${Math.round(
        scrollOffset
      )}px, globalYOffset: ${Math.round(globalYOffset)}`
    );

    // 为每一行创建包含序列和特征的完整行容器
    for (let i = 0; i < endRow - startRow; i++) {
      const rowIndex = startRow + i;

      // 计算该行的绝对Y坐标
      const absoluteY = calculateCumulativeHeight(0, rowIndex);
      // 应用滚动偏移
      const currentY = absoluteY + globalYOffset;

      // 调试：第一行的位置信息
      if (rowIndex === 0) {
        console.log(
          `📍 First row position: absoluteY=${Math.round(
            absoluteY
          )}, globalYOffset=${Math.round(globalYOffset)}, currentY=${Math.round(
            currentY
          )}`
        );
      }

      const startPos = rowIndex * nucleotidesPerRow;
      const endPos = Math.min(startPos + nucleotidesPerRow, sequence.length);
      const rowSequence = sequence.slice(startPos, endPos);
      const rowComplementSequence = complementSequence.slice(startPos, endPos);

      // 创建完整的行容器（包含序列和特征）
      const rowContainer = contentGroup
        .append("g")
        .attr("class", `sequence-row-${rowIndex}`)
        .attr("transform", `translate(0, ${currentY})`);

      // 渲染双链序列
      renderDoubleStrandRow(
        rowContainer,
        rowIndex,
        0, // 在行容器内使用相对坐标
        startPos,
        rowSequence,
        rowComplementSequence
      );

      // 渲染该行的特征
      console.log(
        `🔧 About to render features for row ${rowIndex} in scroll mode`
      );
      renderRowFeatures(rowContainer, rowIndex);
    }

    console.timeEnd("Sequence content rendering with offset");
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
