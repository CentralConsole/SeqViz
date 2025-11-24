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
 * Setup SVG and calculate layout parameters
 * @param {Object} svgRef - React ref to SVG element
 * @param {number} width - Container width
 * @param {number} height - Container height
 * @param {number} totalLength - Total sequence length
 * @returns {Object} Setup result with svg, contentGroup, axisGroup, margin, lengthScale, etc.
 */
function setupSVGAndLayout(svgRef, width, height, totalLength) {
  // Clear previous content
  d3.select(svgRef.current).selectAll("*").remove();

  // Calculate layout parameters
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

  // Create scale
  const lengthScale = d3
    .scaleLinear()
    .domain([0, totalLength])
    .range([0, contentWidth]);

  // Calculate minimum visible width (at least 1 pixel)
  const minVisibleWidth = Math.max(1, contentWidth / totalLength);

  // Main container
  const svg = d3
    .select(svgRef.current)
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "100%")
    .style("backgroundColor", CONFIG.styles.background.color);

  // Create scrollable content group
  const contentGroup = svg
    .append("g")
    .attr("class", "content")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // Create fixed axis group (after content group to ensure it's on top)
  const axisGroup = svg
    .append("g")
    .attr("class", "axis-group")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  return {
    svg,
    contentGroup,
    axisGroup,
    margin,
    lengthScale,
    contentWidth,
    viewportHeight,
    fontSize,
    boxHeight,
    vSpace,
    minVisibleWidth,
  };
}

/**
 * Render axis and metadata
 * @param {d3.Selection} axisGroup - Axis group element
 * @param {d3.Selection} svg - SVG selection
 * @param {Object} data - Sequence data
 * @param {Object} margin - Margin object
 * @param {number} width - Container width
 * @param {Function} lengthScale - Length scale function
 * @param {boolean} hideInlineMeta - Whether to hide inline metadata
 */
function renderAxisAndMetadata(
  axisGroup,
  svg,
  data,
  margin,
  width,
  lengthScale,
  hideInlineMeta
) {
  // Create axis and metadata container group
  const axisContainer = axisGroup.append("g").attr("class", "axis-container");

  // Add axis background
  axisContainer
    .append("rect")
    .attr("x", -margin.left)
    .attr("y", -margin.top)
    .attr("width", width + margin.left + margin.right)
    .attr("height", margin.top + 20)
    .attr("fill", CONFIG.styles.axis.background.fill)
    .attr("stroke", CONFIG.styles.axis.background.stroke);

  // Add metadata display
  if (!hideInlineMeta) {
    const metaInfoGroup = axisContainer.append("g").attr("class", "meta-info");

    // Add title
    metaInfoGroup
      .append("text")
      .attr("class", "meta-title")
      .attr("x", width / 2)
      .attr("y", -margin.top + 20)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("fill", CONFIG.styles.axis.text.fill)
      .style("font-family", CONFIG.fonts.primary.family)
      .text(data.definition || "");

    // Add description
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
      .style("font-family", CONFIG.fonts.primary.family)
      .text(description);
  }

  // Axis
  const topAxis = d3
    .axisTop(lengthScale)
    .ticks(Math.min(20, Math.floor(width / 50)))
    .tickFormat((d) => {
      return d.toLocaleString();
    });

  axisContainer.append("g").call(topAxis);

  // Apply axis styles
  axisContainer
    .selectAll("path, line")
    .attr("stroke", CONFIG.styles.axis.stroke)
    .attr("stroke-width", CONFIG.styles.axis.strokeWidth);

  axisContainer
    .selectAll("text")
    .attr("fill", CONFIG.styles.axis.text.fill)
    .attr("font-size", `${CONFIG.styles.axis.text.fontSize}px`)
    .attr("font-family", CONFIG.styles.axis.text.fontFamily);
}

/**
 * Assign features to rows to avoid overlaps
 * @param {Array} features - Array of feature objects
 * @param {Function} lengthScale - Length scale function
 * @param {number} minVisibleWidth - Minimum visible width
 * @returns {Array} Array of rows, each containing features
 */
function assignFeaturesToRows(features, lengthScale, minVisibleWidth) {
  // Multi-row layout: greedy row assignment
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
          ...other.location.map((loc) => Number(DataUtils.cleanString(loc[0])))
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
        break;
      }
    }
  });

  return rows;
}

/**
 * Render restriction sites
 * @param {d3.Selection} axisGroup - Axis group element (already translated to correct position)
 * @param {Array} resSites - Array of restriction sites
 * @param {Function} lengthScale - Length scale function
 */
function renderRestrictionSites(axisGroup, resSites, lengthScale) {
  if (!resSites || !Array.isArray(resSites)) {
    return;
  }

  const resSiteGroup = axisGroup.append("g").attr("class", "restriction-sites");

  resSites.forEach((site) => {
    if (!site.position || !site.enzyme) return;

    const position = parseInt(site.position, 10);
    if (isNaN(position)) return;

    const x = lengthScale(position);
    const axisY = 0; // Axis is at y=0 in axisGroup's coordinate system

    // Draw vertical marker line (extending upward from axis)
    resSiteGroup
      .append("line")
      .attr("x1", x)
      .attr("y1", axisY) // Start at axis
      .attr("x2", x)
      .attr("y2", axisY - 15) // Extend 15px upward
      .attr("stroke", "#ff6b6b")
      .attr("stroke-width", 2)
      .attr("class", "restriction-site-marker");

    // Add enzyme name label (above the marker line)
    resSiteGroup
      .append("text")
      .attr("x", x)
      .attr("y", axisY - 20) // 20px above axis
      .text(site.enzyme)
      .attr("class", "restriction-site-label")
      .style("font-family", CONFIG.styles.annotation.fontFamily)
      .style("font-size", "10px")
      .style("fill", "#ff6b6b")
      .style("text-anchor", "middle")
      .style("dominant-baseline", "bottom")
      .style("pointer-events", "none");
  });
}

/**
 * Render all features in linear layout
 * @param {d3.Selection} contentGroup - Content group element
 * @param {Array} features - Array of feature objects
 * @param {Function} lengthScale - Length scale function
 * @param {number} minVisibleWidth - Minimum visible width
 * @param {number} boxHeight - Box height
 * @param {number} fontSize - Font size
 * @param {number} vSpace - Vertical spacing
 * @param {Function} onFeatureClick - Feature click handler
 * @returns {number} Maximum Y position after rendering all features
 */
function renderFeatures(
  contentGroup,
  features,
  lengthScale,
  minVisibleWidth,
  boxHeight,
  fontSize,
  vSpace,
  onFeatureClick
) {
  if (!features || features.length === 0) {
    return vSpace * 5; // Return initial row Y
  }

  // Assign features to rows
  const rows = assignFeaturesToRows(features, lengthScale, minVisibleWidth);

  let currentRowY = vSpace * 5; // Location of the 1st row

  // Render each row
  for (let row = 0; row < rows.length; row++) {
    const rowFeatures = rows[row] || [];
    const rowGroup = contentGroup.append("g").attr("class", `row-${row}`);
    const rowTextNodes = [];

    // Render features in current row
    rowFeatures.forEach((feature, index) => {
      renderFeature(
        rowGroup,
        feature,
        index,
        currentRowY,
        lengthScale,
        minVisibleWidth,
        boxHeight,
        fontSize,
        rowTextNodes,
        onFeatureClick
      );
    });

    // Apply force simulation for outer text nodes
    if (rowTextNodes.length > 0) {
      applyForceSimulationForRow(rowTextNodes, row);
    }

    // Render text labels
    renderRowTextLabels(
      rowGroup,
      rowFeatures,
      rowTextNodes,
      currentRowY,
      lengthScale,
      minVisibleWidth,
      boxHeight,
      fontSize,
      onFeatureClick
    );

    // Calculate max Y for this row
    let rowMaxY = currentRowY + boxHeight;
    if (rowTextNodes.length > 0) {
      const textMaxY = Math.max(
        ...rowTextNodes.map((node) => node.y + node.height / 2)
      );
      rowMaxY = Math.max(rowMaxY, textMaxY);
    }
    currentRowY = rowMaxY + vSpace;
  }

  return currentRowY;
}

/**
 * Render a single feature
 */
function renderFeature(
  rowGroup,
  feature,
  featureIndex,
  y,
  lengthScale,
  minVisibleWidth,
  boxHeight,
  fontSize,
  rowTextNodes,
  onFeatureClick
) {
  const typeConf =
    CONFIG.featureType[feature.type] || CONFIG.featureType.others;
  const featureGroup = rowGroup
    .append("g")
    .attr("class", "feature")
    .datum(feature); // Store feature data for highlight/unhighlight

  // Collect segment centers for drawing bone lines
  const segmentCenters = [];

  // Calculate all segment positions
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
    segmentCenters.push({ x: segmentCenterX, y });
  });

  // Draw bone lines first
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

  // Draw feature boxes and collect text nodes
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

    // Draw arrow or rectangle
    if (typeConf.shape === "arrow") {
      renderArrowSegment(
        featureGroup,
        feature,
        segmentX,
        y,
        segmentW,
        boxHeight,
        typeConf,
        onFeatureClick
      );
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

    // Collect text node if needed
    const text =
      feature.information.gene || feature.information.product || feature.type;
    if (text) {
      const textWidth = TextUtils.measureTextWidth(
        text,
        fontSize,
        CONFIG.fonts.primary.family
      );
      const availableWidth = segmentW - 10;
      const isTruncated = textWidth > availableWidth;

      if (isTruncated) {
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
            row: featureIndex,
          },
          isTruncated: true,
          featureIndex,
          segmentIndex,
        });
      } else {
        // Render inline text
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
}

/**
 * Render arrow segment
 */
function renderArrowSegment(
  featureGroup,
  feature,
  segmentX,
  y,
  segmentW,
  boxHeight,
  typeConf,
  onFeatureClick
) {
  const arrowWidth = Math.min(boxHeight * 1.2, segmentW / 3);
  const arrowNeck = boxHeight * 0.6;
  const rectW = segmentW - arrowWidth;

  const isComplementary = feature.location[0][1];
  let points;

  if (isComplementary) {
    // Left arrow
    points = [
      [segmentX + segmentW, y],
      [segmentX + arrowWidth, y],
      [segmentX + arrowWidth, y + boxHeight / 2 - (boxHeight + arrowNeck) / 2],
      [segmentX, y + boxHeight / 2],
      [segmentX + arrowWidth, y + boxHeight / 2 + (boxHeight + arrowNeck) / 2],
      [segmentX + arrowWidth, y + boxHeight],
      [segmentX + segmentW, y + boxHeight],
    ];
  } else {
    // Right arrow
    points = [
      [segmentX, y],
      [segmentX + rectW, y],
      [segmentX + rectW, y + boxHeight / 2 - (boxHeight + arrowNeck) / 2],
      [segmentX + segmentW, y + boxHeight / 2],
      [segmentX + rectW, y + boxHeight / 2 + (boxHeight + arrowNeck) / 2],
      [segmentX + rectW, y + boxHeight],
      [segmentX, y + boxHeight],
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
    .on("mousedown", function (event) {
      if (event.button === 0) {
        // Left mouse button
        highlightFeature(featureGroup);
      }
    })
    .on("mouseup", function (event) {
      if (event.button === 0) {
        // Left mouse button
        unhighlightFeature(featureGroup);
      }
    })
    .on("mouseleave", function () {
      // Cancel highlight if mouse leaves while button is pressed
      unhighlightFeature(featureGroup);
    });
}

/**
 * Apply force simulation for row text nodes
 */
function applyForceSimulationForRow(rowTextNodes, row) {
  if (rowTextNodes.length === 0) return;

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

/**
 * Render text labels for a row
 */
function renderRowTextLabels(
  rowGroup,
  rowFeatures,
  rowTextNodes,
  currentRowY,
  lengthScale,
  minVisibleWidth,
  boxHeight,
  fontSize,
  onFeatureClick
) {
  rowFeatures.forEach((feature, index) => {
    const y = currentRowY;
    const featureGroup = rowGroup
      .selectAll(".feature")
      .filter((d, i) => i === index);
    const text =
      feature.information.gene || feature.information.product || feature.type;

    if (text) {
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
          // Find force-directed node
          const textNode = rowTextNodes.find(
            (n) =>
              n.text === text &&
              n.box.x === segmentX &&
              n.box.y === y &&
              n.box.width === segmentW &&
              n.featureIndex === index
          );

          if (textNode) {
            // Leader line
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

            // Text background
            featureGroup
              .append("rect")
              .attr("class", "text-bg")
              .attr("x", textNode.x - textNode.width / 2 - 5)
              .attr("y", textNode.y - textNode.height / 2)
              .attr("width", textNode.width + 10)
              .attr("height", textNode.height)
              .attr("fill", CONFIG.interaction.normal.textBackground.fill)
              .attr("stroke", CONFIG.interaction.normal.textBackground.stroke)
              .attr(
                "stroke-width",
                CONFIG.interaction.normal.textBackground.strokeWidth
              )
              .style("opacity", 0);

            // Text
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
              .on("mousedown", function (event) {
                if (event.button === 0) {
                  // Left mouse button
                  highlightFeature(featureGroup);
                }
              })
              .on("mouseup", function (event) {
                if (event.button === 0) {
                  // Left mouse button
                  unhighlightFeature(featureGroup);
                }
              })
              .on("mouseleave", function () {
                // Cancel highlight if mouse leaves while button is pressed
                unhighlightFeature(featureGroup);
              });
          }
        } else {
          // Normal text, anchor to segment center
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
}

/**
 * Setup scroll functionality
 * @param {d3.Selection} svg - SVG selection
 * @param {d3.Selection} contentGroup - Content group element
 * @param {Object} margin - Margin object
 * @param {number} contentHeight - Content height
 * @param {number} viewportHeight - Viewport height
 */
function setupScroll(svg, contentGroup, margin, contentHeight, viewportHeight) {
  const maxScroll = Math.max(0, contentHeight - viewportHeight + margin.bottom); // Add bottom margin

  // Create zoom behavior
  const zoom = d3
    .zoom()
    .scaleExtent([1, 1]) // Disable scaling
    .on("zoom", (event) => {
      // Only apply y-direction transform, keep x position fixed
      const limitedY = Math.max(-maxScroll, Math.min(0, event.transform.y));
      contentGroup.attr(
        "transform",
        `translate(${margin.left}, ${margin.top + limitedY})`
      );
    });

  // Apply zoom behavior to SVG
  svg.call(zoom);

  // Add mouse wheel event handling
  svg.on("wheel", (event) => {
    event.preventDefault();
    const delta = -event.deltaY; // Invert deltaY to correct scroll direction
    const currentTransform = d3.zoomTransform(svg.node());
    const newY = currentTransform.y + delta;

    // Limit scroll range
    const limitedY = Math.max(-maxScroll, Math.min(0, newY));

    // Apply new transform
    svg.call(zoom.transform, d3.zoomIdentity.translate(0, limitedY));
  });
}

/**
 * Linear sequence renderer component
 * @param {Object} props - Component props
 * @param {Object} props.data - Sequence data object
 * @param {number} props.width - Render area width
 * @param {number} props.height - Render area height
 * @param {Function} [props.onFeatureClick] - Feature click event handler
 */
const LinearSequenceRenderer = ({
  data,
  width = 800,
  height = 600,
  onFeatureClick,
  hideInlineMeta,
}) => {
  const svgRef = useRef(null);
  const { sequenceViewer } = CONFIG;

  useEffect(() => {
    console.log("LinearSequenceRenderer useEffect triggered", {
      hasData: !!data,
      hasSvgRef: !!svgRef.current,
      dataKeys: data ? Object.keys(data) : null,
      width,
      height,
    });
    if (!svgRef.current || !data) {
      console.log("LinearSequenceRenderer: 跳过渲染 - svgRef或data为空");
      return;
    }

    // Get total length
    const totalLength = data.locus ? data.locus.sequenceLength : 0;

    // Setup SVG and layout
    const {
      svg,
      contentGroup,
      axisGroup,
      margin,
      lengthScale,
      viewportHeight,
      fontSize,
      boxHeight,
      vSpace,
      minVisibleWidth,
    } = setupSVGAndLayout(svgRef, width, height, totalLength);

    // Render axis and metadata
    renderAxisAndMetadata(
      axisGroup,
      svg,
      data,
      margin,
      width,
      lengthScale,
      hideInlineMeta
    );

    // Render features
    const features = data.features || [];
    const maxY = renderFeatures(
      contentGroup,
      features,
      lengthScale,
      minVisibleWidth,
      boxHeight,
      fontSize,
      vSpace,
      onFeatureClick
    );

    // Calculate content height
    const textBuffer = vSpace * 8; // Buffer space for outer text
    const contentHeight = maxY - margin.top + textBuffer;

    // Render restriction sites (on axis group to align with axis)
    renderRestrictionSites(axisGroup, data.res_site, lengthScale);

    // Setup scroll
    setupScroll(svg, contentGroup, margin, contentHeight, viewportHeight);
  }, [data, width, height, onFeatureClick, hideInlineMeta]);

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

// Highlight & Unhighlight Feature
function highlightFeature(featureGroup) {
  // Use a brighter color for highlight (white or bright yellow)
  const highlightStroke = "#ffffff"; // White for maximum visibility

  featureGroup
    .selectAll("rect.box, polygon.arrow-rect")
    .attr("stroke", highlightStroke)
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
    .attr("stroke", highlightStroke)
    .attr("stroke-width", CONFIG.interaction.hover.leader.strokeWidth);
}
function unhighlightFeature(featureGroup) {
  // Get feature data to restore original stroke color
  const feature = featureGroup.datum();
  const typeConfig =
    feature && feature.type
      ? CONFIG.featureType[feature.type] || CONFIG.featureType.others
      : CONFIG.featureType.others;
  const originalStroke = typeConfig.stroke;

  featureGroup
    .selectAll("rect.box, polygon.arrow-rect")
    .attr("stroke", originalStroke)
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
    .on("mousedown", function (event) {
      if (event.button === 0) {
        // Left mouse button
        highlightFeature(featureGroup);
      }
    })
    .on("mouseup", function (event) {
      if (event.button === 0) {
        // Left mouse button
        unhighlightFeature(featureGroup);
      }
    })
    .on("mouseleave", function () {
      // Cancel highlight if mouse leaves while button is pressed
      unhighlightFeature(featureGroup);
    });
}

export default LinearSequenceRenderer;
