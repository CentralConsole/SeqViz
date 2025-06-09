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
  const { sequenceViewer } = CONFIG;

  useEffect(() => {
    if (!svgRef.current || !data) return;

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

    // 创建主容器组，不做初始平移
    const mainGroup = svg.append("g");

    // 获取序列总长度
    const locusMatch = data.locus.match(/(\d+)\s+bp/);
    const totalLength = locusMatch ? parseInt(locusMatch[1], 10) : 0;

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

            //段
            processedSegments.push({
              start,
              stop,
              isFirst: locIndex === 0,
              isTextSegment: locIndex === 0,
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
      const layerSpacing = CONFIG.dimensions.vSpace * 2; // 层间距

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

        // 绘制特征的每个段弧线
        featureElements.each(function (d, featureIndex) {
          const featureElement = d3.select(this);

          d.segments.forEach((segment, segmentIndex) => {
            let startAngle = angleScale(segment.start);
            let stopAngle = angleScale(segment.stop);

            if (startAngle > stopAngle) {
              [startAngle, stopAngle] = [stopAngle, startAngle];
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
              d3.forceManyBody().strength(-0.001).distanceMax(50).distanceMin(0)
            )
            .force("centerX", d3.forceX(() => 0).strength(centerStrength))
            .force("centerY", d3.forceY(() => 0).strength(centerStrength))
            .force(
              "collide",
              d3
                .forceCollide()
                .radius((d) => d.width + 5)
                .iterations(2)
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
    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 3])
      .translateExtent([
        [-maxRadius, -maxRadius],
        [maxRadius, maxRadius],
      ])
      .on("zoom", (event) => {
        mainGroup.attr("transform", event.transform);
        setScale(event.transform.k);
        setTranslate({ x: event.transform.x, y: event.transform.y });
      });

    // 应用缩放行为到SVG，并设置初始变换为画布中心
    svg
      .call(zoom)
      .call(
        zoom.transform,
        d3.zoomIdentity.translate(width / 2, height / 2).scale(1)
      );
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
