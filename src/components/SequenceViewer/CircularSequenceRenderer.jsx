import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { CONFIG } from "../../config/config";

/**
 * CircularSequenceRenderer组件 - 使用D3.js实现环形展示DNA/RNA序列
 * @param {Object} props
 * @param {Object} props.data - 序列数据对象
 * @param {number} props.width - 容器宽度
 * @param {number} props.height - 容器高度
 * @param {Function} [props.onFeatureClick] - 特征点击事件处理函数
 */
const CircularSequenceRenderer = ({ data, width, height, onFeatureClick }) => {
  const svgRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const { sequenceViewer } = CONFIG;

  useEffect(() => {
    if (!svgRef.current || !data) return;

    // 键盘事件处理：监听Ctrl键状态
    const handleKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey) {
        // 支持Mac的Command键
        setIsCtrlPressed(true);
      }
    };

    const handleKeyUp = (event) => {
      if (!event.ctrlKey && !event.metaKey) {
        setIsCtrlPressed(false);
      }
    };

    // 处理窗口失焦时的情况
    const handleWindowBlur = () => {
      setIsCtrlPressed(false);
    };

    // 添加键盘事件监听器
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    // 清除之前的SVG内容
    d3.select(svgRef.current).selectAll("*").remove();

    // 创建SVG并设置视口
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%")
      .style("height", "100%");

    // 创建主容器组（不设置静态变换，让zoom behavior统一管理）
    const mainGroup = svg.append("g");

    // 获取序列总长度
    const totalLength = data.locus ? data.locus.sequenceLength : 0;

    // 计算半径 - 调整半径计算方式
    const radius = Math.min(width, height) * 0.35; // 基础半径
    const innerRadius = radius * 0.8; // 增大内圈半径

    // 创建角度比例尺
    const angleScale = d3
      .scaleLinear()
      .domain([0, totalLength])
      .range([0, 2 * Math.PI]); // 从0度开始，到360度结束

    // 绘制内圈
    mainGroup
      .append("circle")
      .attr("r", innerRadius)
      .attr("fill", "none")
      .attr("stroke", CONFIG.styles.axis.stroke)
      .attr("stroke-width", CONFIG.styles.axis.strokeWidth);

    // 添加圆心处的元信息显示
    const metaInfoGroup = mainGroup.append("g").attr("class", "meta-info");

    // 计算内切四边形的尺寸 (内圆的内切正方形)
    // 内切正方形的边长 = 半径 * √2，但我们留一些边距
    const inscribedSquareSize = innerRadius * Math.sqrt(2) * 0.8; // 80%的内切正方形尺寸作为安全区域
    const maxTextWidth = inscribedSquareSize;

    // 多行文本处理函数
    const wrapText = (text, maxWidth, fontSize, maxLines = 3) => {
      if (!text) return [];

      // 估算字符宽度（粗略估计）
      const avgCharWidth = fontSize * 0.6;
      const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);

      const words = text.split(" ");
      const lines = [];
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;

        if (testLine.length <= maxCharsPerLine) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            // 单个词太长，强制截断
            lines.push(word.substring(0, maxCharsPerLine - 3) + "...");
            currentLine = "";
          }

          // 限制最大行数
          if (lines.length >= maxLines) {
            break;
          }
        }
      }

      if (currentLine && lines.length < maxLines) {
        lines.push(currentLine);
      }

      // 如果超过最大行数，在最后一行添加省略号
      if (
        lines.length === maxLines &&
        words.length > lines.join(" ").split(" ").length
      ) {
        const lastLine = lines[maxLines - 1];
        lines[maxLines - 1] =
          lastLine.substring(0, lastLine.length - 3) + "...";
      }

      return lines;
    };

    // 添加标题 - 支持多行显示
    const titleText = data.definition || "";
    const titleLines = wrapText(titleText, maxTextWidth, 14, 3);
    const lineHeight = 16;
    const titleStartY = -50; // 给标题更多上方空间

    titleLines.forEach((line, index) => {
      metaInfoGroup
        .append("text")
        .attr("class", "meta-title")
        .attr("x", 0)
        .attr("y", titleStartY + index * lineHeight)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", CONFIG.styles.axis.text.fill)
        .style("font-family", CONFIG.styles.axis.text.fontFamily)
        .text(line);
    });

    // 如果有标题内容，添加完整标题作为tooltip到第一行
    if (titleText && titleLines.length > 0) {
      metaInfoGroup
        .selectAll(".meta-title")
        .filter((d, i) => i === 0)
        .append("title")
        .text(titleText);
    }

    // 计算其他元素的起始位置（基于标题行数动态调整）
    const otherElementsStartY =
      titleStartY + titleLines.length * lineHeight + 10;

    // 添加序列长度信息
    metaInfoGroup
      .append("text")
      .attr("class", "meta-length")
      .attr("x", 0)
      .attr("y", otherElementsStartY)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .style("fill", CONFIG.styles.axis.text.fill)
      .style("font-family", CONFIG.styles.axis.text.fontFamily)
      .text(`Length: ${data.locus?.sequenceLength?.toLocaleString() || 0} bp`);

    // 添加分子类型信息
    const moleculeType = data.locus?.moleculeType || "";
    if (moleculeType) {
      metaInfoGroup
        .append("text")
        .attr("class", "meta-molecule-type")
        .attr("x", 0)
        .attr("y", otherElementsStartY + 18)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", CONFIG.styles.axis.text.fill)
        .style("font-family", CONFIG.styles.axis.text.fontFamily)
        .text(`Type: ${moleculeType}`);
    }

    // 添加分区信息
    const division = data.locus?.division || "";
    if (division) {
      metaInfoGroup
        .append("text")
        .attr("class", "meta-division")
        .attr("x", 0)
        .attr("y", otherElementsStartY + 36)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", CONFIG.styles.axis.text.fill)
        .style("font-family", CONFIG.styles.axis.text.fontFamily)
        .text(`Division: ${division}`);
    }

    let maxRadius = innerRadius; // 初始化最大半径

    // 绘制特征
    if (data.features && Array.isArray(data.features)) {
      const featureGroup = mainGroup.append("g").attr("class", "features");

      // 处理特征数据，计算径向位置和各段弧线
      const processedFeatures = data.features
        .map((feature) => {
          // 检查特征类型是否应该显示
          const typeConfig =
            CONFIG.featureType[feature.type] || CONFIG.featureType.others;
          if (!typeConfig.isDisplayed) {
            return null;
          }

          // 验证特征位置数据的有效性
          if (
            !feature.location ||
            !Array.isArray(feature.location) ||
            feature.location.length === 0
          ) {
            console.warn("Invalid feature location:", feature);
            return null;
          }

          // 处理特征的所有段
          const processedSegments = [];
          let firstSegmentMidAngle = null; // 用于确定特征的主角度

          feature.location.forEach((loc, locIndex) => {
            // 验证每个段的位置数据
            if (!Array.isArray(loc) || loc.length < 2) {
              console.warn("Invalid location array:", loc);
              return;
            }
            // 解析段的起始和结束位置
            const start = parseInt(loc[0], 10);
            const stop = parseInt(loc[loc.length - 1], 10);
            if (isNaN(start) || isNaN(stop)) {
              console.warn("Invalid start/stop values:", { start, stop });
              return;
            }

            // 将序列位置转换为角度
            const startAngle = angleScale(start);
            const stopAngle = angleScale(stop);

            // 获取方向信息（第二个元素的布尔值）
            const isReverse = loc.length > 1 ? loc[1] : false;

            //段
            processedSegments.push({
              start,
              stop,
              isFirst: locIndex === 0,
              isTextSegment: locIndex === 0,
              isReverse, // 添加方向信息
            });

            // 计算原始段的中点角度（用于确定特征的主角度）
            if (locIndex === 0 && firstSegmentMidAngle === null) {
              firstSegmentMidAngle = (startAngle + stopAngle) / 2;
            }
          });

          // 如果处理后没有有效段，则跳过该特征
          if (processedSegments.length === 0) {
            console.warn(
              "Feature has no valid segments after processing:",
              feature
            );
            return null;
          }

          // 计算特征的整体角度范围（用于重叠检测）
          let minAngle = 2 * Math.PI;
          let maxAngle = 0;

          processedSegments.forEach(({ start, stop }) => {
            const startAngle = angleScale(start);
            const stopAngle = angleScale(stop);
            minAngle = Math.min(minAngle, startAngle);
            maxAngle = Math.max(maxAngle, stopAngle);
          });

          // 返回处理后的特征对象
          return {
            ...feature,
            segments: processedSegments,
            angle:
              firstSegmentMidAngle !== null
                ? firstSegmentMidAngle
                : angleScale(processedSegments[0].start),
            radialOffset: 0,
            totalLength: feature.location.reduce((sum, loc) => {
              const start = parseInt(loc[0], 10);
              const stop = parseInt(loc[loc.length - 1], 10);
              if (isNaN(start) || isNaN(stop)) return sum;
              return sum + (stop - start);
            }, 0),
            angleRange: {
              min: minAngle,
              max: maxAngle,
            },
          };
        })
        .filter(Boolean);

      console.log("Processed Features:", processedFeatures);

      // 计算特征之间的重叠并调整径向位置
      const labelHeight = CONFIG.dimensions.vSpace; // 标签高度
      const minSpacing = 0; // 最小安全间距
      const layerSpacing = CONFIG.dimensions.vSpace; // 层间距

      // 按特征的总长度降序排序，优先处理较长的特征
      processedFeatures.sort((a, b) => b.totalLength - a.totalLength);

      // 计算每个特征的径向位置，避免重叠
      for (let i = 0; i < processedFeatures.length; i++) {
        const current = processedFeatures[i];
        let layer = 0; // 从最内层开始尝试
        let hasOverlap = true;

        // 尝试不同的层，直到找到没有重叠的位置
        while (hasOverlap) {
          hasOverlap = false;
          // 检查与已放置特征的重叠情况
          for (let j = 0; j < i; j++) {
            const prev = processedFeatures[j];
            if (prev.radialOffset === layer) {
              // 使用角度范围检查重叠
              const currentRange = current.angleRange;
              const prevRange = prev.angleRange;

              // 检查角度范围是否重叠
              const hasAngleOverlap =
                // 正常情况下的重叠检查
                (!currentRange.hasCrossZero &&
                  !prevRange.hasCrossZero &&
                  currentRange.min <= prevRange.max &&
                  currentRange.max >= prevRange.min) ||
                // 当前跨越0与prev不跨越0
                (currentRange.hasCrossZero &&
                  !prevRange.hasCrossZero &&
                  (currentRange.min <= prevRange.max ||
                    currentRange.max >= prevRange.min)) ||
                // prev跨越0与当前不跨越0
                (!currentRange.hasCrossZero &&
                  prevRange.hasCrossZero &&
                  (prevRange.min <= currentRange.max ||
                    prevRange.max >= currentRange.min)) ||
                // 都跨越0
                (currentRange.hasCrossZero && prevRange.hasCrossZero);

              // 简单的角度差检查作为辅助（可能需要根据实际情况调整或移除）
              const angleDiff = Math.abs(current.angle - prev.angle);
              const minAngleDiff = (labelHeight + minSpacing) / radius; // 使用一个基础的间距判断
              if (angleDiff < minAngleDiff) {
                // 如果主角度太接近，也认为是潜在重叠，强制分层
                // hasOverlap = true; // 先不强制，依赖角度范围检查
              }

              if (hasAngleOverlap) {
                hasOverlap = true;
                break;
              }
            }
          }
          // 如果发生重叠，尝试下一层
          if (hasOverlap) {
            layer++;
          }
        }
        // 设置特征的径向偏移
        current.radialOffset = layer;
      }

      // 动态计算每层的实际半径
      const layerRadii = new Map(); // 存储每层的内径和外径

      // 计算各层半径，保持紧凑布局
      const maxLayer = Math.max(
        ...processedFeatures.map((f) => f.radialOffset)
      );
      for (let layer = 0; layer <= maxLayer; layer++) {
        if (layer === 0) {
          layerRadii.set(0, {
            inner: innerRadius + 8,
            outer: innerRadius + 24,
          });
        } else {
          // 基于上一层的外径，只添加小间隔
          const prevOuter = layerRadii.get(layer - 1).outer;
          layerRadii.set(layer, {
            inner: prevOuter + 8, // 只留8像素间隔
            outer: prevOuter + 24, // 16像素厚度的弧
          });
        }
      }

      // 创建特征弧生成器（用于绘制单个段）
      const segmentArc = d3
        .arc()
        .innerRadius(
          (d) =>
            layerRadii.get(d.radialOffset)?.inner ||
            innerRadius + 8 + d.radialOffset * layerSpacing
        )
        .outerRadius(
          (d) =>
            layerRadii.get(d.radialOffset)?.outer ||
            innerRadius + 24 + d.radialOffset * layerSpacing
        );

      // 按层级分组特征
      const featuresByLayer = new Map();
      processedFeatures.forEach((feature) => {
        const layer = feature.radialOffset;
        if (!featuresByLayer.has(layer)) {
          featuresByLayer.set(layer, []);
        }
        featuresByLayer.get(layer).push(feature);
      });

      // 逐层渲染
      let currentLayerMaxRadius = innerRadius + 24; // 初始最大半径

      for (let layer = 0; layer <= maxLayer; layer++) {
        const layerFeatures = featuresByLayer.get(layer) || [];

        // 更新当前层的半径（基于前一层的最大半径）
        if (layer > 0) {
          layerRadii.set(layer, {
            inner: currentLayerMaxRadius + 8,
            outer: currentLayerMaxRadius + 24,
          });
        }

        // 创建当前层的组
        const layerGroup = featureGroup
          .append("g")
          .attr("class", `layer-${layer}`);

        // 渲染当前层的所有特征
        const featureElements = layerGroup
          .selectAll("g.feature")
          .data(layerFeatures)
          .enter()
          .append("g")
          .attr("class", "feature");

        // 绘制特征的每个段的弧框
        featureElements.each(function (d, featureIndex) {
          const featureElement = d3.select(this);

          d.segments.forEach((segment, segmentIndex) => {
            let startAngle = angleScale(segment.start);
            let stopAngle = angleScale(segment.stop);

            if (startAngle > stopAngle) {
              [startAngle, stopAngle] = [stopAngle, startAngle];
            }

            // 如果特征类型需要箭头，则缩短弧长以补偿箭头占用的空间
            const typeConfig =
              CONFIG.featureType[d.type] || CONFIG.featureType.others;
            if (typeConfig.shape === "arrow") {
              const currentLayerRadii = layerRadii.get(d.radialOffset);
              const innerR =
                currentLayerRadii?.inner ||
                innerRadius + 8 + d.radialOffset * layerSpacing;
              const outerR =
                currentLayerRadii?.outer ||
                innerRadius + 24 + d.radialOffset * layerSpacing;

              // 计算弧长并确定箭头占用的角度
              const arcLength =
                ((stopAngle - startAngle) * (innerR + outerR)) / 2;
              const maxArrowHeight = arcLength / 3;
              const baseArrowLength = (outerR - innerR) * 1.0;
              const arrowLength = Math.min(baseArrowLength, maxArrowHeight);

              // 计算箭头在角度上占用的空间
              const midRadius = (innerR + outerR) / 2;
              const arrowAngleOffset = arrowLength / midRadius;

              // 根据方向缩短弧长
              if (segment.isReverse) {
                startAngle += arrowAngleOffset; // 反向箭头在起点，缩短起点
              } else {
                stopAngle -= arrowAngleOffset; // 正向箭头在终点，缩短终点
              }
            }

            const segmentD = segmentArc({
              startAngle,
              endAngle: stopAngle,
              radialOffset: d.radialOffset,
            });

            featureElement
              .append("path")
              .attr("d", segmentD)
              .attr(
                "fill",
                (CONFIG.featureType[d.type] || CONFIG.featureType.others).fill
              )
              .attr(
                "stroke",
                (CONFIG.featureType[d.type] || CONFIG.featureType.others).stroke
              )
              .attr("stroke-width", CONFIG.styles.box.strokeWidth)
              .attr("fill-opacity", CONFIG.styles.box.fillOpacity)
              .style("cursor", CONFIG.interaction.hover.cursor)
              .on("click", () => onFeatureClick?.(d))
              .on("mouseover", function () {
                // 高亮特征弧
                featureElement
                  .selectAll("path")
                  .attr(
                    "stroke",
                    (CONFIG.featureType[d.type] || CONFIG.featureType.others)
                      .stroke
                  )
                  .attr(
                    "stroke-width",
                    CONFIG.styles.box.strokeWidth *
                      CONFIG.interaction.hover.strokeWidthMultiplier
                  );

                // 高亮对应的文本标签
                featureElement
                  .selectAll("text")
                  .style("font-weight", CONFIG.interaction.hover.fontWeight)
                  .style("fill", CONFIG.styles.annotation.fillDark)
                  .style("text-shadow", CONFIG.interaction.hover.textShadow);

                // 高亮文本背景
                featureElement
                  .selectAll(".text-bg")
                  .style("fill", CONFIG.interaction.hover.textBackground.fill)
                  .style(
                    "stroke",
                    CONFIG.interaction.hover.textBackground.stroke
                  )
                  .style(
                    "stroke-width",
                    CONFIG.interaction.hover.textBackground.strokeWidth
                  );
              })
              .on("mouseout", function () {
                // 恢复特征弧样式
                featureElement
                  .selectAll("path")
                  .attr(
                    "stroke",
                    (CONFIG.featureType[d.type] || CONFIG.featureType.others)
                      .stroke
                  )
                  .attr("stroke-width", CONFIG.styles.box.strokeWidth);

                // 恢复文本标签样式
                featureElement
                  .selectAll("text")
                  .style("font-weight", CONFIG.interaction.normal.fontWeight)
                  .style("fill", CONFIG.styles.annotation.fillDark)
                  .style("text-shadow", CONFIG.interaction.normal.textShadow);

                // 恢复文本背景样式
                featureElement
                  .selectAll(".text-bg")
                  .style("fill", CONFIG.interaction.normal.textBackground.fill)
                  .style(
                    "stroke",
                    CONFIG.interaction.normal.textBackground.stroke
                  );
              })
              .each(function () {
                // 为每个段创建专门的textPath弧形（位于内外环中间）
                if (segment.isTextSegment) {
                  const textContent =
                    d.information?.gene || d.information?.product || d.type;
                  const estimatedTextLength =
                    textContent.length *
                    CONFIG.styles.annotation.fontSize *
                    0.6;

                  // 获取当前层的内外半径
                  const currentLayerRadii = layerRadii.get(d.radialOffset);
                  const innerR = currentLayerRadii?.inner;
                  const outerR = currentLayerRadii?.outer;
                  const textRadiusOffset = 5;

                  // 计算中间半径作为textPath的半径
                  const textPathRadius =
                    (innerR + outerR) / 2 - textRadiusOffset;

                  // 创建专门的textPath弧形生成器
                  const textPathArc = d3
                    .arc()
                    .innerRadius(textPathRadius)
                    .outerRadius(textPathRadius + 1) // 极薄的弧形用于提取路径
                    .startAngle(startAngle)
                    .endAngle(stopAngle);

                  // 生成中间弧形路径
                  const textPathD = textPathArc();

                  // 使用正则表达式提取弧形外环路径
                  const firstArcSection = /(^.+?)L/;
                  const arcMatch = firstArcSection.exec(textPathD)?.[1];

                  if (arcMatch) {
                    let cleanArc = arcMatch.replace(/,/g, " ");

                    // 估算路径长度来判断是否适合显示文本
                    const approximatePathLength =
                      (stopAngle - startAngle) * textPathRadius;

                    if (estimatedTextLength < approximatePathLength * 0.9) {
                      // 文本长度合适，处理路径翻转逻辑
                      let finalPath = cleanArc;

                      // 计算段的角度范围来判断是否需要翻转文本路径
                      const segmentMidAngle = (startAngle + stopAngle) / 2;

                      // 检查是否在底部半圆（Pi/2 到 3Pi/2）
                      const normalizedMidAngle =
                        segmentMidAngle % (2 * Math.PI);
                      const isInBottomHalf =
                        normalizedMidAngle > Math.PI / 2 &&
                        normalizedMidAngle < (3 * Math.PI) / 2;

                      if (isInBottomHalf) {
                        // 翻转路径方向，参考upsidedown逻辑
                        const startLoc = /M(.*?)A/;
                        const middleLoc = /A(.*?)0 0 1/;
                        const endLoc = /0 0 1 (.*?)$/;

                        const startMatch = startLoc.exec(finalPath);
                        const middleMatch = middleLoc.exec(finalPath);
                        const endMatch = endLoc.exec(finalPath);

                        if (startMatch && middleMatch && endMatch) {
                          // 翻转起点和终点，并将sweep-flag从1改为0
                          const newStart = endMatch[1];
                          const newEnd = startMatch[1];
                          const middleSec = middleMatch[1];
                          finalPath =
                            "M" +
                            newStart +
                            "A" +
                            middleSec +
                            "0 0 0 " +
                            newEnd;
                        }
                      }

                      // 创建不可见的textPath弧形
                      featureElement
                        .append("path")
                        .attr(
                          "id",
                          `text-path-${layer}-${featureIndex}-${segmentIndex}`
                        )
                        .attr("d", finalPath)
                        .attr("fill", "none")
                        .attr("stroke", "none")
                        .style("opacity", 0); // 完全不可见
                    }
                  }
                }
              })
              .each(function () {
                // 检查特征类型的shape属性，只对arrow类型生成箭头
                const typeConfig =
                  CONFIG.featureType[d.type] || CONFIG.featureType.others;
                if (typeConfig.shape !== "arrow") {
                  return; // 如果不是arrow类型，跳过箭头生成
                }

                // 从SVG字符串中提取路径信息用于生成箭头
                const pathElement = d3.select(this);
                const pathNode = pathElement.node();
                if (pathNode) {
                  const svgString = pathNode.outerHTML;

                  // 从SVG字符串中提取d属性（路径数据）
                  const dAttributeMatch = svgString.match(/d="([^"]+)"/);
                  if (dAttributeMatch) {
                    const pathData = dAttributeMatch[1];

                    console.log("实际路径数据:", pathData);

                    // 使用宽松的弧形匹配来提取所有弧形命令
                    const looseArcMatches = [
                      ...pathData.matchAll(/A[^A]*?(?=A|L|Z|$)/g),
                    ];
                    console.log("宽松弧形匹配结果:", looseArcMatches);

                    let outerArc = null;
                    let innerArc = null;

                    if (looseArcMatches.length > 0) {
                      // 手动解析每个弧形命令
                      const parseArcCommand = (arcString) => {
                        // 移除开头的'A'并清理字符串
                        const paramString = arcString
                          .replace(/^A\s*/, "")
                          .trim();
                        console.log("解析弧形参数字符串:", paramString);

                        // 使用更灵活的方式提取数字 - 支持逗号、空格分隔和科学记数法
                        const numbers = paramString.match(
                          /([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/g
                        );
                        console.log("提取的数字:", numbers);

                        if (numbers && numbers.length >= 7) {
                          return {
                            rx: parseFloat(numbers[0]),
                            ry: parseFloat(numbers[1]),
                            rotation: parseFloat(numbers[2]),
                            largeArcFlag: parseInt(numbers[3]),
                            sweepFlag: parseInt(numbers[4]),
                            endX: parseFloat(numbers[5]),
                            endY: parseFloat(numbers[6]),
                            command: arcString.trim(),
                          };
                        }
                        return null;
                      };

                      // 解析第一个弧形（外圆弧）
                      outerArc = parseArcCommand(looseArcMatches[0][0]);
                      console.log("解析的外圆弧:", outerArc);

                      // 如果有第二个弧形，解析为内圆弧
                      if (looseArcMatches.length >= 2) {
                        innerArc = parseArcCommand(looseArcMatches[1][0]);
                        console.log("解析的内圆弧:", innerArc);
                      }
                    } else {
                      console.log("没有找到任何弧形命令");
                    }

                    // 提取直线段
                    const lineMatches = [
                      ...pathData.matchAll(/L\s*([-\d.]+)[,\s]+([-\d.]+)/g),
                    ];

                    if (lineMatches.length >= 2) {
                      startLineSegment = {
                        type: "start",
                        index: 0,
                        x: parseFloat(lineMatches[0][1]),
                        y: parseFloat(lineMatches[0][2]),
                        command: lineMatches[0][0],
                        description: "起点到外圆弧的连接线",
                      };

                      endLineSegment = {
                        type: "end",
                        index: 1,
                        x: parseFloat(lineMatches[1][1]),
                        y: parseFloat(lineMatches[1][2]),
                        command: lineMatches[1][0],
                        description: "外圆弧到内圆弧的连接线",
                      };
                    }

                    // 根据方向在弧的起点或终点添加箭头
                    if (outerArc) {
                      console.log("开始生成箭头 - outerArc:", outerArc);
                      console.log("innerArc:", innerArc);
                      console.log("segment isReverse:", segment.isReverse);

                      // 根据方向决定箭头位置
                      let arrowX, arrowY, arrowAngle, tangentAngle;

                      if (segment.isReverse) {
                        // 箭头在弧的起点处（路径的起始位置）
                        const startMatch = pathData.match(
                          /M\s*([-\d.e]+)[,\s]+([-\d.e]+)/
                        );
                        if (startMatch) {
                          arrowX = parseFloat(startMatch[1]);
                          arrowY = parseFloat(startMatch[2]);
                          arrowAngle = Math.atan2(arrowY, arrowX);
                          tangentAngle = arrowAngle - Math.PI / 2; // 反向切线
                        }
                      } else {
                        // 箭头在弧的终点处（默认行为）
                        arrowX = outerArc.endX;
                        arrowY = outerArc.endY;
                        arrowAngle = Math.atan2(arrowY, arrowX);
                        tangentAngle = arrowAngle + Math.PI / 2; // 正向切线
                      }

                      // 获取当前层的内外半径
                      const currentLayerRadii = layerRadii.get(d.radialOffset);
                      const innerR = currentLayerRadii?.inner;
                      const outerR = currentLayerRadii?.outer;

                      // 获取原始路径的起点
                      const startMatch = pathData.match(
                        /M\s*([-\d.e]+)[,\s]+([-\d.e]+)/
                      );
                      if (startMatch) {
                        let arrowPath;

                        // 箭头参数
                        const arrowHalf = 5; // 箭头宽度的一半

                        if (innerArc && innerR && outerR) {
                          // 有内外圆弧的情况：重新构建完整的带箭头弧形

                          // 计算弧长并限制箭头高度
                          const arcLength =
                            ((stopAngle - startAngle) * (innerR + outerR)) / 2; // 使用中间半径计算弧长
                          const maxArrowHeight = arcLength / 3; // 箭头高度不超过弧长的1/3
                          const baseArrowLength = (outerR - innerR) * 1.0; // 基于弧厚度的初始箭头长度
                          const arrowLength = Math.min(
                            baseArrowLength,
                            maxArrowHeight
                          ); // 取较小值作为最终箭头高度

                          // 提取弧形的实际端点坐标
                          let outerEndPoint, innerEndPoint;

                          if (segment.isReverse) {
                            // 反向：箭头在弧的起点
                            outerEndPoint = [arrowX, arrowY]; // 外圆弧起点

                            // 提取内圆弧起点（路径末尾的坐标）
                            const innerArcEndMatch = pathData.match(
                              /.*\s+([-\d.e]+)[,\s]+([-\d.e]+)\s*Z?\s*$/
                            );
                            innerEndPoint = innerArcEndMatch
                              ? [
                                  parseFloat(innerArcEndMatch[1]),
                                  parseFloat(innerArcEndMatch[2]),
                                ]
                              : [
                                  Math.cos(arrowAngle) * innerR,
                                  Math.sin(arrowAngle) * innerR,
                                ];
                          } else {
                            // 正向：箭头在弧的终点
                            outerEndPoint = [outerArc.endX, outerArc.endY]; // 外圆弧终点

                            // 提取内圆弧起点（第一个L命令后的坐标）
                            const innerArcStartMatch = pathData.match(
                              /L\s*([-\d.e]+)[,\s]+([-\d.e]+)/
                            );
                            innerEndPoint = innerArcStartMatch
                              ? [
                                  parseFloat(innerArcStartMatch[1]),
                                  parseFloat(innerArcStartMatch[2]),
                                ]
                              : [
                                  Math.cos(arrowAngle) * innerR,
                                  Math.sin(arrowAngle) * innerR,
                                ];
                          }

                          // 计算箭头尖端：从弧端点的中点沿切线方向延伸
                          const midX =
                            (outerEndPoint[0] + innerEndPoint[0]) / 2;
                          const midY =
                            (outerEndPoint[1] + innerEndPoint[1]) / 2;
                          const tip = [
                            midX + Math.cos(tangentAngle) * arrowLength,
                            midY + Math.sin(tangentAngle) * arrowLength,
                          ];

                          // 解决方案：在原始弧的特定位置插入箭头，而不是修改弧的几何参数
                          // 使用原始的外圆弧和内圆弧路径，在外圆弧的终点位置插入箭头三角形

                          // 提取原始路径的各个部分
                          const startPoint = [
                            parseFloat(startMatch[1]),
                            parseFloat(startMatch[2]),
                          ];

                          // 根据方向构建路径
                          if (segment.isReverse) {
                            // 反向：箭头在起点，需要重新构建完整的连续路径
                            const firstLIndex = pathData.indexOf("L");
                            const beforeFirstL = pathData.substring(
                              0,
                              firstLIndex
                            ); // M...A 外圆弧部分
                            const fromFirstL = pathData.substring(firstLIndex); // L... 剩余部分

                            // 从原始起点开始，但立即画箭头，然后连续画弧形
                            const originalStart = pathData.match(
                              /M\s*([-\d.e]+)[,\s]+([-\d.e]+)/
                            );
                            if (originalStart) {
                              // 构建连续的反向箭头路径：
                              // 1. 从内圆弧对应的起点开始
                              // 2. 画箭头三角形
                              // 3. 连接到外圆弧起点
                              // 4. 沿外圆弧画到结束点
                              // 5. 连接到内圆弧结束点
                              // 6. 沿内圆弧回到起点
                              arrowPath = `M ${innerEndPoint[0]} ${
                                innerEndPoint[1]
                              } L ${tip[0]} ${tip[1]} L ${originalStart[1]} ${
                                originalStart[2]
                              } ${beforeFirstL.substring(
                                beforeFirstL.indexOf("A")
                              )} ${fromFirstL} Z`;
                            }
                          } else {
                            // 正向箭头路径：原始外圆弧 -> 箭头尖端 -> 内圆弧端点 -> 原始内圆弧路径
                            const firstLIndex = pathData.indexOf("L");
                            const beforeFirstL = pathData.substring(
                              0,
                              firstLIndex
                            ); // M...A 外圆弧部分
                            const fromFirstL = pathData.substring(firstLIndex); // L... 剩余部分

                            arrowPath = `${beforeFirstL} L ${tip[0]} ${tip[1]} L ${innerEndPoint[0]} ${innerEndPoint[1]} ${fromFirstL}`;
                          }
                        }

                        console.log("生成的箭头路径:", arrowPath);

                        // 替换原有的弧段路径，使用带箭头的路径
                        pathElement.attr("d", arrowPath);
                        console.log("箭头路径已应用");
                      } else {
                        console.warn("无法找到起点:", pathData);
                      }
                    } else {
                      console.log("无法生成箭头 - 没有找到外圆弧");
                    }
                  }
                }
              });
          });
        });

        // 添加当前层的标签
        const layerOuterTextNodes = []; // 收集当前层的圈外文本节点

        featureElements.each(function (d, featureIndex) {
          const featureElement = d3.select(this);
          const textSegment = d.segments.find((s) => s.isTextSegment);

          if (textSegment) {
            const text =
              d.information?.gene || d.information?.product || d.type;
            const textPathId = `text-path-${layer}-${featureIndex}-${d.segments.indexOf(
              textSegment
            )}`;
            const textPathElement = featureElement
              .select(`#${textPathId}`)
              .node();

            // 检查文本长度是否适合路径
            const estimatedTextLength =
              text.length * CONFIG.styles.annotation.fontSize * 0.6;
            let isTruncated = true;
            let pathLength = 0;

            if (textPathElement) {
              pathLength = textPathElement.getTotalLength();
              isTruncated = estimatedTextLength >= pathLength * 0.9;
            }

            if (!isTruncated && textPathElement) {
              // 文本长度合适，使用textPath并应用径向偏移
              let startAngle = angleScale(textSegment.start);
              let stopAngle = angleScale(textSegment.stop);
              if (startAngle > stopAngle) {
                [startAngle, stopAngle] = [stopAngle, startAngle];
              }

              const segmentMidAngle = (startAngle + stopAngle) / 2;
              const normalizedMidAngle = segmentMidAngle % (2 * Math.PI);
              const isInBottomHalf =
                normalizedMidAngle > Math.PI / 2 &&
                normalizedMidAngle < (3 * Math.PI) / 2; // A flag for annotations in the bottom half of the circle

              const radiusOffset = -CONFIG.styles.annotation.fontSize / 1.618; // IMPORTANT: An offset correction for annotations in the bottom half of the circle
              const dx = -radiusOffset * Math.sin(segmentMidAngle);
              const dy = radiusOffset * Math.cos(segmentMidAngle);

              featureElement
                .append("text")
                .attr(
                  "transform",
                  isInBottomHalf ? `translate(${dx}, ${dy})` : `translate(0,0)` // Conditional offset correction
                )
                .style("cursor", CONFIG.interaction.hover.cursor)
                .on("mouseover", function () {
                  // 高亮特征弧
                  featureElement
                    .selectAll("path")
                    .attr(
                      "stroke",
                      (CONFIG.featureType[d.type] || CONFIG.featureType.others)
                        .stroke
                    )
                    .attr(
                      "stroke-width",
                      CONFIG.styles.box.strokeWidth *
                        CONFIG.interaction.hover.strokeWidthMultiplier
                    );

                  // 高亮文本
                  d3.select(this)
                    .style("font-weight", CONFIG.interaction.hover.fontWeight)
                    .style("text-shadow", CONFIG.interaction.hover.textShadow);
                })
                .on("mouseout", function () {
                  // 恢复特征弧样式
                  featureElement
                    .selectAll("path")
                    .attr(
                      "stroke",
                      (CONFIG.featureType[d.type] || CONFIG.featureType.others)
                        .stroke
                    )
                    .attr("stroke-width", CONFIG.styles.box.strokeWidth);

                  // 恢复文本样式
                  d3.select(this)
                    .style("font-weight", CONFIG.interaction.normal.fontWeight)
                    .style("text-shadow", CONFIG.interaction.normal.textShadow);
                })
                .on("click", () => onFeatureClick?.(d))
                .append("textPath")
                .attr("xlink:href", `#${textPathId}`)
                .style("text-anchor", "middle") //IMPORTANT: centering the text
                .attr("startOffset", "50%") //IMPORTANT:  centering the text
                .attr("lengthAdjust", "spacingAndGlyphs")
                .attr("fill", CONFIG.styles.annotation.fillDark)
                .attr("font-family", CONFIG.styles.annotation.fontFamily)
                .attr("font-size", `${CONFIG.styles.annotation.fontSize}px`)
                .text(text);
            } else {
              // 文本长度过长，显示在圈外，先收集节点信息用于力模拟
              let startAngle = angleScale(textSegment.start);
              let stopAngle = angleScale(textSegment.stop);
              if (startAngle > stopAngle) {
                [startAngle, stopAngle] = [stopAngle, startAngle];
              }
              const midAngle = (startAngle + stopAngle) / 2;
              const outerRadius =
                layerRadii.get(d.radialOffset)?.outer ||
                innerRadius + 24 + d.radialOffset * layerSpacing;

              // 调整角度，使其与圆形坐标系对齐
              const adjustedAngle = midAngle - Math.PI / 2;
              const textDistance = currentLayerMaxRadius + 30; // 基于当前最大半径
              const textX = Math.cos(adjustedAngle) * textDistance;
              const textY = Math.sin(adjustedAngle) * textDistance;

              // 收集圈外文本节点信息
              layerOuterTextNodes.push({
                text,
                width: estimatedTextLength,
                height: CONFIG.styles.annotation.fontSize,
                x: textX,
                y: textY,
                targetX: textX,
                targetY: textY,
                adjustedAngle,
                outerRadius,
                featureElement,
                featureIndex,
                feature: d, // 添加特征数据引用
                isTruncated: true,
              });
            }
          }
        });

        const centerStrength = -0.008 / (2 + layer);
        // 对圈外文本应用力模拟
        if (layerOuterTextNodes.length > 0) {
          const simulation = d3
            .forceSimulation(layerOuterTextNodes)
            .velocityDecay(0.7)
            .force(
              "repel",
              d3
                .forceManyBody()
                .strength(-0.00001)
                .distanceMax(30)
                .distanceMin(0)
            )
            .force("centerX", d3.forceX(() => 0).strength(centerStrength))
            .force("centerY", d3.forceY(() => 0).strength(centerStrength))
            .force(
              "collide",
              d3
                .forceCollide()
                .radius((d) => d.width / 2)
                .iterations(3)
            )
            .stop();

          // 执行多次tick直到收敛
          for (let i = 0; i < 75; ++i) {
            simulation.tick();
          }
        }

        // 渲染力模拟后的圈外文本
        layerOuterTextNodes.forEach((node) => {
          // 添加引导线
          node.featureElement
            .append("line")
            .attr("class", "annotation-leader")
            .attr("x1", Math.cos(node.adjustedAngle) * node.outerRadius)
            .attr("y1", Math.sin(node.adjustedAngle) * node.outerRadius)
            .attr("x2", node.x)
            .attr("y2", node.y)
            .attr("stroke", "#aaa")
            .attr("stroke-width", 1)
            .style("pointer-events", "none");

          // 添加文本背景
          node.featureElement
            .append("rect")
            .attr("class", "text-bg")
            .attr("x", node.x - node.width / 2 - 5)
            .attr("y", node.y - node.height / 2)
            .attr("width", node.width + 10)
            .attr("height", node.height)
            .style("fill", "none")
            .style("stroke", "none");

          // 添加文本
          node.featureElement
            .append("text")
            .attr("class", "annotation truncated")
            .attr("x", node.x)
            .attr("y", node.y)
            .text(node.text)
            .style("font-family", CONFIG.styles.annotation.fontFamily)
            .style("font-size", `${CONFIG.styles.annotation.fontSize}px`)
            .style("dominant-baseline", "middle")
            .style("text-anchor", "middle")
            .style("pointer-events", "auto")
            .style("cursor", CONFIG.interaction.hover.cursor)
            .style("fill", CONFIG.styles.annotation.fillDark)
            .on("mouseover", function () {
              // 获取对应的特征数据
              const featureData = layerOuterTextNodes.find(
                (n) => n.x === node.x && n.y === node.y
              );
              if (featureData) {
                // 高亮特征弧
                node.featureElement
                  .selectAll("path")
                  .attr(
                    "stroke-width",
                    CONFIG.styles.box.strokeWidth *
                      CONFIG.interaction.hover.strokeWidthMultiplier
                  );

                // 高亮文本
                d3.select(this)
                  .style("font-weight", CONFIG.interaction.hover.fontWeight)
                  .style("text-shadow", CONFIG.interaction.hover.textShadow);

                // 高亮文本背景
                node.featureElement
                  .select(".text-bg")
                  .style("fill", CONFIG.interaction.hover.textBackground.fill)
                  .style(
                    "stroke",
                    CONFIG.interaction.hover.textBackground.stroke
                  )
                  .style(
                    "stroke-width",
                    CONFIG.interaction.hover.textBackground.strokeWidth
                  );

                // 高亮引导线
                node.featureElement
                  .select(".annotation-leader")
                  .attr("stroke", CONFIG.interaction.hover.leader.stroke)
                  .attr(
                    "stroke-width",
                    CONFIG.interaction.hover.leader.strokeWidth
                  );
              }
            })
            .on("mouseout", function () {
              // 恢复特征弧样式
              node.featureElement
                .selectAll("path")
                .attr("stroke-width", CONFIG.styles.box.strokeWidth);

              // 恢复文本样式
              d3.select(this)
                .style("font-weight", CONFIG.interaction.normal.fontWeight)
                .style("text-shadow", CONFIG.interaction.normal.textShadow);

              // 恢复文本背景样式
              node.featureElement
                .select(".text-bg")
                .style("fill", CONFIG.interaction.normal.textBackground.fill)
                .style(
                  "stroke",
                  CONFIG.interaction.normal.textBackground.stroke
                );

              // 恢复引导线样式
              node.featureElement
                .select(".annotation-leader")
                .attr("stroke", CONFIG.interaction.normal.leader.stroke)
                .attr(
                  "stroke-width",
                  CONFIG.interaction.normal.leader.strokeWidth
                );
            })
            .on("click", () => {
              // 直接使用节点中的特征数据
              if (node.feature) {
                onFeatureClick?.(node.feature);
              }
            });
        });

        // 计算当前层的最大半径（包括力模拟后的圈外文本）
        let layerMaxRadius =
          layerRadii.get(layer)?.outer ||
          innerRadius + 24 + layer * layerSpacing;

        // 检查力模拟后的圈外文本半径
        layerOuterTextNodes.forEach((node) => {
          const textRadius = Math.sqrt(node.x * node.x + node.y * node.y);
          layerMaxRadius = Math.max(layerMaxRadius, textRadius + 10); // 文本半径加边距
        });

        currentLayerMaxRadius = layerMaxRadius;
        maxRadius = Math.max(maxRadius, currentLayerMaxRadius);
      }
    }

    // 基于当前内容最大半径，计算一个“适屏”初始缩放比例
    const fitPadding = 20; // 适当的留白（像素）
    let fitScale = 1;
    if (maxRadius > 0) {
      const sx = (width / 2 - fitPadding) / maxRadius;
      const sy = (height / 2 - fitPadding) / maxRadius;
      fitScale = Math.min(sx, sy);
      if (!isFinite(fitScale) || fitScale <= 0) fitScale = 1;
    }

    // 绘制刻度
    const tickCount = 12;
    const ticks = d3.range(tickCount).map((i) => (i * totalLength) / tickCount);

    // 创建刻度组
    const tickGroup = mainGroup.append("g").attr("class", "ticks");

    // 绘制刻度线和标签
    tickGroup
      .selectAll("g")
      .data(ticks)
      .enter()
      .append("g")
      .attr("transform", (d) => {
        const angle = angleScale(d) - Math.PI / 2;
        return `rotate(${(angle * 180) / Math.PI})`;
      })
      .each(function (d) {
        d3.select(this)
          .append("line")
          .attr("x1", innerRadius)
          .attr("y1", 0)
          .attr("x2", innerRadius + CONFIG.styles.axis.tickLength)
          .attr("y2", 0)
          .attr("stroke", CONFIG.styles.axis.stroke)
          .attr("stroke-width", CONFIG.styles.axis.strokeWidth);

        const textGroup = d3
          .select(this)
          .append("g")
          .attr("transform", `translate(${innerRadius - 20}, 0)`);

        textGroup
          .append("text")
          .attr("x", 0)
          .attr("y", 0)
          .attr("text-anchor", "middle")
          .attr("fill", CONFIG.styles.axis.text.fill)
          .attr("font-family", CONFIG.styles.axis.text.fontFamily)
          .attr("font-size", `${CONFIG.styles.axis.text.fontSize}px`)
          .attr("transform", (d) => {
            const angle = angleScale(d);
            if (angle > Math.PI || angle < 0) {
              return "rotate(180)";
            }
            if (angle === 0) {
              return "rotate(90)"; //IMPORTANT: 0度时，文本需要旋转90度，否则方向错误
            }
            if (angle === Math.PI) {
              return "rotate(-90)"; //IMPORTANT: 180度时，文本需要旋转-90度，否则方向错误
            }
            return "";
          })
          .text(Math.floor(d));
      });

    // 在特征渲染完成后创建缩放行为
    // 允许初始适屏缩放值作为最小缩放下限（避免 fitScale 小于固定下限导致初始化无法套用）
    const minScale = Math.min(0.3, fitScale || 1);
    const maxScale = 5;

    // 为了在最小缩放下仍可自由移动到视口中心，放宽平移范围：
    // 视口在最小缩放时的逻辑尺寸为 width/minScale 与 height/minScale。
    // 将 extent 向四周扩展到该尺寸，避免缩小后被夹在右/下边界导致无法继续向右/下拖动。
    const viewportWAtMin = width / minScale;
    const viewportHAtMin = height / minScale;
    const translateExtent = [
      [-viewportWAtMin, -viewportHAtMin],
      [width + viewportWAtMin, height + viewportHAtMin],
    ];

    const zoom = d3
      .zoom()
      .scaleExtent([minScale, maxScale]) // 扩大缩放范围，允许更大的缩放倍数
      .translateExtent(translateExtent)
      .wheelDelta((event) => {
        // 降低滚轮缩放的灵敏度，使缩放更平滑
        // 默认是 -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002) * (event.ctrlKey ? 10 : 1)
        // 我们将灵敏度降低到原来的1/3
        return (
          -event.deltaY *
          (event.deltaMode === 1 ? 0.017 : event.deltaMode ? 0.33 : 0.0007) *
          (event.ctrlKey ? 10 : 1)
        );
      })
      .filter((event) => {
        // 禁用浏览器默认的Ctrl+滚轮缩放
        if (event.type === "wheel" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
        }
        // 实时检查Ctrl键状态，而不是依赖状态变量
        const isCtrlCurrentlyPressed = event.ctrlKey || event.metaKey;
        // 同步更新状态变量
        if (isCtrlCurrentlyPressed !== isCtrlPressed) {
          setIsCtrlPressed(isCtrlCurrentlyPressed);
        }
        // 只有在实际按住Ctrl键时才允许缩放和拖动
        return isCtrlCurrentlyPressed;
      })
      .on("start", (event) => {
        // 实时检查Ctrl键状态
        const isCtrlCurrentlyPressed =
          event.sourceEvent?.ctrlKey || event.sourceEvent?.metaKey;
        if (!isCtrlCurrentlyPressed) {
          return; // 如果没有按Ctrl键，停止操作
        }
        // 开始拖动时改变鼠标样式
        svg.style("cursor", "grabbing");
      })
      .on("zoom", (event) => {
        // 允许程序化变换（event.sourceEvent 为 undefined）
        const isProgrammatic = !event.sourceEvent;
        // 实时检查Ctrl键状态，仅对用户交互生效
        const isCtrlCurrentlyPressed =
          event.sourceEvent?.ctrlKey || event.sourceEvent?.metaKey;
        if (!isProgrammatic && !isCtrlCurrentlyPressed) {
          return; // 用户松开 Ctrl 时，不应用变换；程序化初始化不受限
        }
        mainGroup.attr("transform", event.transform);
        setScale(event.transform.k);
        setTranslate({ x: event.transform.x, y: event.transform.y });
      })
      .on("end", (event) => {
        // 结束拖动时恢复鼠标样式
        const isCtrlCurrentlyPressed =
          event.sourceEvent?.ctrlKey || event.sourceEvent?.metaKey;
        svg.style("cursor", isCtrlCurrentlyPressed ? "grab" : "default");
      });

    // 应用缩放行为到SVG，初始变换为居中位置
    const initialScale = Math.max(minScale, Math.min(maxScale, fitScale || 1));
    const initialTransform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(initialScale);
    svg.call(zoom).call(zoom.transform, initialTransform);

    // 额外的wheel事件处理来阻止浏览器默认缩放
    svg.on("wheel.prevent", (event) => {
      // 总是阻止浏览器默认的Ctrl+滚轮页面缩放
      event.preventDefault();
      event.stopPropagation();

      // 更新状态变量以保持同步
      const isCurrentlyPressed = event.ctrlKey || event.metaKey;
      setIsCtrlPressed(isCurrentlyPressed);

      // 如果没有按Ctrl键，完全阻止D3处理这个事件
      if (!isCurrentlyPressed) {
        event.stopImmediatePropagation();
        return false;
      }
    });

    // 鼠标样式统一在 zoom 生命周期内管理（start/end）

    // 添加额外的鼠标事件处理
    svg.on("mousedown.prevent", (event) => {
      // 实时检查Ctrl键状态并更新
      const isCurrentlyPressed = event.ctrlKey || event.metaKey;
      setIsCtrlPressed(isCurrentlyPressed);

      // 如果没有按Ctrl键，完全阻止事件
      if (!isCurrentlyPressed) {
        // 允许右键用于选择，不阻止传播
        if (event.button === 2) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
      }
    });

    // 移除基于鼠标移动的光标切换，避免与 zoom 生命周期竞态

    // 右键拖拽扇形选择（圆轴外部）
    const selectionOverlayGroup = mainGroup
      .append("g")
      .attr("class", "selection-overlay")
      .style("pointer-events", "none");

    let isRightSelecting = false;
    let startAngle = null;
    let selectionPath = null;
    let startLine = null;
    let endLine = null;

    // 禁用默认右键菜单
    svg.on("contextmenu.selection", (event) => {
      event.preventDefault();
    });

    const getLocalPointer = (event) => {
      const t = d3.zoomTransform(svg.node());
      const [px, py] = d3.pointer(event, svg.node());
      const inv = t.invert([px, py]);
      return inv; // 相对于mainGroup中心(0,0)
    };

    const toAngle = (x, y) => {
      // 统一将角度顺时针旋转90°，与坐标轴显示一致
      let ang = Math.atan2(y, x);
      // 归一化到 [0, 2π)
      if (ang < 0) ang += Math.PI * 2;
      // 顺时针旋转90° 等价于加上 π/2
      ang = (ang + Math.PI / 2) % (Math.PI * 2);
      return ang;
    };

    svg.on("mousedown.selection", (event) => {
      if (event.button !== 2) return; // 仅右键
      const [lx, ly] = getLocalPointer(event);
      const r = Math.hypot(lx, ly);
      if (r <= innerRadius) return; // 必须在坐标轴之外

      isRightSelecting = true;
      startAngle = toAngle(lx, ly);

      if (selectionPath) selectionPath.remove();
      selectionPath = selectionOverlayGroup
        .append("path")
        .attr("class", "selection-sector")
        .attr("fill", "#1e90ff")
        .attr("fill-opacity", 0.15)
        .attr("stroke", "#1e90ff")
        .attr("stroke-width", 1)
        .attr("pointer-events", "none");

      if (startLine) startLine.remove();
      if (endLine) endLine.remove();
      // 起点线段：沿径向从 innerRadius 到 maxRadius（线的角度需补回 π/2）
      const angleForStartLine = startAngle - Math.PI / 2;
      const sx0 = Math.cos(angleForStartLine) * innerRadius;
      const sy0 = Math.sin(angleForStartLine) * innerRadius;
      const sx1 = Math.cos(angleForStartLine) * (maxRadius + 8);
      const sy1 = Math.sin(angleForStartLine) * (maxRadius + 8);
      startLine = selectionOverlayGroup
        .append("line")
        .attr("class", "selection-start-line")
        .attr("x1", sx0)
        .attr("y1", sy0)
        .attr("x2", sx1)
        .attr("y2", sy1)
        .attr("stroke", "#1e90ff")
        .attr("stroke-width", 1.5)
        .attr("pointer-events", "none");
      endLine = selectionOverlayGroup
        .append("line")
        .attr("class", "selection-end-line")
        .attr("x1", sx0)
        .attr("y1", sy0)
        .attr("x2", sx1)
        .attr("y2", sy1)
        .attr("stroke", "#1e90ff")
        .attr("stroke-width", 1.5)
        .attr("pointer-events", "none");
    });

    svg.on("mousemove.selection", (event) => {
      if (!isRightSelecting || !selectionPath) return;
      const [lx, ly] = getLocalPointer(event);
      const r = Math.hypot(lx, ly);
      if (r <= innerRadius) return; // 仍需在外圈
      const currentAngle = toAngle(lx, ly);

      const a0 = startAngle;
      const a1 = currentAngle;
      // 计算双向差，选择较小弧段，避免“0”点特殊性且与拖拽方向无关
      const forward = (a1 - a0 + Math.PI * 2) % (Math.PI * 2);
      const backward = (a0 - a1 + Math.PI * 2) % (Math.PI * 2);
      const startForArc = backward < forward ? a1 : a0;
      const delta = Math.min(forward, backward);

      const arcGen = d3
        .arc()
        .innerRadius(innerRadius)
        .outerRadius(maxRadius + 8)
        .startAngle(startForArc)
        .endAngle(startForArc + delta);

      selectionPath.attr("d", arcGen());

      // 更新终点径向线（角度需补回 π/2）
      const angleForEndLine = currentAngle - Math.PI / 2;
      const ex0 = Math.cos(angleForEndLine) * innerRadius;
      const ey0 = Math.sin(angleForEndLine) * innerRadius;
      const ex1 = Math.cos(angleForEndLine) * (maxRadius + 8);
      const ey1 = Math.sin(angleForEndLine) * (maxRadius + 8);
      if (endLine) {
        endLine.attr("x1", ex0).attr("y1", ey0).attr("x2", ex1).attr("y2", ey1);
      }
    });

    const endRightSelection = (event) => {
      if (event && event.button !== undefined && event.button !== 2) return;
      if (!isRightSelecting) return;
      isRightSelecting = false;
    };

    svg.on("mouseup.selection", endRightSelection);
    svg.on("mouseleave.selection", endRightSelection);

    // 添加交互提示文本
    svg
      .append("text")
      .attr("class", "interaction-hint")
      .attr("x", width / 2)
      .attr("y", height - 10)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#888")
      .style("font-family", CONFIG.styles.axis.text.fontFamily)
      .style("pointer-events", "none")
      .style("user-select", "none")
      .text("按住 Ctrl 键 + 鼠标拖动/滚轮缩放");

    // 清理函数：移除事件监听器
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
      // 光标样式已由 zoom 生命周期统一管理，移除额外监听器
    };
  }, [data, width, height, onFeatureClick]);

  return (
    <div style={sequenceViewer.renderer}>
      <svg
        ref={svgRef}
        style={{
          ...sequenceViewer.svg,
          backgroundColor: CONFIG.styles.background.color,
          fontSize: `${CONFIG.styles.annotation.fontSize}px`,
        }}
      />
    </div>
  );
};

export default CircularSequenceRenderer;
