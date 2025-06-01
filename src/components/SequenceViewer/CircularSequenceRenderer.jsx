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

    // 创建主容器组并移动到中心
    const mainGroup = svg
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // 创建缩放行为
    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        mainGroup.attr(
          "transform",
          `translate(${event.transform.x + width / 2},${
            event.transform.y + height / 2
          }) scale(${event.transform.k})`
        );
        setScale(event.transform.k);
        setTranslate({ x: event.transform.x, y: event.transform.y });
      });

    // 应用缩放行为到SVG
    svg.call(zoom);

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
      .range([-Math.PI, Math.PI]); // 从-180度开始，到180度结束

    // 创建颜色比例尺 - 使用config.js中的颜色
    const colorScale = d3
      .scaleOrdinal()
      .domain(Object.keys(CONFIG.colors))
      .range(Object.values(CONFIG.colors));

    // 绘制内圈
    mainGroup
      .append("circle")
      .attr("r", innerRadius)
      .attr("fill", "none")
      .attr("stroke", CONFIG.colors.others)
      .attr("stroke-width", CONFIG.styles.box.strokeWidth);

    // 绘制特征
    if (data.features && Array.isArray(data.features)) {
      const featureGroup = mainGroup.append("g").attr("class", "features");

      // 处理特征数据，计算径向位置和各段弧线
      const processedFeatures = data.features
        .map((feature) => {
          // 验证特征位置数据的有效性
          if (
            !feature.location ||
            !Array.isArray(feature.location) ||
            feature.location.length === 0
          ) {
            console.warn("Invalid feature location:", feature);
            return null;
          }

          // 处理特征的所有段，拆分跨越0弧度的段
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

            // 处理跨越0弧度的段
            if (stop < start) {
              // 跨越0弧度的段，拆分成两段
              processedSegments.push({
                start: start,
                stop: totalLength,
                isFirst: locIndex === 0,
                isTextSegment: locIndex === 0,
              });
              processedSegments.push({
                start: 0,
                stop: stop,
                isFirst: false,
                isTextSegment: false,
              }); // 第二段不用于文本

              // 计算原始段的中点角度（用于确定特征的主角度）
              if (locIndex === 0 && firstSegmentMidAngle === null) {
                // 对于跨越0弧度的第一段，特殊计算中点角度
                const mid = (startAngle + stopAngle) / 2;
                firstSegmentMidAngle = mid < 0 ? mid + 2 * Math.PI : mid; // 确保角度为正
              }
            } else {
              // 正常段
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
          let minAngle = Math.PI;
          let maxAngle = -Math.PI;
          let hasCrossZeroSpan = false;

          processedSegments.forEach(({ start, stop }) => {
            const startAngle = angleScale(start);
            const stopAngle = angleScale(stop);

            if (stopAngle < startAngle) {
              // 这是拆分后跨越0的段（不应该发生，因为我们已经拆分了），或原始数据中的单段跨越0（应该在上面处理了）
              // 但是为了健壮性，还是检查一下
              hasCrossZeroSpan = true;
              minAngle = Math.min(minAngle, stopAngle);
              maxAngle = Math.max(maxAngle, startAngle);
            } else {
              minAngle = Math.min(minAngle, startAngle);
              maxAngle = Math.max(maxAngle, stopAngle);
            }
          });

          // 如果整体跨越了0（例如一个特征包含两段，一段在末尾，一段在开头），特殊处理角度范围
          if (maxAngle - minAngle > Math.PI) {
            // 如果角度跨度大于180度，可能跨越了0
            hasCrossZeroSpan = true;
          }

          // 返回处理后的特征对象
          return {
            ...feature,
            segments: processedSegments, // 实际可视化段
            angle:
              firstSegmentMidAngle !== null
                ? firstSegmentMidAngle
                : angleScale(processedSegments[0].start), // 使用第一个原始段的中点角度，如果没有则使用第一个可视化段的起点角度
            radialOffset: 0, // 特征的径向偏移（用于避免重叠）
            totalLength: feature.location.reduce((sum, loc) => {
              const start = parseInt(loc[0], 10);
              const stop = parseInt(loc[loc.length - 1], 10);
              if (isNaN(start) || isNaN(stop)) return sum;
              if (stop < start) return sum + (totalLength - start + stop); // 跨越0
              return sum + (stop - start);
            }, 0), // 计算原始总长度
            angleRange: {
              // 用于重叠检测的整体角度范围
              min: minAngle,
              max: maxAngle,
              hasCrossZero: hasCrossZeroSpan,
            },
          };
        })
        .filter(Boolean); // 移除无效的特征

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

      // 创建特征弧生成器（用于绘制单个段）
      const segmentArc = d3
        .arc()
        .innerRadius((d) => innerRadius + 8 + d.radialOffset * layerSpacing)
        .outerRadius((d) => innerRadius + 24 + d.radialOffset * layerSpacing);

      // 为每个特征创建单独的组
      const featureElements = featureGroup
        .selectAll("g.feature")
        .data(processedFeatures)
        .enter()
        .append("g")
        .attr("class", "feature");

      // 绘制特征的每个段弧线
      featureElements.each(function (d, featureIndex) {
        const featureElement = d3.select(this);
        d.segments.forEach((segment, segmentIndex) => {
          // 计算段的起始和结束角度
          let startAngle = angleScale(segment.start);
          let stopAngle = angleScale(segment.stop);

          // 如果起始角度大于结束角度，交换角度以绘制小弧
          if (startAngle > stopAngle) {
            [startAngle, stopAngle] = [stopAngle, startAngle];
          }

          // 将特征位置旋转180度 (PI弧度)
          startAngle += Math.PI;
          stopAngle += Math.PI;

          // 使用segmentArc生成器为每个段绘制路径
          const segmentD = segmentArc({
            startAngle: startAngle,
            endAngle: stopAngle,
            radialOffset: d.radialOffset, // 使用特征的整体径向偏移
          });

          featureElement
            .append("path")
            .attr("d", segmentD)
            // 根据特征类型设置填充颜色
            .attr("fill", CONFIG.colors[d.type] || CONFIG.colors.others)
            .attr("stroke", CONFIG.styles.box.strokeColor)
            .attr("stroke-width", CONFIG.styles.box.strokeWidth)
            .attr("fill-opacity", CONFIG.styles.box.fillOpacity)
            .style("cursor", "pointer")
            .on("click", (event) => onFeatureClick?.(d)) // 点击整个特征组触发事件
            .on("mouseover", function () {
              featureElement
                .selectAll("path") // 高亮整个特征的所有段
                .attr("stroke", CONFIG.colors.others)
                .attr("stroke-width", CONFIG.styles.box.strokeWidth * 2);
            })
            .on("mouseout", function () {
              featureElement
                .selectAll("path")
                .attr("stroke", CONFIG.styles.box.strokeColor)
                .attr("stroke-width", CONFIG.styles.box.strokeWidth);
            })
            .each(function () {
              // 使用不同的参数名避免冲突
              // 为第一个实际可视化段创建文本路径
              if (segment.isTextSegment) {
                // Arc是封闭路径，需要使用正则表达式提取Arc的圆弧部分
                const firstArcSection = /(^.+?)L/;
                const pathD = d3.select(this).attr("d");
                const newArc = firstArcSection.exec(pathD);

                if (newArc && newArc[1]) {
                  const cleanArc = newArc[1].replace(/,/g, " ");

                  // 计算段的长度
                  const pathNode = d3.select(this).node();
                  const pathLength = pathNode ? pathNode.getTotalLength() : 0;

                  // 估算文本长度（每个字符约6像素）
                  const textContent = d.information?.gene || d.type; // 使用不同的变量名
                  const estimatedTextLength =
                    textContent.length *
                    CONFIG.styles.annotation.fontSize *
                    0.6;

                  // 只有当文本长度小于段长度时才创建文本路径
                  if (estimatedTextLength < pathLength * 0.9) {
                    // 使用90%的弧长作为阈值，稍微宽松一些
                    featureElement // 在特征组内添加文本路径
                      .append("path")
                      .attr("id", `text-path-${featureIndex}-${segmentIndex}`)
                      .attr("d", cleanArc)
                      .attr("fill", "none")
                      .attr("stroke", colorScale(d.type))
                      .attr("stroke-width", 1)
                      .attr("stroke-dasharray", "4,4")
                      .style("opacity", 0.5);
                  } else {
                  }
                } else {
                }
              }
            });
        });
      });

      // 添加标签（只为第一个实际可视化段添加文本）
      featureElements.each(function (d, featureIndex) {
        const featureElement = d3.select(this);
        const textSegment = d.segments.find((s) => s.isTextSegment); // 找到用于文本的段

        if (textSegment) {
          const text = d.information?.gene || d.type;
          // 查找对应的文本路径
          const textPathId = `text-path-${featureIndex}-${d.segments.indexOf(
            textSegment
          )}`;
          const textPathElement = featureElement
            .select(`#${textPathId}`)
            .node();

          if (textPathElement) {
            // 确保文本路径存在

            // 检查文本长度是否适合路径
            const pathLength = textPathElement.getTotalLength();
            const estimatedTextLength =
              text.length * CONFIG.styles.annotation.fontSize * 0.6;

            if (estimatedTextLength < pathLength * 0.9) {
              // 文本长度阈值与创建文本路径一致
              featureElement
                .append("text")
                .append("textPath")
                .attr("xlink:href", `#${textPathId}`)
                .style("text-anchor", "middle") // 文本居中
                .attr("startOffset", "50%") // 文本路径起始偏移50%
                .attr("lengthAdjust", "spacingAndGlyphs")
                .attr("fill", CONFIG.styles.annotation.fillDark)
                .attr("font-family", CONFIG.styles.annotation.fontFamily)
                .attr("font-size", `${CONFIG.styles.annotation.fontSize}px`)
                .text(text);
            }
          }
        }
      });
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
        const angle = angleScale(d) + Math.PI / 2;
        return `rotate(${(angle * 180) / Math.PI})`;
      })
      .each(function (d) {
        d3.select(this)
          .append("line")
          .attr("x1", innerRadius)
          .attr("y1", -5)
          .attr("x2", innerRadius)
          .attr("y2", 5)
          .attr("stroke", CONFIG.colors.others)
          .attr("stroke-width", 1);

        // 创建文本组并绘制刻度值文本
        const textGroup = d3
          .select(this)
          .append("g")
          .attr("transform", `translate(${innerRadius - 20}, 0)`); // 将组径向平移到文本位置

        textGroup
          .append("text")
          .attr("x", 0) // 文本在组内的相对位置
          .attr("y", 0)
          .attr("text-anchor", "middle") // 文本锚点在其自身中心
          .attr("fill", CONFIG.styles.annotation.fillDark)
          .attr("font-family", CONFIG.styles.annotation.fontFamily)
          .attr("font-size", `${CONFIG.styles.annotation.fontSize}px`)
          .attr("transform", (d) => {
            const angle = angleScale(d); // 当前刻度的角度 (-PI 到 PI)

            // 根据角度调整文本组的自转，使其始终保持正向朝外
            // 如果角度在左半边 (90度到270度), 旋转 180 度
            // 否则 (右半边), 旋转 0 度
            if (angle > 0 && angle < Math.PI) {
              return "rotate(180)";
            } else {
              return "rotate(0)";
            }
          })
          .text(Math.floor(d)); // 显示刻度值
      });
  }, [data, width, height, onFeatureClick]);

  // 重置视图
  const resetView = () => {
    if (svgRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(750)
        .call(d3.zoom().transform, d3.zoomIdentity);
    }
  };

  // 缩放控制
  const zoomIn = () => {
    if (svgRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(750)
        .call(d3.zoom().scaleBy, 1.5);
    }
  };

  const zoomOut = () => {
    if (svgRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(750)
        .call(d3.zoom().scaleBy, 0.75);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        backgroundColor: "#121212",
      }}
    >
      <svg
        ref={svgRef}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#121212",
          fontSize: `${CONFIG.styles.annotation.fontSize}px`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "20px",
          display: "flex",
          gap: "10px",
          zIndex: 1000,
        }}
      >
        <button
          onClick={zoomIn}
          style={{
            padding: "8px 12px",
            backgroundColor: CONFIG.colors.others,
            border: "none",
            borderRadius: "4px",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          +
        </button>
        <button
          onClick={zoomOut}
          style={{
            padding: "8px 12px",
            backgroundColor: CONFIG.colors.others,
            border: "none",
            borderRadius: "4px",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          -
        </button>
        <button
          onClick={resetView}
          style={{
            padding: "8px 12px",
            backgroundColor: CONFIG.colors.others,
            border: "none",
            borderRadius: "4px",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          重置
        </button>
      </div>
    </div>
  );
};

export default CircularSequenceRenderer;
