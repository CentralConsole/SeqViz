/**
 * @file CircularSequenceRenderer.jsx
 * @description 圆形序列可视化渲染组件（质粒视图）
 * 主要职责：
 * 1. 管理圆形序列数据的可视化渲染
 * 2. 处理特征（features）的径向布局和显示
 * 3. 实现交互功能（如悬停、缩放、键盘控制等）
 * 4. 协调子组件（如坐标轴、特征弧、文本标注等）的渲染
 * 5. 处理圆形选区的交互和同步
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { CONFIG } from "../../config/config";

/**
 * Highlight a circular feature element
 * @param {d3.Selection} featureElement - D3 selection of the feature element
 * @param {Object} feature - Feature data object
 */
function highlightFeature(featureElement, feature) {
  const typeConfig =
    CONFIG.featureType[feature.type] || CONFIG.featureType.others;

  featureElement
    .selectAll("path")
    .attr("stroke", typeConfig.stroke)
    .attr(
      "stroke-width",
      CONFIG.styles.box.strokeWidth *
        CONFIG.interaction.hover.strokeWidthMultiplier
    );

  featureElement
    .selectAll("text")
    .style("font-weight", CONFIG.interaction.hover.fontWeight)
    .style("fill", CONFIG.styles.annotation.fillDark)
    .style("text-shadow", CONFIG.interaction.hover.textShadow);

  featureElement
    .selectAll(".text-bg")
    .style("fill", CONFIG.interaction.hover.textBackground.fill)
    .style("stroke", CONFIG.interaction.hover.textBackground.stroke)
    .style("stroke-width", CONFIG.interaction.hover.textBackground.strokeWidth);

  featureElement
    .selectAll(".annotation-leader")
    .attr("stroke", CONFIG.interaction.hover.leader.stroke)
    .attr("stroke-width", CONFIG.interaction.hover.leader.strokeWidth);
}

/**
 * Unhighlight a circular feature element
 * @param {d3.Selection} featureElement - D3 selection of the feature element
 * @param {Object} feature - Feature data object
 */
function unhighlightFeature(featureElement, feature) {
  const typeConfig =
    CONFIG.featureType[feature.type] || CONFIG.featureType.others;

  featureElement
    .selectAll("path")
    .attr("stroke", typeConfig.stroke)
    .attr("stroke-width", CONFIG.styles.box.strokeWidth);

  featureElement
    .selectAll("text")
    .style("font-weight", CONFIG.interaction.normal.fontWeight)
    .style("fill", CONFIG.styles.annotation.fillDark)
    .style("text-shadow", CONFIG.interaction.normal.textShadow);

  featureElement
    .selectAll(".text-bg")
    .style("fill", CONFIG.interaction.normal.textBackground.fill)
    .style("stroke", CONFIG.interaction.normal.textBackground.stroke);

  featureElement
    .selectAll(".annotation-leader")
    .attr("stroke", CONFIG.interaction.normal.leader.stroke)
    .attr("stroke-width", CONFIG.interaction.normal.leader.strokeWidth);
}

/**
 * Setup SVG and scales for circular rendering
 * @param {Object} svgRef - React ref to SVG element
 * @param {number} width - Container width
 * @param {number} height - Container height
 * @param {number} totalLength - Total sequence length
 * @returns {Object} SVG setup result with svg, mainGroup, innerRadius, angleScale
 */
function setupSVGAndScales(svgRef, width, height, totalLength) {
  // Clear any object in the svg
  d3.select(svgRef.current).selectAll("*").remove();

  // Create svg
  const svg = d3
    .select(svgRef.current)
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "100%");

  // Create main group
  const mainGroup = svg.append("g");

  // Calculate the inner radius (that is, the radius of the "scale circle")
  const radius = Math.min(width, height) * 0.2; // basic radius
  const innerRadius = radius * 0.8; // radius of the "scale circle"

  // Create a mapping from seq length to 2 * Math.PI
  const angleScale = d3
    .scaleLinear()
    .domain([0, totalLength])
    .range([0, 2 * Math.PI]);

  // Draw the inner radius
  mainGroup
    .append("circle")
    .attr("r", innerRadius)
    .attr("fill", "none")
    .attr("stroke", CONFIG.styles.axis.stroke)
    .attr("stroke-width", CONFIG.styles.axis.strokeWidth);

  return { svg, mainGroup, innerRadius, angleScale };
}

/**
 * Wrap text into multiple lines based on max width
 * @param {string} text - Text to wrap
 * @param {number} maxWidth - Maximum width in pixels
 * @param {number} fontSize - Font size
 * @param {number} maxLines - Maximum number of lines
 * @returns {string[]} Array of text lines
 */
function wrapText(text, maxWidth, fontSize, maxLines = 3) {
  if (!text) return [];

  // Estimate the charwidth (we use a monospace font, so the estimation is accurate)
  const avgCharWidth = fontSize * 0.6;
  const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);

  // Prepare for meta data displaying
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
        // Forced truncation of a single word
        lines.push(word.substring(0, maxCharsPerLine - 3) + "...");
        currentLine = "";
      }

      // Liminating the max line, forced truncation
      if (lines.length >= maxLines) {
        break;
      }
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine); // add a line to displaying
  }

  // If max line reached, show "..."
  if (
    lines.length === maxLines &&
    words.length > lines.join(" ").split(" ").length
  ) {
    const lastLine = lines[maxLines - 1];
    lines[maxLines - 1] = lastLine.substring(0, lastLine.length - 3) + "...";
  }

  return lines;
}

/**
 * Render metadata in the center of the circle
 * @param {d3.Selection} mainGroup - Main SVG group
 * @param {Object} data - Sequence data
 * @param {number} innerRadius - Inner radius of the circle
 */
function renderMetadata(mainGroup, data, innerRadius) {
  // Create the meta info group (to be placed in the center of the circle)
  const metaInfoGroup = mainGroup.append("g").attr("class", "meta-info");

  // The meta data should be displayed at the center of the inner circle
  const inscribedSquareSize = innerRadius * Math.sqrt(2) * 0.8; // 80% for safety
  const maxTextWidth = inscribedSquareSize;

  // Add title
  const titleText = data.definition || "";
  const titleLines = wrapText(titleText, maxTextWidth, 14, 3);
  const lineHeight = 16;
  const titleStartY = -50;

  // Render title with d3.js
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

  if (titleText && titleLines.length > 0) {
    metaInfoGroup
      .selectAll(".meta-title")
      .filter((d, i) => i === 0)
      .append("title")
      .text(titleText);
  }

  // Calculate positions for other elements of the meta data
  const otherElementsStartY = titleStartY + titleLines.length * lineHeight + 10;

  // Add seq length
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

  // Add molecule type
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

  // Add biological division
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
}

/**
 * Render restriction sites
 * @param {d3.Selection} mainGroup - Main SVG group
 * @param {Array} resSites - Array of restriction sites
 * @param {Function} angleScale - Angle scale function
 * @param {number} _innerRadius - Inner radius of the circle (used for positioning)
 * @returns {number} Maximum radius after rendering restriction sites
 */
function renderRestrictionSites(mainGroup, resSites, angleScale, _innerRadius) {
  const innerRadius = _innerRadius; // Use parameter for positioning
  if (!resSites || !Array.isArray(resSites)) {
    return innerRadius;
  }

  const resSiteGroup = mainGroup.append("g").attr("class", "restriction-sites");

  // Collect processed site label positions for grouping
  const processedSites = [];

  resSites.forEach((site) => {
    if (!site.position || !site.enzyme) return;

    const position = parseInt(site.position, 10);
    if (isNaN(position)) return;

    // Convert position to angle
    const angle = angleScale(position);

    // Create one group per site and rotate it; draw a radial tick in local coords
    const siteGroup = resSiteGroup.append("g").attr("transform", () => {
      const angle = angleScale(position) - Math.PI / 2;
      return `rotate(${(angle * 180) / Math.PI})`;
    });

    // Radial line from innerRadius outward
    siteGroup
      .append("line")
      .attr("x1", innerRadius)
      .attr("y1", 0)
      .attr("x2", innerRadius + CONFIG.styles.axis.tickLength) // outward or inward
      .attr("y2", 0)
      .attr("stroke", "#ff6b6b")
      .attr("stroke-width", 2)
      .attr("class", "restriction-site-marker");

    // Collect label target position (slightly outside inner circle)
    const labelRadius = innerRadius + 50;
    const labelX = Math.cos(angle) * labelRadius;
    const labelY = Math.sin(angle) * labelRadius;
    processedSites.push({
      angle,
      x: labelX,
      y: labelY,
      enzyme: site.enzyme,
    });
  });

  // Group nearby labels into clusters and render merged labels
  if (processedSites.length > 0) {
    const labelRadius = innerRadius + 50;
    const arcPixelThreshold = 5; // pixels along the circle
    const angleThreshold = arcPixelThreshold / Math.max(1, labelRadius);

    const sorted = processedSites.slice().sort((a, b) => a.angle - b.angle); // sort by angle
    const groups = []; // prepare for clustering
    let current = [];
    for (let i = 0; i < sorted.length; i++) {
      if (current.length === 0) {
        current.push(sorted[i]);
      } else {
        const prev = current[current.length - 1];
        const delta = sorted[i].angle - prev.angle;
        if (delta <= angleThreshold) {
          current.push(sorted[i]);
        } else {
          groups.push(current);
          current = [sorted[i]];
        }
      }
    }
    if (current.length > 0) groups.push(current);

    // Wrap-around merge between last and first cluster
    if (groups.length > 1) {
      const first = groups[0];
      const last = groups[groups.length - 1];
      const wrapDelta =
        first[0].angle + 2 * Math.PI - last[last.length - 1].angle;
      if (wrapDelta <= angleThreshold) {
        groups[0] = last.concat(first);
        groups.pop();
      }
    }

    groups.forEach((cluster) => {
      const names = cluster.map((c) => c.enzyme).filter(Boolean);
      if (names.length === 0) return;
      const labelText = names.slice(0, 3).join(" - ");
      const avg = cluster.reduce(
        (acc, c) => {
          acc.x += c.x;
          acc.y += c.y;
          return acc;
        },
        { x: 0, y: 0 }
      );
      avg.x /= cluster.length;
      avg.y /= cluster.length;

      // Mark names of restriction sites
      resSiteGroup
        .append("text")
        .attr("x", avg.x)
        .attr("y", avg.y * 1.375)
        .text(labelText)
        .attr("class", "restriction-site-label")
        .style("font-family", CONFIG.styles.annotation.fontFamily)
        .style("font-size", "10px")
        .style("fill", "#ff6b6b")
        .style("text-anchor", "middle")
        .style("dominant-baseline", "middle")
        .style("pointer-events", "none");

      if (names.length > 3) {
        // do something
      }
    });
  }

  return innerRadius; // Restriction sites don't extend the radius
}

/**
 * Process features and calculate layering to avoid overlaps
 * @param {Array} features - Array of feature objects
 * @param {Function} angleScale - Angle scale function
 * @returns {Array} Processed features with radialOffset assigned
 */
function processFeaturesForLayering(features, angleScale) {
  if (!features || !Array.isArray(features)) {
    return [];
  }

  // Handling feature data, getting their positions
  const processedFeatures = features
    .map((feature) => {
      // Check if it should be displayed (according to the config)
      const typeConfig =
        CONFIG.featureType[feature.type] || CONFIG.featureType.others;
      if (!typeConfig.isDisplayed) {
        return null;
      }

      // Verify the validity of the feature location
      if (
        !feature.location ||
        !Array.isArray(feature.location) ||
        feature.location.length === 0
      ) {
        console.warn("Invalid feature location:", feature);
        return null;
      }

      // For a feature that has more than 1 segments: handling all segments
      const processedSegments = [];
      let firstSegmentMidAngle = null; // middle angle of the first segment

      feature.location.forEach((loc, locIndex) => {
        // Validate the position of each segment
        if (!Array.isArray(loc) || loc.length < 2) {
          console.warn("Invalid location array:", loc);
          return;
        }

        // Parse start position
        const startStr = String(loc[0] || "").trim();
        const start = parseInt(startStr, 10);
        if (isNaN(start)) {
          console.warn("Invalid start value:", { start, loc });
          return;
        }

        // Parse stop position based on array format
        let stop;
        let isReverse = false;

        if (loc.length === 2) {
          // Format: [start, isReverse] or [start, stop]
          if (typeof loc[1] === "boolean") {
            // Format: [start, isReverse] - single point location
            stop = start;
            isReverse = loc[1];
          } else {
            // Format: [start, stop] - try to parse as number
            const stopStr = String(loc[1] || "").trim();
            stop = parseInt(stopStr, 10);
            if (isNaN(stop)) {
              // If cannot parse, treat as single point location
              console.warn(
                "Cannot parse stop position, treating as single point:",
                { loc, stopStr }
              );
              stop = start;
            }
          }
        } else if (loc.length >= 3) {
          // Format: [start, isReverse, stop] or [start, ..., stop]
          // Second element is isReverse (boolean)
          if (typeof loc[1] === "boolean") {
            isReverse = loc[1];
            // Last element is stop
            const stopStr = String(loc[loc.length - 1] || "").trim();
            stop = parseInt(stopStr, 10);
          } else {
            // Fallback: treat last element as stop
            const stopStr = String(loc[loc.length - 1] || "").trim();
            stop = parseInt(stopStr, 10);
          }
        }

        if (isNaN(stop)) {
          console.warn("Invalid stop value:", { start, stop, loc });
          return;
        }

        // Convert position to angle
        const startAngle = angleScale(start);
        const stopAngle = angleScale(stop);

        // Add processed segments
        processedSegments.push({
          start,
          stop,
          isFirst: locIndex === 0,
          isTextSegment: locIndex === 0,
          isReverse,
        });

        // Calculate the middle angle of the first segment
        if (locIndex === 0 && firstSegmentMidAngle === null) {
          firstSegmentMidAngle = (startAngle + stopAngle) / 2;
        }
      });

      // Error handling
      if (processedSegments.length === 0) {
        console.warn(
          "Feature has no valid segments after processing:",
          feature
        );
        return null;
      }

      // Calculate the overall angle range for overlap detection
      let minAngle = 2 * Math.PI;
      let maxAngle = 0;

      processedSegments.forEach(({ start, stop }) => {
        const startAngle = angleScale(start);
        const stopAngle = angleScale(stop);
        minAngle = Math.min(minAngle, startAngle);
        maxAngle = Math.max(maxAngle, stopAngle);
      });

      // Check if angle range crosses zero
      const hasCrossZero = minAngle > maxAngle;

      return {
        ...feature,
        segments: processedSegments,
        angle:
          firstSegmentMidAngle !== null
            ? firstSegmentMidAngle
            : angleScale(processedSegments[0].start),
        radialOffset: 0,
        totalLength: feature.location.reduce((sum, loc) => {
          if (!Array.isArray(loc) || loc.length < 2) return sum;

          const startStr = String(loc[0] || "").trim();
          const start = parseInt(startStr, 10);
          if (isNaN(start)) return sum;

          let stop;
          if (loc.length === 2) {
            if (typeof loc[1] === "boolean") {
              stop = start; // Single point
            } else {
              const stopStr = String(loc[1] || "").trim();
              stop = parseInt(stopStr, 10);
              if (isNaN(stop)) stop = start; // Fallback to single point
            }
          } else {
            // loc.length >= 3, last element is stop
            const stopStr = String(loc[loc.length - 1] || "").trim();
            stop = parseInt(stopStr, 10);
            if (isNaN(stop)) return sum; // Skip if cannot parse
          }

          return sum + Math.abs(stop - start);
        }, 0),
        angleRange: {
          min: minAngle,
          max: maxAngle,
          hasCrossZero,
        },
      };
    })
    .filter(Boolean);

  // Calculate the overlaps between different layers of features, and adjust their radial-direction positioning
  // Note: layerSpacing is used in the rendering phase, not here

  // Sort the features by their length, in a descending order, prioritizing longer features
  processedFeatures.sort((a, b) => b.totalLength - a.totalLength);

  // Get maximum layer limit from config
  const maxLayers = CONFIG.dimensions.maxLayers || Infinity;

  // Calculating the radial-direction position (the layer) of each feature
  for (let i = 0; i < processedFeatures.length; i++) {
    const current = processedFeatures[i];
    let layer = 0; // try the most inner layer
    let hasOverlap = true;

    // Try, until no overlap with rendered features or reach max layer
    while (hasOverlap && layer < maxLayers) {
      hasOverlap = false;
      // Check overlapping
      for (let j = 0; j < i; j++) {
        const prev = processedFeatures[j];
        if (prev.radialOffset === layer) {
          // Check overlapping using angle range
          const currentRange = current.angleRange;
          const prevRange = prev.angleRange;

          const hasAngleOverlap =
            // Overlap check of normal conditions
            (!currentRange.hasCrossZero &&
              !prevRange.hasCrossZero &&
              currentRange.min <= prevRange.max &&
              currentRange.max >= prevRange.min) ||
            // Handle cross-zero conditions (1): current feature crossing 0, && the previous feature not crossing 0
            (currentRange.hasCrossZero &&
              !prevRange.hasCrossZero &&
              (currentRange.min <= prevRange.max ||
                currentRange.max >= prevRange.min)) ||
            // Handle cross-zero conditions (2): the previous feature crossing 0, && the current feature not crossing 0
            (!currentRange.hasCrossZero &&
              prevRange.hasCrossZero &&
              (prevRange.min <= currentRange.max ||
                prevRange.max >= currentRange.min)) ||
            // Handle cross-zero conditions (3): the previous feature crossing 0, && the current feature crossing 0
            (currentRange.hasCrossZero && prevRange.hasCrossZero);

          if (hasAngleOverlap) {
            hasOverlap = true;
            break;
          }
        }
      }

      if (hasOverlap) {
        layer++;
      }
    }
    // Set radial offset of current feature (capped at maxLayers - 1)
    current.radialOffset = Math.min(layer, maxLayers - 1);
  }

  // Note: layerSpacing is not used in this function, it's used in the rendering phase
  return processedFeatures;
}

/**
 * Calculate layer radii for feature rendering
 * @param {Array} processedFeatures - Processed features with radialOffset
 * @param {number} innerRadius - Inner radius of the circle
 * @returns {Map} Map of layer index to {inner, outer} radius
 */
function calculateLayerRadii(processedFeatures, innerRadius) {
  const layerRadii = new Map();
  const maxLayers = CONFIG.dimensions.maxLayers || Infinity;
  const maxLayer = Math.min(
    Math.max(...processedFeatures.map((f) => f.radialOffset), 0),
    maxLayers - 1
  );

  for (let layer = 0; layer <= maxLayer; layer++) {
    if (layer === 0) {
      layerRadii.set(0, {
        inner: innerRadius + 8,
        outer: innerRadius + 24,
      });
    } else {
      // Add spacing between layers
      const prevOuter = layerRadii.get(layer - 1).outer;
      layerRadii.set(layer, {
        inner: prevOuter + 8, // 8 pixels spacing
        outer: prevOuter + 24, // 16 pixels layer height
      });
    }
  }

  return layerRadii;
}

/**
 * Render all features in circular layout
 * @param {d3.Selection} mainGroup - Main SVG group
 * @param {Array} features - Array of feature objects
 * @param {Function} angleScale - Angle scale function
 * @param {number} innerRadius - Inner radius of the circle
 * @param {Function} onFeatureClick - Feature click handler
 * @returns {number} Maximum radius after rendering features
 */
function renderFeatures(
  mainGroup,
  features,
  angleScale,
  innerRadius,
  onFeatureClick
) {
  if (!features || !Array.isArray(features) || features.length === 0) {
    return innerRadius;
  }

  const featureGroup = mainGroup.append("g").attr("class", "features");

  // Process features and calculate layering
  const processedFeatures = processFeaturesForLayering(features, angleScale);

  // Layer spacing from CONFIG
  const layerSpacing = CONFIG.dimensions.vSpace;

  // Calculate layer radii
  const layerRadii = calculateLayerRadii(processedFeatures, innerRadius);

  // Create arc generator for drawing each segment
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

  // Group features according to their layers
  const featuresByLayer = new Map();
  processedFeatures.forEach((feature) => {
    const layer = feature.radialOffset;
    if (!featuresByLayer.has(layer)) {
      featuresByLayer.set(layer, []);
    }
    featuresByLayer.get(layer).push(feature);
  });

  const maxLayers = CONFIG.dimensions.maxLayers || Infinity;
  const maxLayer = Math.min(
    Math.max(...processedFeatures.map((f) => f.radialOffset), 0),
    maxLayers - 1
  );
  let currentLayerMaxRadius = innerRadius + 24; // Initialize radius
  let maxRadius = innerRadius;

  // Render each layer
  for (let layer = 0; layer <= maxLayer; layer++) {
    const layerFeatures = featuresByLayer.get(layer) || [];

    // Update radius of the current layer based on the previous (inner) layer
    if (layer > 0) {
      layerRadii.set(layer, {
        inner: currentLayerMaxRadius + 8,
        outer: currentLayerMaxRadius + 24,
      });
    }

    // Create a group for current layer
    const layerGroup = featureGroup.append("g").attr("class", `layer-${layer}`);

    // Render features of current layer
    const layerMaxRadius = renderLayerFeatures(
      layerGroup,
      layerFeatures,
      layer,
      angleScale,
      layerRadii,
      innerRadius,
      layerSpacing,
      segmentArc,
      currentLayerMaxRadius,
      onFeatureClick
    );

    currentLayerMaxRadius = layerMaxRadius;
    maxRadius = Math.max(maxRadius, currentLayerMaxRadius);
  }

  return maxRadius;
}

/**
 * Render features for a single layer
 * @param {d3.Selection} layerGroup - Layer group element
 * @param {Array} layerFeatures - Features in this layer
 * @param {number} layer - Layer index
 * @param {Function} angleScale - Angle scale function
 * @param {Map} layerRadii - Map of layer radii
 * @param {number} innerRadius - Inner radius of the circle
 * @param {number} layerSpacing - Spacing between layers
 * @param {Function} segmentArc - D3 arc generator
 * @param {number} currentLayerMaxRadius - Current maximum radius
 * @param {Function} onFeatureClick - Feature click handler
 * @returns {number} Maximum radius after rendering this layer
 */
function renderLayerFeatures(
  layerGroup,
  layerFeatures,
  layer,
  angleScale,
  layerRadii,
  innerRadius,
  layerSpacing,
  segmentArc,
  currentLayerMaxRadius,
  onFeatureClick
) {
  // Render feature elements
  const featureElements = layerGroup
    .selectAll("g.feature")
    .data(layerFeatures)
    .enter()
    .append("g")
    .attr("class", "feature");

  // Draw arcs of each segment of a feature
  featureElements.each(function (d, featureIndex) {
    const featureElement = d3.select(this);

    d.segments.forEach((segment, segmentIndex) => {
      let startAngle = angleScale(segment.start);
      let stopAngle = angleScale(segment.stop);

      if (startAngle > stopAngle) {
        [startAngle, stopAngle] = [stopAngle, startAngle];
      }

      // If the arc is arrowed, shorten the arc to compensate for the shape of the arrow
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

        // Calculate length of arc (and arrow)
        const arcLength = ((stopAngle - startAngle) * (innerR + outerR)) / 2;
        const maxArrowHeight = arcLength / 3;
        const baseArrowLength = (outerR - innerR) * 1.0;
        const arrowLength = Math.min(baseArrowLength, maxArrowHeight);

        const midRadius = (innerR + outerR) / 2;
        const arrowAngleOffset = arrowLength / midRadius;

        // Shorten arc length
        if (segment.isReverse) {
          startAngle += arrowAngleOffset;
        } else {
          stopAngle -= arrowAngleOffset;
        }
      }

      // Create a segment
      const segmentD = segmentArc({
        startAngle,
        endAngle: stopAngle,
        radialOffset: d.radialOffset,
      });

      // Draw arcs
      const pathElement = featureElement
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
        .on("mousedown", function (event) {
          if (event.button === 0) {
            // Left mouse button
            highlightFeature(featureElement);
          }
        })
        .on("mouseup", function (event) {
          if (event.button === 0) {
            // Left mouse button
            unhighlightFeature(featureElement, d);
          }
        })
        .on("mouseleave", function () {
          // Cancel highlight if mouse leaves while button is pressed
          unhighlightFeature(featureElement, d);
        });

      // Create text path if needed
      if (segment.isTextSegment) {
        createTextPath(
          featureElement,
          segment,
          d,
          startAngle,
          stopAngle,
          layerRadii,
          d.radialOffset,
          innerRadius,
          layerSpacing,
          layer,
          featureIndex,
          segmentIndex
        );
      }

      // Generate arrow if needed
      if (typeConfig.shape === "arrow") {
        generateArrowPath(
          pathElement,
          segment,
          d,
          startAngle,
          stopAngle,
          layerRadii,
          d.radialOffset
        );
      }
    });
  });

  // Render text labels for this layer
  const layerOuterTextNodes = [];
  featureElements.each(function (d, featureIndex) {
    const featureElement = d3.select(this);
    const textSegment = d.segments.find((s) => s.isTextSegment);

    if (textSegment) {
      collectTextNode(
        featureElement,
        textSegment,
        d,
        layer,
        featureIndex,
        angleScale,
        layerRadii,
        innerRadius,
        layerSpacing,
        currentLayerMaxRadius,
        layerOuterTextNodes,
        onFeatureClick
      );
    }
  });

  // Apply force simulation for outer text nodes
  if (layerOuterTextNodes.length > 0) {
    applyForceSimulation(layerOuterTextNodes, layer);
  }

  // Render outer text nodes
  renderOuterTextNodes(layerOuterTextNodes, onFeatureClick);

  // Calculate current layer max radius (including force-simulated outer text)
  let layerMaxRadius =
    layerRadii.get(layer)?.outer || innerRadius + 24 + layer * layerSpacing;

  layerOuterTextNodes.forEach((node) => {
    const textRadius = Math.sqrt(node.x * node.x + node.y * node.y);
    layerMaxRadius = Math.max(layerMaxRadius, textRadius + 10);
  });

  return layerMaxRadius;
}

/**
 * Create text path for feature segment
 */
function createTextPath(
  featureElement,
  segment,
  feature,
  startAngle,
  stopAngle,
  layerRadii,
  radialOffset,
  innerRadius,
  layerSpacing,
  layer,
  featureIndex,
  segmentIndex
) {
  const textContent =
    feature.information?.gene || feature.information?.product || feature.type;
  const estimatedTextLength =
    textContent.length * CONFIG.styles.annotation.fontSize * 0.6;

  const currentLayerRadii = layerRadii.get(radialOffset);
  const innerR = currentLayerRadii?.inner;
  const outerR = currentLayerRadii?.outer;
  const textRadiusOffset = 5;
  const textPathRadius = (innerR + outerR) / 2 - textRadiusOffset;

  const textPathArc = d3
    .arc()
    .innerRadius(textPathRadius)
    .outerRadius(textPathRadius + 1)
    .startAngle(startAngle)
    .endAngle(stopAngle);

  const textPathD = textPathArc();
  const firstArcSection = /(^.+?)L/;
  const arcMatch = firstArcSection.exec(textPathD)?.[1];

  if (arcMatch) {
    let cleanArc = arcMatch.replace(/,/g, " ");
    const approximatePathLength = (stopAngle - startAngle) * textPathRadius;

    if (estimatedTextLength < approximatePathLength * 0.9) {
      let finalPath = cleanArc;
      const segmentMidAngle = (startAngle + stopAngle) / 2;
      const normalizedMidAngle = segmentMidAngle % (2 * Math.PI);
      const isInBottomHalf =
        normalizedMidAngle > Math.PI / 2 &&
        normalizedMidAngle < (3 * Math.PI) / 2;

      if (isInBottomHalf) {
        const startLoc = /M(.*?)A/;
        const middleLoc = /A(.*?)0 0 1/;
        const endLoc = /0 0 1 (.*?)$/;

        const startMatch = startLoc.exec(finalPath);
        const middleMatch = middleLoc.exec(finalPath);
        const endMatch = endLoc.exec(finalPath);

        if (startMatch && middleMatch && endMatch) {
          const newStart = endMatch[1];
          const newEnd = startMatch[1];
          const middleSec = middleMatch[1];
          finalPath = "M" + newStart + "A" + middleSec + "0 0 0 " + newEnd;
        }
      }

      featureElement
        .append("path")
        .attr("id", `text-path-${layer}-${featureIndex}-${segmentIndex}`)
        .attr("d", finalPath)
        .attr("fill", "none")
        .attr("stroke", "none")
        .style("opacity", 0);
    }
  }
}

/**
 * Generate arrow path for feature segment
 */
function generateArrowPath(
  pathElement,
  segment,
  feature,
  startAngle,
  stopAngle,
  layerRadii,
  radialOffset
) {
  const pathNode = pathElement.node();
  if (!pathNode) return;

  const svgString = pathNode.outerHTML;
  const dAttributeMatch = svgString.match(/d="([^"]+)"/);
  if (!dAttributeMatch) return;

  const pathData = dAttributeMatch[1];
  const looseArcMatches = [...pathData.matchAll(/A[^A]*?(?=A|L|Z|$)/g)];

  let outerArc = null;
  let innerArc = null;

  if (looseArcMatches.length > 0) {
    const parseArcCommand = (arcString) => {
      const paramString = arcString.replace(/^A\s*/, "").trim();
      const numbers = paramString.match(/([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/g);

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

    outerArc = parseArcCommand(looseArcMatches[0][0]);
    if (looseArcMatches.length >= 2) {
      innerArc = parseArcCommand(looseArcMatches[1][0]);
    }
  }

  if (!outerArc) return;

  const currentLayerRadii = layerRadii.get(radialOffset);
  const innerR = currentLayerRadii?.inner;
  const outerR = currentLayerRadii?.outer;

  let arrowX, arrowY, arrowAngle, tangentAngle;

  if (segment.isReverse) {
    const startMatch = pathData.match(/M\s*([-\d.e]+)[,\s]+([-\d.e]+)/);
    if (startMatch) {
      arrowX = parseFloat(startMatch[1]);
      arrowY = parseFloat(startMatch[2]);
      arrowAngle = Math.atan2(arrowY, arrowX);
      tangentAngle = arrowAngle - Math.PI / 2;
    }
  } else {
    arrowX = outerArc.endX;
    arrowY = outerArc.endY;
    arrowAngle = Math.atan2(arrowY, arrowX);
    tangentAngle = arrowAngle + Math.PI / 2;
  }

  const startMatch = pathData.match(/M\s*([-\d.e]+)[,\s]+([-\d.e]+)/);
  if (!startMatch) return;

  let arrowPath;

  if (innerArc && innerR && outerR) {
    const arcLength = ((stopAngle - startAngle) * (innerR + outerR)) / 2;
    const maxArrowHeight = arcLength / 3;
    const baseArrowLength = (outerR - innerR) * 1.0;
    const arrowLength = Math.min(baseArrowLength, maxArrowHeight);

    let outerEndPoint, innerEndPoint;

    if (segment.isReverse) {
      outerEndPoint = [arrowX, arrowY];
      const innerArcEndMatch = pathData.match(
        /.*\s+([-\d.e]+)[,\s]+([-\d.e]+)\s*Z?\s*$/
      );
      innerEndPoint = innerArcEndMatch
        ? [parseFloat(innerArcEndMatch[1]), parseFloat(innerArcEndMatch[2])]
        : [Math.cos(arrowAngle) * innerR, Math.sin(arrowAngle) * innerR];
    } else {
      outerEndPoint = [outerArc.endX, outerArc.endY];
      const innerArcStartMatch = pathData.match(
        /L\s*([-\d.e]+)[,\s]+([-\d.e]+)/
      );
      innerEndPoint = innerArcStartMatch
        ? [parseFloat(innerArcStartMatch[1]), parseFloat(innerArcStartMatch[2])]
        : [Math.cos(arrowAngle) * innerR, Math.sin(arrowAngle) * innerR];
    }

    const midX = (outerEndPoint[0] + innerEndPoint[0]) / 2;
    const midY = (outerEndPoint[1] + innerEndPoint[1]) / 2;
    const tip = [
      midX + Math.cos(tangentAngle) * arrowLength,
      midY + Math.sin(tangentAngle) * arrowLength,
    ];

    if (segment.isReverse) {
      const firstLIndex = pathData.indexOf("L");
      const beforeFirstL = pathData.substring(0, firstLIndex);
      const fromFirstL = pathData.substring(firstLIndex);
      const originalStart = pathData.match(/M\s*([-\d.e]+)[,\s]+([-\d.e]+)/);
      if (originalStart) {
        arrowPath = `M ${innerEndPoint[0]} ${innerEndPoint[1]} L ${tip[0]} ${
          tip[1]
        } L ${originalStart[1]} ${originalStart[2]} ${beforeFirstL.substring(
          beforeFirstL.indexOf("A")
        )} ${fromFirstL} Z`;
      }
    } else {
      const firstLIndex = pathData.indexOf("L");
      const beforeFirstL = pathData.substring(0, firstLIndex);
      const fromFirstL = pathData.substring(firstLIndex);
      arrowPath = `${beforeFirstL} L ${tip[0]} ${tip[1]} L ${innerEndPoint[0]} ${innerEndPoint[1]} ${fromFirstL}`;
    }
  }

  if (arrowPath) {
    pathElement.attr("d", arrowPath);
  }
}

/**
 * Collect text node information for outer text rendering
 */
function collectTextNode(
  featureElement,
  textSegment,
  feature,
  layer,
  featureIndex,
  angleScale,
  layerRadii,
  innerRadius,
  layerSpacing,
  currentLayerMaxRadius,
  layerOuterTextNodes,
  onFeatureClick
) {
  const text =
    feature.information?.gene || feature.information?.product || feature.type;
  const textPathId = `text-path-${layer}-${featureIndex}-${feature.segments.indexOf(
    textSegment
  )}`;
  const textPathElement = featureElement.select(`#${textPathId}`).node();

  const estimatedTextLength =
    text.length * CONFIG.styles.annotation.fontSize * 0.6;
  let isTruncated = true;
  let pathLength = 0;

  if (textPathElement) {
    pathLength = textPathElement.getTotalLength();
    isTruncated = estimatedTextLength >= pathLength * 0.9;
  }

  if (!isTruncated && textPathElement) {
    // Render text along path
    let startAngle = angleScale(textSegment.start);
    let stopAngle = angleScale(textSegment.stop);
    if (startAngle > stopAngle) {
      [startAngle, stopAngle] = [stopAngle, startAngle];
    }

    const segmentMidAngle = (startAngle + stopAngle) / 2;
    const normalizedMidAngle = segmentMidAngle % (2 * Math.PI);
    const isInBottomHalf =
      normalizedMidAngle > Math.PI / 2 &&
      normalizedMidAngle < (3 * Math.PI) / 2;

    const radiusOffset = -CONFIG.styles.annotation.fontSize / 1.618;
    const dx = -radiusOffset * Math.sin(segmentMidAngle);
    const dy = radiusOffset * Math.cos(segmentMidAngle);

    featureElement
      .append("text")
      .attr(
        "transform",
        isInBottomHalf ? `translate(${dx}, ${dy})` : `translate(0,0)`
      )
      .style("cursor", CONFIG.interaction.hover.cursor)
      .on("mousedown", function (event) {
        if (event.button === 0) {
          // Left mouse button
          highlightFeature(featureElement);
        }
      })
      .on("mouseup", function (event) {
        if (event.button === 0) {
          // Left mouse button
          unhighlightFeature(featureElement, feature);
        }
      })
      .on("mouseleave", function () {
        // Cancel highlight if mouse leaves while button is pressed
        unhighlightFeature(featureElement, feature);
      })
      .on("click", () => onFeatureClick?.(feature))
      .append("textPath")
      .attr("xlink:href", `#${textPathId}`)
      .style("text-anchor", "middle")
      .attr("startOffset", "50%")
      .attr("lengthAdjust", "spacingAndGlyphs")
      .attr("fill", CONFIG.styles.annotation.fillDark)
      .attr("font-family", CONFIG.styles.annotation.fontFamily)
      .attr("font-size", `${CONFIG.styles.annotation.fontSize}px`)
      .text(text);
  } else {
    // Collect for outer text rendering
    let startAngle = angleScale(textSegment.start);
    let stopAngle = angleScale(textSegment.stop);
    if (startAngle > stopAngle) {
      [startAngle, stopAngle] = [stopAngle, startAngle];
    }
    const midAngle = (startAngle + stopAngle) / 2;
    const outerRadius =
      layerRadii.get(feature.radialOffset)?.outer ||
      innerRadius + 24 + feature.radialOffset * layerSpacing;

    const adjustedAngle = midAngle - Math.PI / 2;
    const textDistance = currentLayerMaxRadius + 30;
    const textX = Math.cos(adjustedAngle) * textDistance;
    const textY = Math.sin(adjustedAngle) * textDistance;

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
      feature,
      isTruncated: true,
    });
  }
}

/**
 * Apply force simulation to outer text nodes
 */
function applyForceSimulation(layerOuterTextNodes, layer) {
  const centerStrength = -0.008 / (2 + layer);
  const simulation = d3
    .forceSimulation(layerOuterTextNodes)
    .velocityDecay(0.7)
    .force(
      "repel",
      d3.forceManyBody().strength(-0.00001).distanceMax(30).distanceMin(0)
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

  for (let i = 0; i < 75; ++i) {
    simulation.tick();
  }
}

/**
 * Render outer text nodes with leaders
 */
function renderOuterTextNodes(layerOuterTextNodes, onFeatureClick) {
  layerOuterTextNodes.forEach((node) => {
    // Add leader line
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

    // Add text background
    node.featureElement
      .append("rect")
      .attr("class", "text-bg")
      .attr("x", node.x - node.width / 2 - 5)
      .attr("y", node.y - node.height / 2)
      .attr("width", node.width + 10)
      .attr("height", node.height)
      .style("fill", "none")
      .style("stroke", "none");

    // Add text
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
      .on("mousedown", function (event) {
        if (event.button === 0 && node.feature) {
          // Left mouse button
          highlightFeature(node.featureElement);
        }
      })
      .on("mouseup", function (event) {
        if (event.button === 0 && node.feature) {
          // Left mouse button
          unhighlightFeature(node.featureElement, node.feature);
        }
      })
      .on("mouseleave", function () {
        // Cancel highlight if mouse leaves while button is pressed
        if (node.feature) {
          unhighlightFeature(node.featureElement, node.feature);
        }
      })
      .on("click", () => {
        if (node.feature) {
          onFeatureClick?.(node.feature);
        }
      });
  });
}

/**
 * Render ticks around the circle
 * @param {d3.Selection} mainGroup - Main SVG group
 * @param {number} totalLength - Total sequence length
 * @param {Function} angleScale - Angle scale function
 * @param {number} innerRadius - Inner radius of the circle
 */
function renderTicks(mainGroup, totalLength, angleScale, innerRadius) {
  const tickCount = 12;
  const ticks = d3.range(tickCount).map((i) => (i * totalLength) / tickCount);

  // Create tick group
  const tickGroup = mainGroup.append("g").attr("class", "ticks");

  // Draw tick lines and labels
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
        .attr("x2", innerRadius - CONFIG.styles.axis.tickLength)
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
            return "rotate(90)"; // IMPORTANT: 0度时，文本需要旋转90度，否则方向错误
          }
          if (angle === Math.PI) {
            return "rotate(-90)"; // IMPORTANT: 180度时，文本需要旋转-90度，否则方向错误
          }
          return "";
        })
        .text(Math.floor(d));
    });
}

/**
 * Setup zoom functionality
 * @param {d3.Selection} svg - SVG selection
 * @param {d3.Selection} mainGroup - Main group selection
 * @param {number} width - Container width
 * @param {number} height - Container height
 * @param {number} maxRadius - Maximum radius of visualization
 * @param {Object} transformRef - Transform reference for keyboard shortcuts
 * @param {Function} setScale - Set scale state function
 * @param {Function} setTranslate - Set translate state function
 */
function setupZoom(
  svg,
  mainGroup,
  width,
  height,
  maxRadius,
  transformRef,
  setScale,
  setTranslate
) {
  // Calculate fit scale based on current content max radius
  const fitPadding = 20; // Appropriate padding (pixels)
  let fitScale = 1;
  if (maxRadius > 0) {
    const sx = (width / 2 - fitPadding) / maxRadius;
    const sy = (height / 2 - fitPadding) / maxRadius;
    fitScale = Math.min(sx, sy);
    if (!isFinite(fitScale) || fitScale <= 0) fitScale = 1;
  }

  // Allow initial fit scale value as minimum scale limit
  const minScale = Math.min(0.3, fitScale || 1);
  const maxScale = 5;

  // Apply zoom behavior to SVG, initial transform centered
  const initialScale = Math.max(minScale, Math.min(maxScale, fitScale || 1));
  const initialTransform = d3.zoomIdentity
    .translate(width / 2, height / 2)
    .scale(initialScale);

  // Store transform reference for keyboard shortcuts
  transformRef.current = initialTransform;

  // Apply initial transform without enabling zoom behavior
  mainGroup.attr("transform", initialTransform);
  setScale(initialTransform.k);
  setTranslate({ x: initialTransform.x, y: initialTransform.y });

  // Make SVG focusable for keyboard events
  svg.attr("tabindex", 0).style("outline", "none");

  // Focus SVG when clicked to ensure keyboard events work
  svg.on("click", () => {
    svg.node().focus();
  });
}

/**
 * CircularSequenceRenderer Component - a circular, plasmid-like view of biological sequences
 * @param {Object} props
 * @param {Object} props.data - the sequence object
 * @param {number} props.width - width of container
 * @param {number} props.height - height of container
 * @param {Function} [props.onFeatureClick] - handle user interactions
 * @param {Object|null} props.selection - Current selection: { type: 'circular', data: {...} } or null
 * @param {boolean} props.isSelecting - Whether currently selecting
 * @param {Function} props.onSelectionStart - Callback when selection starts: (type) => void
 * @param {Function} props.onSelectionUpdate - Callback when selection updates: (type, data) => void
 * @param {Function} props.onSelectionEnd - Callback when selection ends: (type, data) => void
 */
const CircularSequenceRenderer = ({
  data,
  width,
  height,
  onFeatureClick,
  hideInlineMeta,
}) => {
  const svgRef = useRef(null);
  const [, setScale] = useState(1);
  const [, setTranslate] = useState({ x: 0, y: 0 });
  const { sequenceViewer } = CONFIG;

  // Use refs to maintain stable references for keyboard shortcuts
  const currentTransformRef = useRef(null);

  // Define keyboard handler outside useEffect to maintain stability
  const handleKeyDown = useCallback((event) => {
    // Get mainGroup reference
    const mainGroup = d3.select(svgRef.current).select("g");
    console.log("Key pressed:", event.key);

    // Prevent default behavior for our custom keys
    if (
      [
        "+",
        "-",
        "=",
        "_",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ].includes(event.key)
    ) {
      event.preventDefault();
    }

    // Handle zoom with + and - keys
    if (event.key === "+" || event.key === "=") {
      // Zoom in
      if (currentTransformRef.current) {
        const newScale = Math.min(currentTransformRef.current.k * 1.2, 5);
        const newTransform = d3.zoomIdentity
          .translate(
            currentTransformRef.current.x,
            currentTransformRef.current.y
          )
          .scale(newScale);
        // Apply transform directly without zoom behavior
        mainGroup.attr("transform", newTransform);
        setScale(newTransform.k);
        setTranslate({ x: newTransform.x, y: newTransform.y });
        currentTransformRef.current = newTransform;
      }
    } else if (event.key === "-" || event.key === "_") {
      // Zoom out
      if (currentTransformRef.current) {
        const newScale = Math.max(currentTransformRef.current.k / 1.2, 0.3);
        const newTransform = d3.zoomIdentity
          .translate(
            currentTransformRef.current.x,
            currentTransformRef.current.y
          )
          .scale(newScale);
        // Apply transform directly without zoom behavior
        mainGroup.attr("transform", newTransform);
        setScale(newTransform.k);
        setTranslate({ x: newTransform.x, y: newTransform.y });
        currentTransformRef.current = newTransform;
      }
    }

    // Handle pan with arrow keys
    if (currentTransformRef.current) {
      const panStep = 50; // pixels to pan per key press
      let newX = currentTransformRef.current.x;
      let newY = currentTransformRef.current.y;

      switch (event.key) {
        case "ArrowUp":
          newY -= panStep; // Move upwards; reducing Y
          break;
        case "ArrowDown":
          newY += panStep; // Move downwards; increasing Y
          break;
        case "ArrowLeft":
          newX -= panStep; // Move left, reducing X
          break;
        case "ArrowRight":
          newX += panStep; // Move right, increase X
          break;
        default:
          return; // No action needed
      }

      const newTransform = d3.zoomIdentity
        .translate(newX, newY)
        .scale(currentTransformRef.current.k);
      // Apply transform directly without zoom behavior
      mainGroup.attr("transform", newTransform);
      setScale(newTransform.k);
      setTranslate({ x: newTransform.x, y: newTransform.y });
      currentTransformRef.current = newTransform;
    }
  }, []);

  // Add keyboard event listener on mount
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    if (!svgRef.current || !data) {
      console.log("CircularSequenceRenderer: 跳过渲染 - svgRef或data为空");
      return;
    }

    // Get total length of the sequence
    const totalLength = data.locus ? data.locus.sequenceLength : 0;

    // Setup SVG and scales
    const { svg, mainGroup, innerRadius, angleScale } = setupSVGAndScales(
      svgRef,
      width,
      height,
      totalLength
    );

    // Render metadata if not hidden
    if (!hideInlineMeta) {
      renderMetadata(mainGroup, data, innerRadius);
    }

    let maxRadius = innerRadius; // Initiate the basic radius

    // Render restriction sites
    renderRestrictionSites(mainGroup, data.res_site, angleScale, innerRadius);

    // Process and render features
    const featuresMaxRadius = renderFeatures(
      mainGroup,
      data.features,
      angleScale,
      innerRadius,
      onFeatureClick
    );
    maxRadius = Math.max(maxRadius, featuresMaxRadius);

    // Render ticks
    renderTicks(mainGroup, totalLength, angleScale, innerRadius);

    // Setup zoom
    setupZoom(
      svg,
      mainGroup,
      width,
      height,
      maxRadius,
      currentTransformRef,
      setScale,
      setTranslate
    );

    // 清理函数：移除事件监听器
    return () => {
      // Event listeners are now handled in separate useEffect
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, width, height, onFeatureClick, hideInlineMeta]);

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
