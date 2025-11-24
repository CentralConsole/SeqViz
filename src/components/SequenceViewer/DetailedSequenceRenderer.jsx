/**
 * @file DetailedSequenceRenderer.jsx
 * @description 详细序列查看器组件
 * 主要职责：
 * 1. 以类似文本阅读器的方式显示序列数据
 * 2. 显示完整的DNA/RNA序列字符
 * 3. 提供特征的详细信息显示
 * 4. 支持序列搜索和位置定位
 * 5. 提供序列行号和位置标记
 */

import React, { useRef, useEffect } from "react";
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
  hideInlineMeta,
}) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);

  // 缓存互补链序列计算结果
  const complementSequenceRef = useRef(null);
  const lastSequenceRef = useRef(null);

  // 缓存累积高度数组
  const rowCumulativeHeightsRef = useRef(null);

  // 获取序列数据
  const sequence = data?.origin || "";
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

    const complementSequence = sequence
      .split("")
      .map((base) => getComplementBase(base))
      .join("");

    // 缓存结果
    lastSequenceRef.current = sequence;
    complementSequenceRef.current = complementSequence;

    return complementSequence;
  };

  const complementSequence = getComplementSequence();

  // 配置参数
  const margin = { top: 100, right: 40, bottom: 100, left: 120 };
  const contentWidth = Math.max(0, width - margin.left - margin.right);
  const contentHeight = Math.max(0, height - margin.top - margin.bottom);

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

    const renderDetailedView = () => {
      // 计算总行数
      const totalRows = Math.ceil(sequence.length / nucleotidesPerRow);

      // 清除之前的渲染内容
      d3.select(svgRef.current).selectAll("*").remove();

      // 主容器
      const svg = d3
        .select(svgRef.current)
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("background-color", CONFIG.styles.background.color);

      // 创建剪切路径，确保内容不会溢出到margin区域
      const defs = svg.append("defs");
      const clipPath = defs.append("clipPath").attr("id", "content-clip");

      clipPath
        .append("rect")
        .attr("x", -120) // 扩展到包含左侧标记区域（5'->3'标记在x=-80）
        .attr("y", 0)
        .attr("width", contentWidth + 120) // 相应增加宽度
        .attr("height", contentHeight);

      // 创建内容组
      const contentGroup = svg
        .append("g")
        .attr("class", "content")
        .attr("transform", `translate(${margin.left}, ${margin.top})`)
        .attr("clip-path", "url(#content-clip)");

      // 添加标题和信息栏
      if (!hideInlineMeta) {
        renderHeader(svg);
      }

      // 渲染初始序列内容（渲染前几行）
      const initialRows = Math.min(5, totalRows);
      for (let i = 0; i < initialRows; i++) {
        const rowIndex = i;
        const absoluteY =
          rowIndex === 0 ? 0 : calculateCumulativeHeight(0, rowIndex);
        const currentY = absoluteY; // 初始时 scrollOffset 为 0

        const startPos = rowIndex * nucleotidesPerRow;
        const endPos = Math.min(startPos + nucleotidesPerRow, sequence.length);
        const rowSequence = sequence.slice(startPos, endPos);
        const rowComplementSequence = complementSequence.slice(
          startPos,
          endPos
        );

        const rowContainer = contentGroup
          .append("g")
          .attr("class", `sequence-row-${rowIndex}`)
          .attr("transform", `translate(0, ${currentY})`);

        renderDoubleStrandRow(
          rowContainer,
          rowIndex,
          0,
          startPos,
          rowSequence,
          rowComplementSequence
        );

        renderRowFeatures(rowContainer, rowIndex);
      }

      // 添加滚动功能
      addScrollBehavior(svg, contentGroup);
    };

    renderDetailedView();
  }, [data, width, height, sequence]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderHeader = (svg) => {
    // 创建固定坐标轴组（移到内容组之后，确保在最上层）
    const axisGroup = svg
      .append("g")
      .attr("class", "axis-group")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // 创建坐标轴和元信息的容器组
    const axisContainer = axisGroup.append("g").attr("class", "axis-container");

    // 添加坐标轴背景
    axisContainer
      .append("rect")
      .attr("x", -margin.left)
      .attr("y", -margin.top)
      .attr("width", contentWidth + margin.left + margin.right)
      .attr("height", margin.top + 20)
      .attr("fill", "transparent")
      .attr("stroke", "transparent");

    // 添加元信息显示
    const metaInfoGroup = axisContainer.append("g").attr("class", "meta-info");

    // 添加标题
    metaInfoGroup
      .append("text")
      .attr("class", "meta-title")
      .attr("x", contentWidth / 2)
      .attr("y", -margin.top + 20)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("fill", CONFIG.styles.axis.text.fill)
      .style("font-family", CONFIG.fonts.primary.family)
      .text(data.definition || "");

    // 添加描述信息
    const description = [
      `Length: ${data.locus?.sequenceLength?.toLocaleString() || 0} bp`,
      `Type: ${data.locus?.moleculeType || ""}`,
      `Division: ${data.locus?.division || ""}`,
    ].join(" | ");

    metaInfoGroup
      .append("text")
      .attr("class", "meta-description")
      .attr("x", contentWidth / 2)
      .attr("y", -margin.top + 40)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", CONFIG.styles.axis.text.fill)
      .style("font-family", CONFIG.fonts.primary.family)
      .text(description);
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

    // 使用单个text元素渲染整行正链核苷酸
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

    // 使用单个text元素渲染整行互补链核苷酸
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
        .attr("y1", topCharY + 2) // 正链字符下方
        .attr("x2", x)
        .attr("y2", bottomCharY - 2) // 互补链字符上方
        .attr("stroke", "#666") // 灰色
        .attr("stroke-width", 1) // 细实线
        .style("opacity", 0.6);
    }

    // 绘制限制性内切酶位点分割线
    if (data.res_site && Array.isArray(data.res_site)) {
      data.res_site.forEach((site) => {
        if (!site.position || !site.enzyme) return;

        const position = parseInt(site.position, 10);
        if (isNaN(position)) return;

        // 检查位点是否在当前行范围内
        const rowStart = startPos;
        const rowEnd = startPos + topSequence.length - 1;

        if (position >= rowStart && position <= rowEnd) {
          const relativePos = position - rowStart;
          const x = relativePos * 12 + 6;

          // 绘制分割线
          rowGroup
            .append("line")
            .attr("class", "restriction-site-divider")
            .attr("x1", x)
            .attr("y1", y - 5) // 正链上方
            .attr("x2", x)
            .attr("y2", complementY + fontSize + 5) // 互补链下方
            .attr("stroke", "#ff6b6b")
            .attr("stroke-width", 2)
            .style("opacity", 0.8);

          // 添加酶名称标签
          rowGroup
            .append("text")
            .attr("class", "restriction-site-label")
            .attr("x", x)
            .attr("y", y - 10)
            .text(site.enzyme)
            .style("font-family", CONFIG.styles.annotation.fontFamily)
            .style("font-size", "8px")
            .style("fill", "#ff6b6b")
            .style("text-anchor", "middle")
            .style("dominant-baseline", "bottom")
            .style("pointer-events", "none");
        }
      });
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
    const bottomSpacing = 30; // 箭头组与下一行序列文本之间的额外间距
    const totalFeatureHeight =
      maxFeatureRows > 0
        ? vSpace + maxFeatureRows * (boxHeight + vSpace) + bottomSpacing
        : 0;
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

  const renderRowFeatures = (rowContainer, rowIndex) => {
    const vSpace = CONFIG.dimensions.vSpace;
    const boxHeight =
      (CONFIG.dimensions.unit * CONFIG.dimensions.boxHeightMultiplier) / 2;

    const rowStart = rowIndex * nucleotidesPerRow;
    const rowEnd = (rowIndex + 1) * nucleotidesPerRow - 1;

    // 找到与当前行相交的特征
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
      const bottomSpacing = 15; // 箭头组与下一行序列文本之间的额外间距
      const totalFeatureHeight =
        vSpace + featureRows.length * (boxHeight + vSpace) + bottomSpacing;
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

      // 添加特征文字标签
      const text =
        feature.information?.gene ||
        feature.information?.product ||
        feature.type;

      if (text && width > 20) {
        // 只有箭头足够宽时才显示文字
        const textX = x + width / 2; // 箭头中心位置
        const textY = y + boxHeight / 2; // 箭头垂直中心

        parent
          .append("text")
          .attr("class", "feature-label")
          .attr("x", textX)
          .attr("y", textY)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .style("font-family", CONFIG.fonts.primary.family)
          .style("font-size", `${Math.min(fontSize, boxHeight * 0.7)}px`)
          .style("fill", CONFIG.styles.annotation.fillDark)
          .style("pointer-events", "none") // 防止文字阻止箭头点击
          .style("user-select", "none") // 防止文字被选中
          .text(text);
      }
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

      // 添加特征文字标签
      const text =
        feature.information?.gene ||
        feature.information?.product ||
        feature.type;

      if (text && width > 20) {
        // 只有特征足够宽时才显示文字
        const textX = x + width / 2; // 矩形中心位置
        const textY = y + boxHeight / 2; // 矩形垂直中心

        parent
          .append("text")
          .attr("class", "feature-label")
          .attr("x", textX)
          .attr("y", textY)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .style("font-family", CONFIG.fonts.primary.family)
          .style("font-size", `${Math.min(fontSize, boxHeight * 0.7)}px`)
          .style("fill", CONFIG.styles.annotation.fillDark)
          .style("pointer-events", "none") // 防止文字阻止矩形点击
          .style("user-select", "none") // 防止文字被选中
          .text(text);
      }
    }
  };

  const getNucleotideColor = (nucleotide) => {
    const colors = detailedConfig.nucleotideColors;
    return colors[nucleotide.toUpperCase()] || colors.default;
  };

  const handleFeatureClick = (feature) => {
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

    // 将累积高度数组存储到ref中，供其他函数使用
    rowCumulativeHeightsRef.current = rowCumulativeHeights;

    let currentScrollOffset = 0;

    // 根据滚动偏移量查找当前顶部行
    const findTopRowByOffset = (scrollOffset) => {
      if (scrollOffset <= 0) {
        return 0; // 负偏移时返回第0行
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
          const result = Math.max(0, i - 1);
          return result;
        }
      }
      return 0; // 如果所有查找都失败，返回第0行
    };

    // 虚拟化重渲染函数
    const updateVisibleContent = (scrollOffset) => {
      const bufferRows = 2;

      const currentTopRow = findTopRowByOffset(scrollOffset);
      let startRow = Math.max(0, currentTopRow - bufferRows);

      // 计算结束行
      let endRow = Math.min(totalRows, startRow + 10);

      // 确保总是渲染至少一行
      if (endRow <= startRow) {
        endRow = Math.min(totalRows, startRow + 1);
      }

      contentGroup.selectAll("*").remove();
      for (let i = startRow; i < endRow; i++) {
        renderVirtualRow(contentGroup, i, scrollOffset);
      }
    };

    // 渲染虚拟行
    const renderVirtualRow = (contentGroup, rowIndex, scrollOffset) => {
      // 负数行不渲染任何内容
      if (rowIndex < 0) {
        return;
      }

      // 超出范围的行不渲染
      if (rowIndex >= totalRows) {
        return;
      }

      // 正常行：使用预计算的累积高度数组
      const absoluteY = rowCumulativeHeights[rowIndex];
      const startPos = rowIndex * nucleotidesPerRow;
      const endPos = Math.min(startPos + nucleotidesPerRow, sequence.length);
      const rowSequence = sequence.slice(startPos, endPos);
      const rowComplementSequence = complementSequence.slice(startPos, endPos);

      const currentY = absoluteY - scrollOffset;

      const rowContainer = contentGroup
        .append("g")
        .attr("class", `sequence-row-${rowIndex}`)
        .attr("transform", `translate(0, ${currentY})`);

      // 渲染实际的序列内容
      renderDoubleStrandRow(
        rowContainer,
        rowIndex,
        0,
        startPos,
        rowSequence,
        rowComplementSequence
      );

      renderRowFeatures(rowContainer, rowIndex);
    };

    // 滚动事件处理
    svg.on("wheel", (event) => {
      event.preventDefault();

      const scrollSensitivity = 1.0;
      const scrollDelta = event.deltaY * scrollSensitivity;

      let newScrollOffset = currentScrollOffset + scrollDelta;

      // 添加边界限制
      const maxScroll = Math.max(0, totalContentHeight - contentHeight);
      newScrollOffset = Math.max(0, Math.min(maxScroll, newScrollOffset));

      if (Math.abs(newScrollOffset - currentScrollOffset) > 0.01) {
        currentScrollOffset = newScrollOffset;

        contentGroup.attr(
          "transform",
          `translate(${margin.left}, ${margin.top})`
        );

        updateVisibleContent(currentScrollOffset);
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
    </div>
  );
};

export default DetailedSequenceViewer;
