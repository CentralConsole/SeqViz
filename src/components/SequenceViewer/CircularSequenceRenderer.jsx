import React, { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { CONFIG } from "../../config/config";

/**
 * CircularSequenceRenderer Component - a circular, plasmid-like view of biological sequences
 * @param {Object} props
 * @param {Object} props.data - the sequence object
 * @param {number} props.width - width of container
 * @param {number} props.height - height of container
 * @param {Function} [props.onFeatureClick] - handle user interactions
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
          newY -= panStep; // 向上移动，减少Y值
          break;
        case "ArrowDown":
          newY += panStep; // 向下移动，增加Y值
          break;
        case "ArrowLeft":
          newX -= panStep; // 向左移动，减少X值
          break;
        case "ArrowRight":
          newX += panStep; // 向右移动，增加X值
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
    console.log("CircularSequenceRenderer useEffect triggered", {
      hasData: !!data,
      hasSvgRef: !!svgRef.current,
      dataKeys: data ? Object.keys(data) : null,
      width,
      height,
    });
    if (!svgRef.current || !data) {
      console.log("CircularSequenceRenderer: 跳过渲染 - svgRef或data为空");
      return;
    }

    // # Part 2: setup the svg and the scale

    // clear any object in the svg
    d3.select(svgRef.current).selectAll("*").remove();

    // create svg
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%")
      .style("height", "100%");

    // create main group
    const mainGroup = svg.append("g");

    // get total length of the sequence
    const totalLength = data.locus ? data.locus.sequenceLength : 0;

    // Calculate the inner radius (that is, the radius of the "scale circle")
    const radius = Math.min(width, height) * 0.35; // basic radius
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

    // # Part 3: displaying the meta info
    if (!hideInlineMeta) {
      // create the meta info group (to be placed in the center of the circle)
      const metaInfoGroup = mainGroup.append("g").attr("class", "meta-info");

      // the meta data should be displayed at the center of the inner circle
      const inscribedSquareSize = innerRadius * Math.sqrt(2) * 0.8; // 80% for safety
      const maxTextWidth = inscribedSquareSize;

      // handling multiple lines for meta data title (Some titles are very long)
      const wrapText = (text, maxWidth, fontSize, maxLines = 3) => {
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
          lines[maxLines - 1] =
            lastLine.substring(0, lastLine.length - 3) + "...";
        }

        return lines;
      };

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
      const otherElementsStartY =
        titleStartY + titleLines.length * lineHeight + 10;

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
        .text(
          `Length: ${data.locus?.sequenceLength?.toLocaleString() || 0} bp`
        );

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

    let maxRadius = innerRadius; // initiate the basic radius

    // # Part 4: display features
    if (data.features && Array.isArray(data.features)) {
      const featureGroup = mainGroup.append("g").attr("class", "features");

      // handling feature data, getting their positions
      const processedFeatures = data.features
        .map((feature) => {
          // check if it should be displayed (according to the config)
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

          // for a feature that has more than 1 segments: handling all segments
          const processedSegments = [];
          let firstSegmentMidAngle = null; // middle angle of the first segment

          feature.location.forEach((loc, locIndex) => {
            // validate the position of each segment
            if (!Array.isArray(loc) || loc.length < 2) {
              console.warn("Invalid location array:", loc);
              return;
            }
            // Start and stop positions of each segment
            const start = parseInt(loc[0], 10);
            const stop = parseInt(loc[loc.length - 1], 10);
            if (isNaN(start) || isNaN(stop)) {
              console.warn("Invalid start/stop values:", { start, stop });
              return;
            }

            // convert position to angle
            const startAngle = angleScale(start);
            const stopAngle = angleScale(stop);

            // get direction (the second value of location list in json)
            const isReverse = loc.length > 1 ? loc[1] : false;

            // add processed segments
            processedSegments.push({
              start,
              stop,
              isFirst: locIndex === 0,
              isTextSegment: locIndex === 0,
              isReverse,
            });

            // calculate the middle angle of the fist segment
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

      //console.log("Processed Features:", processedFeatures);

      // calculate the overlaps between diffetent layers of features, and adjust their radial-direction positioning
      const layerSpacing = CONFIG.dimensions.vSpace; // layer spacing, from CONFIG

      // sort the features by their length, in a descending order, prioritizing longer features
      processedFeatures.sort((a, b) => b.totalLength - a.totalLength);

      // calculating the radial-direction position (the layer) of each feature
      for (let i = 0; i < processedFeatures.length; i++) {
        const current = processedFeatures[i];
        let layer = 0; // try the most inner layer
        let hasOverlap = true;

        // try, until no overlap with rendered features
        while (hasOverlap) {
          hasOverlap = false;
          // check overlapping
          for (let j = 0; j < i; j++) {
            const prev = processedFeatures[j];
            if (prev.radialOffset === layer) {
              // check overlapping using angle range
              const currentRange = current.angleRange;
              const prevRange = prev.angleRange;

              const hasAngleOverlap =
                // overlap check of normal conditions
                (!currentRange.hasCrossZero &&
                  !prevRange.hasCrossZero &&
                  currentRange.min <= prevRange.max &&
                  currentRange.max >= prevRange.min) ||
                // handle cross-zero conditions (1): current feature crossing 0, && the previous feature not crossing 0
                (currentRange.hasCrossZero &&
                  !prevRange.hasCrossZero &&
                  (currentRange.min <= prevRange.max ||
                    currentRange.max >= prevRange.min)) ||
                // handle cross-zero conditions (2): the previous feature crossing 0, && the current feature not crossing 0
                (!currentRange.hasCrossZero &&
                  prevRange.hasCrossZero &&
                  (prevRange.min <= currentRange.max ||
                    prevRange.max >= currentRange.min)) ||
                // handle cross-zero conditions (3): the previous feature crossing 0, && the current feature crossing 0
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
        // set radial offset of current feature
        current.radialOffset = layer;
      }

      // Dynamically calculate the radius of each layer
      const layerRadii = new Map();

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
          // add spacing between layers
          const prevOuter = layerRadii.get(layer - 1).outer;
          layerRadii.set(layer, {
            inner: prevOuter + 8, // 8 pixels only
            outer: prevOuter + 24, // 16 pixels only
          });
        }
      }

      // create arc generator for drawing each segment
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

      // grouping features according to their layers
      const featuresByLayer = new Map();
      processedFeatures.forEach((feature) => {
        const layer = feature.radialOffset;
        if (!featuresByLayer.has(layer)) {
          featuresByLayer.set(layer, []);
        }
        featuresByLayer.get(layer).push(feature);
      });

      let currentLayerMaxRadius = innerRadius + 24; // initialize radius

      for (let layer = 0; layer <= maxLayer; layer++) {
        const layerFeatures = featuresByLayer.get(layer) || [];

        // update radius of the current layer based on the previous (inner) layer
        if (layer > 0) {
          layerRadii.set(layer, {
            inner: currentLayerMaxRadius + 8,
            outer: currentLayerMaxRadius + 24,
          });
        }

        // create a group for current layer
        const layerGroup = featureGroup
          .append("g")
          .attr("class", `layer-${layer}`);

        // render features of current layer
        const featureElements = layerGroup
          .selectAll("g.feature")
          .data(layerFeatures)
          .enter()
          .append("g")
          .attr("class", "feature");

        // draw arcs of each segment of a feature
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

              // calculate length of arc (and arrow)
              const arcLength =
                ((stopAngle - startAngle) * (innerR + outerR)) / 2;
              const maxArrowHeight = arcLength / 3;
              const baseArrowLength = (outerR - innerR) * 1.0;
              const arrowLength = Math.min(baseArrowLength, maxArrowHeight);

              const midRadius = (innerR + outerR) / 2;
              const arrowAngleOffset = arrowLength / midRadius;

              // shorten arc length
              if (segment.isReverse) {
                startAngle += arrowAngleOffset;
              } else {
                stopAngle -= arrowAngleOffset;
              }
            }

            // create a segment
            const segmentD = segmentArc({
              startAngle,
              endAngle: stopAngle,
              radialOffset: d.radialOffset,
            });

            //draw arcs
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
                // highlight feature arc and text upon mouse moving
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

                featureElement
                  .selectAll("text")
                  .style("font-weight", CONFIG.interaction.hover.fontWeight)
                  .style("fill", CONFIG.styles.annotation.fillDark)
                  .style("text-shadow", CONFIG.interaction.hover.textShadow);

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
                // reset feature arc and text styles upon mouseout
                featureElement
                  .selectAll("path")
                  .attr(
                    "stroke",
                    (CONFIG.featureType[d.type] || CONFIG.featureType.others)
                      .stroke
                  )
                  .attr("stroke-width", CONFIG.styles.box.strokeWidth);

                featureElement
                  .selectAll("text")
                  .style("font-weight", CONFIG.interaction.normal.fontWeight)
                  .style("fill", CONFIG.styles.annotation.fillDark)
                  .style("text-shadow", CONFIG.interaction.normal.textShadow);

                featureElement
                  .selectAll(".text-bg")
                  .style("fill", CONFIG.interaction.normal.textBackground.fill)
                  .style(
                    "stroke",
                    CONFIG.interaction.normal.textBackground.stroke
                  );
              })
              .each(function () {
                // create textPath for each segment inbetween inner and outer radius
                if (segment.isTextSegment) {
                  const textContent =
                    d.information?.gene || d.information?.product || d.type;
                  const estimatedTextLength =
                    textContent.length *
                    CONFIG.styles.annotation.fontSize *
                    0.6;

                  // get inner and outer radius
                  const currentLayerRadii = layerRadii.get(d.radialOffset);
                  const innerR = currentLayerRadii?.inner;
                  const outerR = currentLayerRadii?.outer;
                  const textRadiusOffset = 5;

                  // get middle radius
                  const textPathRadius =
                    (innerR + outerR) / 2 - textRadiusOffset;

                  // text path arc generator (an arc include two ends and two arcs)
                  const textPathArc = d3
                    .arc()
                    .innerRadius(textPathRadius)
                    .outerRadius(textPathRadius + 1) // we want a thin arc so that we can extract an arc from the arc
                    .startAngle(startAngle)
                    .endAngle(stopAngle);

                  // generate text path
                  const textPathD = textPathArc();

                  // extract path using regular expression
                  const firstArcSection = /(^.+?)L/;
                  const arcMatch = firstArcSection.exec(textPathD)?.[1];

                  if (arcMatch) {
                    let cleanArc = arcMatch.replace(/,/g, " ");

                    // estimate path legnth to judge if it is suitable for displaying text
                    const approximatePathLength =
                      (stopAngle - startAngle) * textPathRadius;

                    if (estimatedTextLength < approximatePathLength * 0.9) {
                      // suitable text length
                      // handle path reverting logics
                      let finalPath = cleanArc;

                      // calculate the mid angle position to judge if the path direction should be reverted
                      // so that our texts are upright
                      const segmentMidAngle = (startAngle + stopAngle) / 2;

                      // if the mid angle is located within range from Pi/2 to 3Pi/2
                      const normalizedMidAngle =
                        segmentMidAngle % (2 * Math.PI);
                      const isInBottomHalf =
                        normalizedMidAngle > Math.PI / 2 &&
                        normalizedMidAngle < (3 * Math.PI) / 2;

                      if (isInBottomHalf) {
                        // revert (flip) the direction of the text path
                        const startLoc = /M(.*?)A/;
                        const middleLoc = /A(.*?)0 0 1/;
                        const endLoc = /0 0 1 (.*?)$/;

                        const startMatch = startLoc.exec(finalPath);
                        const middleMatch = middleLoc.exec(finalPath);
                        const endMatch = endLoc.exec(finalPath);

                        if (startMatch && middleMatch && endMatch) {
                          // flipping starting point and ending point, and reset sweep-flag from 1 to 0
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

                      // create invisible textPath arc
                      featureElement
                        .append("path")
                        .attr(
                          "id",
                          `text-path-${layer}-${featureIndex}-${segmentIndex}`
                        )
                        .attr("d", finalPath)
                        .attr("fill", "none")
                        .attr("stroke", "none")
                        .style("opacity", 0); // completely transparent
                    }
                  }
                }
              })
              .each(function () {
                // check `shape` attribute of feature
                // only draw arrow for those features whose `shape` is `arrow`
                const typeConfig =
                  CONFIG.featureType[d.type] || CONFIG.featureType.others;
                if (typeConfig.shape !== "arrow") {
                  return;
                }

                // generate arrowed arc
                // directly handle svg string
                const pathElement = d3.select(this);
                const pathNode = pathElement.node();
                if (pathNode) {
                  const svgString = pathNode.outerHTML;

                  // get path string
                  const dAttributeMatch = svgString.match(/d="([^"]+)"/);
                  if (dAttributeMatch) {
                    const pathData = dAttributeMatch[1];

                    // match all arc lines
                    const looseArcMatches = [
                      ...pathData.matchAll(/A[^A]*?(?=A|L|Z|$)/g),
                    ];

                    let outerArc = null;
                    let innerArc = null;

                    if (looseArcMatches.length > 0) {
                      // parse arc command
                      const parseArcCommand = (arcString) => {
                        // remove 'A' at the biginning
                        // and wash the string
                        const paramString = arcString
                          .replace(/^A\s*/, "")
                          .trim();

                        // extract numbers
                        const numbers = paramString.match(
                          /([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/g
                        );

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

                      // outer arc
                      outerArc = parseArcCommand(looseArcMatches[0][0]);

                      // inner arc
                      if (looseArcMatches.length >= 2) {
                        innerArc = parseArcCommand(looseArcMatches[1][0]);
                      }
                    }

                    // straight lines at both ends
                    const lineMatches = [
                      ...pathData.matchAll(/L\s*([-\d.]+)[,\s]+([-\d.]+)/g),
                    ];

                    if (lineMatches.length >= 2) {
                      // Line segments are available but not used in current implementation
                      // startLineSegment and endLineSegment could be used for future enhancements
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

    // Zoom behavior is completely disabled - only programmatic transforms are used

    // 应用缩放行为到SVG，初始变换为居中位置
    const initialScale = Math.max(minScale, Math.min(maxScale, fitScale || 1));
    const initialTransform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(initialScale);

    // Store transform reference for keyboard shortcuts
    currentTransformRef.current = initialTransform;

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

    // 右键拖拽扇形选择（圆轴外部）
    const selectionOverlayGroup = mainGroup
      .append("g")
      .attr("class", "selection-overlay")
      .style("pointer-events", "none");

    let isRightSelecting = false; // Whether the right click is selected
    let startAngle = null;
    let selectionPath = null;
    let startLine = null;
    let endLine = null;
    let selectionDirection = null; // +1 顺时针, -1 逆时针
    let lastCurrentAngle = null; // 记录上一次的当前角度，用于检测拖拽方向变化

    // Disable default right-click menu
    svg.on("contextmenu.selection", (event) => {
      event.preventDefault();
    });

    const getLocalPointer = (event) => {
      // 获取相对于mainGroup的坐标，考虑当前的变换
      const [px, py] = d3.pointer(event, mainGroup.node());
      return [px, py]; // 相对于mainGroup中心(0,0)
    };

    const toAngle = (x, y) => {
      // 计算角度，与angleScale保持一致
      let ang = Math.atan2(y, x);
      // 归一化到 [0, 2π)
      if (ang < 0) ang += Math.PI * 2;
      // 调整角度以匹配angleScale的起始位置（从顶部开始，顺时针）
      ang = (ang + Math.PI / 2) % (Math.PI * 2);
      return ang;
    };

    const normalizeAngle = (ang) =>
      ((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    svg.on("mousedown.selection", (event) => {
      if (event.button !== 2) return; // Only right click
      const [lx, ly] = getLocalPointer(event);
      const r = Math.hypot(lx, ly);
      if (r <= innerRadius) return; // Selection must be outside the inner radius

      isRightSelecting = true;
      startAngle = toAngle(lx, ly);
      selectionDirection = null;
      lastCurrentAngle = null;

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
      if (r <= innerRadius) return; // Selection must be outside the inner radius
      const currentAngle = toAngle(lx, ly);

      const a0 = startAngle;
      const a1 = currentAngle;

      // 计算当前方向的弧段长度
      const forward = (a1 - a0 + Math.PI * 2) % (Math.PI * 2);
      const backward = (a0 - a1 + Math.PI * 2) % (Math.PI * 2);

      // 首次移动时确定选取方向
      if (selectionDirection === null) {
        selectionDirection = forward <= backward ? 1 : -1; // 1 表示顺时针
        lastCurrentAngle = a1; // 初始化上次角度
      } else {
        // 检测用户是否真正改变了拖拽方向（基于连续的角度变化）
        if (lastCurrentAngle !== null) {
          const currentDelta = selectionDirection === 1 ? forward : backward;

          // 计算角度变化方向
          const angleChange = normalizeAngle(a1 - lastCurrentAngle);
          const isMovingClockwise = angleChange < Math.PI; // 小于π表示顺时针
          const expectedDirection = selectionDirection === 1;

          // 只有当选择已经超过180度，且用户明确反向拖拽时才切换方向
          // 同时要求反方向弧段确实更小，避免在接近360度时的误判
          const oppositeDelta = selectionDirection === 1 ? backward : forward;
          if (
            currentDelta > Math.PI && // 当前选择已超过180度
            isMovingClockwise !== expectedDirection && // 用户在反向拖拽
            oppositeDelta < currentDelta * 0.3
          ) {
            // 反方向弧段明显更小
            selectionDirection = -selectionDirection; // 切换方向
          }
        }

        // 更新上次角度记录
        lastCurrentAngle = a1;
      }

      // 根据确定的方向计算弧段（允许大于180度）
      let startForArc, delta;
      if (selectionDirection === 1) {
        // 顺时针方向
        delta = forward;
        startForArc = a0;
      } else {
        // 逆时针方向
        delta = backward;
        startForArc = a1;
      }

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

      // 完全重置选择状态
      isRightSelecting = false;
      selectionDirection = null;
      lastCurrentAngle = null;
      startAngle = null;

      // 清理选择相关的DOM元素
      if (selectionPath) {
        selectionPath.remove();
        selectionPath = null;
      }
      if (startLine) {
        startLine.remove();
        startLine = null;
      }
      if (endLine) {
        endLine.remove();
        endLine = null;
      }
    };

    svg.on("mouseup.selection", endRightSelection);
    svg.on("mouseleave.selection", endRightSelection);

    // 清理函数：移除事件监听器
    return () => {
      // Event listeners are now handled in separate useEffect
    };
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
