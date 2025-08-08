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

import React, { useRef, useEffect } from "react";
import * as d3 from "d3";
import { CONFIG } from "../../config/config";
import { DataUtils, TextUtils } from "../../utils/utils";

/**
 * 直线序列渲染组件
 * @param {Object} props - 组件属性
 * @param {Object} props.data - 序列数据对象
 * @param {number} props.width - 渲染区域宽度
 * @param {number} props.height - 渲染区域高度
 * @param {Function} [props.onFeatureClick] - 特征点击事件处理函数
 */
const LinearSequenceRenderer = ({
  data,
  width = 800,
  height = 600,
  onFeatureClick,
}) => {
  const svgRef = useRef(null);
  const { sequenceViewer } = CONFIG;

  useEffect(() => {
    console.log("LinearSequenceRenderer data", data);
    if (!svgRef.current || !data) return;

    // 清除之前的渲染内容
    d3.select(svgRef.current).selectAll("*").remove();

    // 计算布局参数
    const initialWidth = width;
    const margin = {
      top: height * CONFIG.dimensions.margin.top,
      right: initialWidth * CONFIG.dimensions.margin.right,
      bottom: height * CONFIG.dimensions.margin.bottom,
      left: initialWidth * CONFIG.dimensions.margin.left,
    };
    const contentWidth = initialWidth - margin.left - margin.right;
    const viewportHeight = height - margin.top - margin.bottom;
    const fontSize = CONFIG.styles.annotation.fontSize;
    const boxHeight =
      (CONFIG.dimensions.unit * CONFIG.dimensions.boxHeightMultiplier) / 2;
    const vSpace = CONFIG.dimensions.vSpace;
    const totalLength = data.locus ? data.locus.sequenceLength : 0;

    // 创建比例尺
    const lengthScale = d3
      .scaleLinear()
      .domain([0, totalLength])
      .range([0, contentWidth]);

    // 计算最小可见宽度（至少1个像素）
    const minVisibleWidth = Math.max(1, contentWidth / totalLength);

    // 主容器
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%")
      .style("height", "100%")
      .style("backgroundColor", CONFIG.styles.background.color);

    // 创建可滚动的内容组
    const contentGroup = svg
      .append("g")
      .attr("class", "content")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

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
      .attr("width", width + margin.left + margin.right)
      .attr("height", margin.top + 20)
      .attr("fill", CONFIG.styles.axis.background.fill)
      .attr("stroke", CONFIG.styles.axis.background.stroke);

    // 添加元信息显示
    const metaInfoGroup = axisContainer.append("g").attr("class", "meta-info");

    // 添加标题
    metaInfoGroup
      .append("text")
      .attr("class", "meta-title")
      .attr("x", width / 2)
      .attr("y", -margin.top + 20)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("fill", CONFIG.styles.axis.text.fill)
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
      .attr("x", width / 2)
      .attr("y", -margin.top + 40)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", CONFIG.styles.axis.text.fill)
      .text(description);

    // 坐标轴
    const topAxis = d3
      .axisTop(lengthScale)
      .ticks(Math.min(20, Math.floor(width / 50)))
      .tickFormat((d) => {
        return d.toLocaleString();
      });

    axisContainer.append("g").call(topAxis);

    // 应用坐标轴样式
    axisContainer
      .selectAll("path, line")
      .attr("stroke", CONFIG.styles.axis.stroke)
      .attr("stroke-width", CONFIG.styles.axis.strokeWidth);

    axisContainer
      .selectAll("text")
      .attr("fill", CONFIG.styles.axis.text.fill)
      .attr("font-size", `${CONFIG.styles.axis.text.fontSize}px`)
      .attr("font-family", CONFIG.styles.axis.text.fontFamily);

    // 渲染所有特征并计算内容高度
    let currentRowY = vSpace * 5; // location of the 1st row
    const features = data.features || [];

    // 多行排布：贪心分配行号
    const sorted = [...features]
      .sort((a, b) => {
        const aStart = Math.min(
          ...a.location.map((loc) => Number(DataUtils.cleanString(loc[0])))
        );
        const aEnd = Math.max(
          ...a.location.map((loc) => {
            const s = Number(DataUtils.cleanString(loc[0]));
            return loc[2] === null
              ? s + minVisibleWidth
              : loc.length > 1
              ? Number(DataUtils.cleanString(loc[loc.length - 1]))
              : s;
          })
        );
        const bStart = Math.min(
          ...b.location.map((loc) => Number(DataUtils.cleanString(loc[0])))
        );
        const bEnd = Math.max(
          ...b.location.map((loc) => {
            const s = Number(DataUtils.cleanString(loc[0]));
            return loc[2] === null
              ? s + minVisibleWidth
              : loc.length > 1
              ? Number(DataUtils.cleanString(loc[loc.length - 1]))
              : s;
          })
        );
        return bEnd - bStart - (aEnd - aStart);
      })
      .filter((feature) => {
        const typeConfig =
          CONFIG.featureType[feature.type] || CONFIG.featureType.others;
        return typeConfig.isDisplayed;
      });
    const rows = [];
    sorted.forEach((item) => {
      let assigned = false;
      for (let row = 0; ; row++) {
        if (!rows[row]) rows[row] = [];
        const aStart = Math.min(
          ...item.location.map((loc) => Number(DataUtils.cleanString(loc[0])))
        );
        const aEnd = Math.max(
          ...item.location.map((loc) => {
            const s = Number(DataUtils.cleanString(loc[0]));
            return loc[2] === null
              ? s + minVisibleWidth
              : loc.length > 1
              ? Number(DataUtils.cleanString(loc[loc.length - 1]))
              : s;
          })
        );
        const overlap = rows[row].some((other) => {
          const bStart = Math.min(
            ...other.location.map((loc) =>
              Number(DataUtils.cleanString(loc[0]))
            )
          );
          const bEnd = Math.max(
            ...other.location.map((loc) => {
              const s = Number(DataUtils.cleanString(loc[0]));
              return loc[2] === null
                ? s + minVisibleWidth
                : loc.length > 1
                ? Number(DataUtils.cleanString(loc[loc.length - 1]))
                : s;
            })
          );
          return !(aEnd < bStart || aStart > bEnd);
        });
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

    // 按行分组特征
    const featuresByRow = new Map();
    sorted.forEach((feature) => {
      const row = feature._row;
      if (!featuresByRow.has(row)) {
        featuresByRow.set(row, []);
      }
      featuresByRow.get(row).push(feature);
    });

    // 逐行渲染
    for (let row = 0; featuresByRow.has(row); row++) {
      const rowFeatures = featuresByRow.get(row) || [];
      const rowGroup = contentGroup.append("g").attr("class", `row-${row}`);
      // 收集当前行的圈外文本节点
      const rowTextNodes = [];
      // 渲染当前行的所有特征
      rowFeatures.forEach((feature, index) => {
        const typeConf =
          CONFIG.featureType[feature.type] || CONFIG.featureType.others;
        const [start, end] = [
          Math.min(
            ...feature.location.map((loc) =>
              Number(DataUtils.cleanString(loc[0]))
            )
          ),
          Math.max(
            ...feature.location.map((loc) => {
              const s = Number(DataUtils.cleanString(loc[0]));
              return loc[2] === null
                ? s + minVisibleWidth
                : loc.length > 1
                ? Number(DataUtils.cleanString(loc[loc.length - 1]))
                : s;
            })
          ),
        ];
        const x = lengthScale(start);
        const w = Math.max(2, lengthScale(end) - x);
        const y = currentRowY;
        // 特征组
        const featureGroup = rowGroup.append("g").attr("class", "feature");

        // 收集所有段的中心点，用于绘制骨架线
        const segmentCenters = [];

        // 先计算所有段的位置信息
        feature.location.forEach((loc, segmentIndex) => {
          const segmentStart = Number(DataUtils.cleanString(loc[0]));
          const segmentEnd =
            loc[2] === null
              ? segmentStart
              : loc.length > 1
              ? Number(DataUtils.cleanString(loc[loc.length - 1]))
              : segmentStart;
          const segmentX = lengthScale(segmentStart);
          const segmentW =
            loc[2] === null
              ? minVisibleWidth
              : Math.max(2, lengthScale(segmentEnd) - segmentX);

          // 计算段的中心点
          const segmentCenterX = segmentX + segmentW / 2;
          segmentCenters.push({ x: segmentCenterX, y });
        });

        // 先绘制骨架线
        if (segmentCenters.length > 1) {
          for (let i = 0; i < segmentCenters.length - 1; i++) {
            const current = segmentCenters[i];
            const next = segmentCenters[i + 1];

            featureGroup
              .append("line")
              .attr("class", "bone")
              .attr("x1", current.x)
              .attr("y1", current.y + boxHeight / 2)
              .attr("x2", next.x)
              .attr("y2", next.y + boxHeight / 2)
              .attr("stroke", typeConf.stroke)
              .attr("stroke-width", CONFIG.styles.bone.strokeWidth)
              .attr("stroke-dasharray", CONFIG.styles.bone.strokeDasharray)
              .style("pointer-events", "none");
          }
        }

        // 再绘制特征框和文本
        feature.location.forEach((loc, segmentIndex) => {
          const segmentStart = Number(DataUtils.cleanString(loc[0]));
          const segmentEnd =
            loc[2] === null
              ? segmentStart
              : loc.length > 1
              ? Number(DataUtils.cleanString(loc[loc.length - 1]))
              : segmentStart;
          const segmentX = lengthScale(segmentStart);
          const segmentW =
            loc[2] === null
              ? minVisibleWidth
              : Math.max(2, lengthScale(segmentEnd) - segmentX);
          const segmentCenterX = segmentCenters[segmentIndex].x;

          // 计算arrow宽度
          if (typeConf.shape === "arrow") {
            // 七边形箭头参数
            const arrowWidth = Math.min(boxHeight * 1.2, segmentW / 3);
            const arrowNeck = boxHeight * 0.6;
            const rectW = segmentW - arrowWidth;

            // 根据location中的第二个布尔值决定箭头方向
            const isComplementary = feature.location[0][1];
            let points;
            if (isComplementary) {
              // 向左箭头
              const leftTop = [segmentX + segmentW, y];
              const rightTop = [segmentX + arrowWidth, y];
              const neckTop = [
                segmentX + arrowWidth,
                y + boxHeight / 2 - (boxHeight + arrowNeck) / 2,
              ];
              const tip = [segmentX, y + boxHeight / 2];
              const neckBottom = [
                segmentX + arrowWidth,
                y + boxHeight / 2 + (boxHeight + arrowNeck) / 2,
              ];
              const rightBottom = [segmentX + arrowWidth, y + boxHeight];
              const leftBottom = [segmentX + segmentW, y + boxHeight];
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
              const leftTop = [segmentX, y];
              const rightTop = [segmentX + rectW, y];
              const neckTop = [
                segmentX + rectW,
                y + boxHeight / 2 - (boxHeight + arrowNeck) / 2,
              ];
              const tip = [segmentX + segmentW, y + boxHeight / 2];
              const neckBottom = [
                segmentX + rectW,
                y + boxHeight / 2 + (boxHeight + arrowNeck) / 2,
              ];
              const rightBottom = [segmentX + rectW, y + boxHeight];
              const leftBottom = [segmentX, y + boxHeight];
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
            featureGroup
              .append("polygon")
              .attr("points", points.map((p) => p.join(",")).join(" "))
              .attr("fill", typeConf.fill)
              .attr("stroke", typeConf.stroke)
              .attr("stroke-width", CONFIG.styles.box.strokeWidth)
              .attr("class", "arrow-rect")
              .style("cursor", CONFIG.interaction.hover.cursor)
              .on("click", () => onFeatureClick?.(feature))
              .on("mouseover", function () {
                highlightFeature(featureGroup);
              })
              .on("mouseout", function () {
                unhighlightFeature(featureGroup);
              });
          } else {
            drawRect(
              featureGroup,
              feature,
              segmentX,
              y,
              segmentW,
              boxHeight,
              typeConf,
              onFeatureClick
            );
          }

          // 为每个段添加文本标注
          const text =
            feature.information.gene ||
            feature.information.product ||
            feature.type;
          if (text) {
            const textWidth = TextUtils.measureTextWidth(
              text,
              fontSize,
              CONFIG.fonts.primary.family
            );
            const availableWidth = segmentW - 10;
            const isTruncated = textWidth > availableWidth;

            if (isTruncated) {
              // 圈外文本节点
              rowTextNodes.push({
                text,
                width: textWidth,
                height: fontSize,
                x: segmentCenterX,
                y: y + boxHeight + fontSize / 2,
                targetX: segmentCenterX,
                targetY: y + boxHeight + fontSize / 2,
                box: {
                  x: segmentX,
                  y,
                  width: segmentW,
                  height: boxHeight,
                  row,
                },
                isTruncated: true,
                featureIndex: index,
                segmentIndex,
              });
            } else {
              // 在框内显示文本
              featureGroup
                .append("text")
                .attr("class", "annotation")
                .attr("x", segmentCenterX)
                .attr("y", y + boxHeight / 2)
                .text(text)
                .style("font-family", CONFIG.fonts.primary.family)
                .style("font-size", `${fontSize}px`)
                .style("dominant-baseline", "middle")
                .style("text-anchor", "middle")
                .style("fill", CONFIG.styles.annotation.fillDark)
                .style("pointer-events", "none");
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
            d3.forceManyBody().strength(-0.02).distanceMax(50).distanceMin(0)
          )
          .force(
            "attract",
            d3.forceManyBody().strength(0.02).distanceMax(100).distanceMin(50)
          )
          .force("x", d3.forceX((d) => d.targetX).strength(1))
          .force("y", d3.forceY((d) => d.targetY).strength(1))
          .force("gravity", d3.forceY(() => 0).strength(-0.3 / (1 + row)))
          .force(
            "collide",
            d3
              .forceCollide()
              .radius((d) => d.width / 2)
              .iterations(3)
          )
          .stop();
        for (let i = 0; i < 75; ++i) simulation.tick();
      }
      // 渲染文本
      rowFeatures.forEach((feature, index) => {
        const y = currentRowY;
        const featureGroup = rowGroup
          .selectAll(".feature")
          .filter((d, i) => i === index);
        const text =
          feature.information.gene ||
          feature.information.product ||
          feature.type;
        if (text) {
          // 遍历每个段，分别渲染文本
          feature.location.forEach((loc) => {
            const segmentStart = Number(DataUtils.cleanString(loc[0]));
            const segmentEnd =
              loc[2] === null
                ? segmentStart
                : loc.length > 1
                ? Number(DataUtils.cleanString(loc[loc.length - 1]))
                : segmentStart;
            const segmentX = lengthScale(segmentStart);
            const segmentW =
              loc[2] === null
                ? minVisibleWidth
                : Math.max(2, lengthScale(segmentEnd) - segmentX);
            const segmentCenterX = segmentX + segmentW / 2;
            const textWidth = TextUtils.measureTextWidth(
              text,
              fontSize,
              CONFIG.fonts.primary.family
            );
            const availableWidth = segmentW - 10;
            const isTruncated = textWidth > availableWidth;
            if (isTruncated) {
              // 找到力导向后的节点（锚定segment的x/y/w）
              const textNode = rowTextNodes.find(
                (n) =>
                  n.text === text &&
                  n.box.x === segmentX &&
                  n.box.y === y &&
                  n.box.width === segmentW &&
                  n.featureIndex === index
              );
              if (textNode) {
                // 引导线
                featureGroup
                  .append("line")
                  .attr("class", "annotation-leader")
                  .attr("x1", textNode.x)
                  .attr("y1", textNode.y)
                  .attr("x2", textNode.box.x + textNode.box.width / 2)
                  .attr("y2", textNode.box.y + textNode.box.height)
                  .attr("stroke", CONFIG.interaction.normal.leader.stroke)
                  .attr(
                    "stroke-width",
                    CONFIG.interaction.normal.leader.strokeWidth
                  )
                  .style("pointer-events", "none");
                // 文本背景
                featureGroup
                  .append("rect")
                  .attr("class", "text-bg")
                  .attr("x", textNode.x - textNode.width / 2 - 5)
                  .attr("y", textNode.y - textNode.height / 2)
                  .attr("width", textNode.width + 10)
                  .attr("height", textNode.height)
                  .attr("fill", CONFIG.interaction.normal.textBackground.fill)
                  .attr(
                    "stroke",
                    CONFIG.interaction.normal.textBackground.stroke
                  )
                  .attr(
                    "stroke-width",
                    CONFIG.interaction.normal.textBackground.strokeWidth
                  )
                  .style("opacity", 0);
                // 文本
                featureGroup
                  .append("text")
                  .attr("class", "annotation truncated")
                  .attr("x", textNode.x)
                  .attr("y", textNode.y)
                  .text(textNode.text)
                  .style("font-family", CONFIG.fonts.primary.family)
                  .style("font-size", `${fontSize}px`)
                  .style("dominant-baseline", "middle")
                  .style("text-anchor", "middle")
                  .style("pointer-events", "auto")
                  .style("cursor", CONFIG.interaction.hover.cursor)
                  .style("fill", CONFIG.styles.annotation.fillDark)
                  .on("click", () => onFeatureClick?.(feature))
                  .on("mouseover", function () {
                    highlightFeature(featureGroup);
                  })
                  .on("mouseout", function () {
                    unhighlightFeature(featureGroup);
                  });
              }
            } else {
              // 普通文本，锚定每个段的中心
              featureGroup
                .append("text")
                .attr("class", "annotation")
                .attr("x", segmentCenterX)
                .attr("y", y + boxHeight / 2)
                .text(text)
                .style("font-family", CONFIG.fonts.primary.family)
                .style("font-size", `${fontSize}px`)
                .style("dominant-baseline", "middle")
                .style("text-anchor", "middle")
                .style("pointer-events", "auto")
                .style("cursor", CONFIG.interaction.hover.cursor)
                .style("fill", CONFIG.styles.annotation.fillDark)
                .on("click", () => onFeatureClick?.(feature))
                .on("mouseover", function () {
                  highlightFeature(featureGroup);
                })
                .on("mouseout", function () {
                  unhighlightFeature(featureGroup);
                });
            }
          });
        }
      });
      // 计算本行最大y
      let rowMaxY = currentRowY + boxHeight;
      if (rowTextNodes.length > 0) {
        const textMaxY = Math.max(
          ...rowTextNodes.map((node) => node.y + node.height / 2)
        );
        rowMaxY = Math.max(rowMaxY, textMaxY);
      }
      // 动态推进下一行y
      currentRowY = rowMaxY + vSpace;
    }

    // 计算内容高度和可滚动范围
    // 添加额外缓冲空间以确保圈外文字可见
    const textBuffer = vSpace * 8; // 为圈外文字预留足够空间
    const contentHeight = currentRowY - margin.top + textBuffer;
    const maxScroll = Math.max(
      0,
      contentHeight - viewportHeight + margin.bottom
    ); // 添加底部边距

    // 创建缩放行为
    const zoom = d3
      .zoom()
      .scaleExtent([1, 1]) // 禁用缩放
      .on("zoom", (event) => {
        // 只应用y方向的变换，保持x位置固定
        const limitedY = Math.max(-maxScroll, Math.min(0, event.transform.y));
        contentGroup.attr(
          "transform",
          `translate(${margin.left}, ${margin.top + limitedY})`
        );
      });

    // 应用缩放行为到SVG
    svg.call(zoom);

    // 添加鼠标滚轮事件处理
    svg.on("wheel", (event) => {
      event.preventDefault();
      const delta = -event.deltaY; // 取反 deltaY 来修正滚动方向
      const currentTransform = d3.zoomTransform(svg.node());
      const newY = currentTransform.y + delta;

      // 限制滚动范围
      const limitedY = Math.max(-maxScroll, Math.min(0, newY));

      // 应用新的变换
      svg.call(zoom.transform, d3.zoomIdentity.translate(0, limitedY));
    });

    // 右键拖拽选择（排除坐标轴与Meta区域）
    const overlayGroup = svg
      .append("g")
      .attr("class", "selection-overlay")
      .style("pointer-events", "none");

    let isRightSelecting = false;
    let selectStart = null;
    let selectionRect = null;
    let startLine = null;
    let endLine = null;

    // 阻止右键菜单
    svg.on("contextmenu.selection", (event) => {
      event.preventDefault();
    });

    svg.on("mousedown.selection", (event) => {
      if (event.button !== 2) return; // 仅右键
      const [px, py] = d3.pointer(event, svg.node());
      // 轴与Meta区域为 [0, margin.top + 20]
      if (py <= margin.top + 20) return;

      isRightSelecting = true;
      selectStart = [px, py];

      if (selectionRect) selectionRect.remove();
      selectionRect = overlayGroup
        .append("rect")
        .attr("class", "selection-rect")
        .attr("x", px)
        .attr("y", 0)
        .attr("width", 0)
        .attr("height", height)
        .attr("fill", "#1e90ff")
        .attr("fill-opacity", 0.15)
        .attr("stroke", "#1e90ff")
        .attr("stroke-width", 1)
        .attr("pointer-events", "none");

      if (startLine) startLine.remove();
      if (endLine) endLine.remove();
      startLine = overlayGroup
        .append("line")
        .attr("class", "selection-start-line")
        .attr("x1", px)
        .attr("y1", 0)
        .attr("x2", px)
        .attr("y2", height)
        .attr("stroke", "#1e90ff")
        .attr("stroke-width", 1.5)
        .attr("pointer-events", "none");
      endLine = overlayGroup
        .append("line")
        .attr("class", "selection-end-line")
        .attr("x1", px)
        .attr("y1", 0)
        .attr("x2", px)
        .attr("y2", height)
        .attr("stroke", "#1e90ff")
        .attr("stroke-width", 1.5)
        .attr("pointer-events", "none");

      event.preventDefault();
    });

    svg.on("mousemove.selection", (event) => {
      if (!isRightSelecting || !selectionRect) return;
      const [cx] = d3.pointer(event, svg.node());
      const x = Math.min(cx, selectStart[0]);
      const w = Math.abs(cx - selectStart[0]);
      selectionRect.attr("x", x).attr("width", w);
      if (endLine) {
        endLine.attr("x1", cx).attr("x2", cx);
      }
      event.preventDefault();
    });

    const endRightSelection = (event) => {
      if (event && event.button !== undefined && event.button !== 2) return;
      if (!isRightSelecting) return;
      isRightSelecting = false;
    };

    svg.on("mouseup.selection", endRightSelection);
    svg.on("mouseleave.selection", endRightSelection);
  }, [data, width, height, onFeatureClick]);

  return (
    <div style={sequenceViewer.renderer}>
      <svg
        ref={svgRef}
        style={{
          ...sequenceViewer.svg,
          overflow: "visible",
          backgroundColor: CONFIG.styles.background.color,
        }}
        width={width}
      />
    </div>
  );
};

// 高亮和恢复函数
function highlightFeature(featureGroup) {
  featureGroup
    .selectAll("rect.box, polygon.arrow-rect")
    .attr(
      "stroke-width",
      CONFIG.styles.box.strokeWidth *
        CONFIG.interaction.hover.strokeWidthMultiplier
    );
  featureGroup
    .selectAll("text.annotation")
    .style("font-weight", CONFIG.interaction.hover.fontWeight)
    .style("fill", CONFIG.styles.annotation.fillDark)
    .style("text-shadow", CONFIG.interaction.hover.textShadow);
  featureGroup
    .selectAll(".text-bg")
    .style("fill", CONFIG.interaction.hover.textBackground.fill)
    .style("stroke", CONFIG.interaction.hover.textBackground.stroke)
    .style("stroke-width", CONFIG.interaction.hover.textBackground.strokeWidth)
    .style("opacity", 1);
  featureGroup
    .selectAll(".annotation-leader")
    .attr("stroke", CONFIG.interaction.hover.leader.stroke)
    .attr("stroke-width", CONFIG.interaction.hover.leader.strokeWidth);
}
function unhighlightFeature(featureGroup) {
  featureGroup
    .selectAll("rect.box, polygon.arrow-rect")
    .attr("stroke-width", CONFIG.styles.box.strokeWidth);
  featureGroup
    .selectAll("text.annotation")
    .style("font-weight", CONFIG.interaction.normal.fontWeight)
    .style("text-shadow", CONFIG.interaction.normal.textShadow);
  featureGroup
    .selectAll(".text-bg")
    .style("fill", CONFIG.interaction.normal.textBackground.fill)
    .style("stroke", CONFIG.interaction.normal.textBackground.stroke)
    .style("stroke-width", CONFIG.interaction.normal.textBackground.strokeWidth)
    .style("opacity", 0);
  featureGroup
    .selectAll(".annotation-leader")
    .attr("stroke", CONFIG.interaction.normal.leader.stroke)
    .attr("stroke-width", CONFIG.interaction.normal.leader.strokeWidth);
}

function drawRect(
  featureGroup,
  feature,
  segmentX,
  y,
  segmentW,
  boxHeight,
  typeConf,
  onFeatureClick
) {
  return featureGroup
    .append("rect")
    .attr("class", `box ${feature.type}`)
    .attr("x", segmentX)
    .attr("y", y)
    .attr("width", segmentW > 0 ? segmentW : 2)
    .attr("height", boxHeight > 0 ? boxHeight : 2)
    .attr("fill", typeConf && typeConf.fill ? typeConf.fill : "#ffcccc")
    .attr("stroke", typeConf && typeConf.stroke ? typeConf.stroke : "#333")
    .attr("stroke-width", CONFIG.styles.box.strokeWidth)
    .attr("fill-opacity", CONFIG.styles.box.fillOpacity)
    .style("cursor", CONFIG.interaction.hover.cursor)
    .on("click", () => onFeatureClick?.(feature))
    .on("mouseover", function () {
      highlightFeature(featureGroup);
    })
    .on("mouseout", function () {
      unhighlightFeature(featureGroup);
    });
}

function drawArrowHead(
  featureGroup,
  arrowX,
  arrowY,
  arrowWidth,
  arrowHeight,
  colorConf,
  onFeatureClick,
  feature
) {
  const points = [
    [0, 0],
    [-arrowWidth, -arrowHeight / 2],
    [-arrowWidth, arrowHeight / 2],
  ];
  const arrowPath = d3.line()(points);
  featureGroup
    .append("path")
    .attr("d", arrowPath + "Z")
    .attr("class", "arrowhead")
    .attr("fill", colorConf.fill || "#333")
    .attr("stroke", colorConf.stroke || "#333")
    .attr("stroke-width", CONFIG.styles.box.strokeWidth)
    .attr("transform", `translate(${arrowX},${arrowY})`)
    .style("cursor", CONFIG.interaction.hover.cursor)
    .on("click", () => onFeatureClick?.(feature))
    .on("mouseover", function () {
      highlightFeature(featureGroup);
    })
    .on("mouseout", function () {
      unhighlightFeature(featureGroup);
    });
}

export default LinearSequenceRenderer;
