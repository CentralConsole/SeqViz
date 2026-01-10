/**
 * @file SequenceViewer.jsx
 * @description A reusable component for visualizing DNA/RNA sequences
 * Functionality:
 * 1. Load GenBank data from file or API
 * 2. Parse GenBank data and annotate restriction sites
 * 3. Render sequence data in linear, circular, or detailed view
 * 4. Provide metadata panel for viewing sequence information
 * 5. Provide view mode toggle for switching between linear, circular, and detailed view
 */

import React, { useEffect, useState, useRef } from "react";
import LinearSequenceRenderer from "./LinearSequenceRenderer";
import CircularSequenceRenderer from "./CircularSequenceRenderer.jsx";
import DetailedSequenceViewer from "./DetailedSequenceRenderer.jsx";
import ViewModeToggle from "./ViewModeToggle";
import MetadataPanel from "./MetadataPanel.jsx";
import { parseGenbankText } from "../ParseAndPreparation/parse-genbank-input/browser-genbank-parser";
import { annotateRestrictionSites } from "../ParseAndPreparation/restriction-sites.browser";
import "./SequenceViewer.css";

/**
 * GenBank data processor component
 * Responsible for parsing GenBank text into JSON format and annotating restriction sites
 * @param {string} gbkText - GenBank text in GenBank format
 * @returns {Object} Data object in mito2.json format
 */
function processGenBankData(gbkText) {
  if (!gbkText || typeof gbkText !== "string") {
    throw new Error("Invalid GenBank text input");
  }

  // Parse GenBank text
  const parsed = parseGenbankText(gbkText);

  // Build data object in standard json format
  const normalized = {
    locus: parsed.locus || {},
    definition: parsed.definition || "",
    accession: parsed.accession || "",
    version: parsed.version || "",
    dblink: parsed.dblink || "",
    keywords: parsed.keywords || "",
    source: parsed.source || "",
    reference: parsed.reference || "",
    comment: parsed.comment || "",
    features: parsed.features || [],
    origin: parsed.origin || "",
    res_site: parsed.res_site || [],
  };

  // Use restriction-sites.browser.js to annotate restriction sites
  try {
    if (
      normalized.origin &&
      (!normalized.res_site || normalized.res_site.length === 0)
    ) {
      const topology = (normalized.locus?.topology || "").toLowerCase();
      const isCircular = topology.includes("circular");
      const sites = annotateRestrictionSites(normalized.origin, {
        topology: isCircular ? "circular" : "linear",
      });
      normalized.res_site = sites;
    }
  } catch (e) {
    // If annotation fails, use empty array
    console.warn("Failed to annotate restriction sites:", e);
    normalized.res_site = normalized.res_site || [];
  }

  return normalized;
}

/**
 * SequenceViewer component - a reusable component for visualizing DNA/RNA sequences
 * @param {Object} props
 * @param {Object} props.data - Sequence data object (recommended)
 * @param {Function} [props.loadData] - Lazy load data function, returns Promise<string> (GBK text) or Promise<Object> (parsed JSON)
 * @param {Object} [props.style] - Optional container styles
 * @param {Function} [props.onFeatureClick] - Feature click event handler
 * @param {string} [props.viewMode="linear"] - View mode: "linear", "circular" or "detailed"
 */
// Internal component, managing selection state
const SequenceViewerInner = ({
  data,
  loadData,
  style = {},
  onFeatureClick,
  viewMode: initialViewMode = "linear",
}) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [genomeData, setGenomeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [showMeta, setShowMeta] = useState(false);

  // Function to update dimensions
  const updateDimensions = () => {
    if (containerRef.current) {
      // Use clientWidth and clientHeight
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      console.log("SequenceViewer: Updating dimensions", {
        width,
        height,
        clientWidth: containerRef.current.clientWidth,
        clientHeight: containerRef.current.clientHeight,
        offsetWidth: containerRef.current.offsetWidth,
        offsetHeight: containerRef.current.offsetHeight,
        getBoundingClientRect: containerRef.current.getBoundingClientRect(),
      });
      setDimensions({ width, height });
    }
  };

  useEffect(() => {
    updateDimensions();

    window.addEventListener("resize", updateDimensions);

    return () => {
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (data) {
          console.log("SequenceViewer: Using passed data", data);
          setGenomeData(data);
          return;
        }
        if (typeof loadData === "function") {
          console.log("SequenceViewer: Starting data loading...");
          setLoading(true);
          const result = await loadData();
          if (!cancelled) {
            console.log("SequenceViewer: Data loading completed", result);

            // Check if the returned data is GBK text or an already parsed JSON object
            let processedData;
            if (typeof result === "string") {
              // If it's a string, treat it as GBK text
              console.log(
                "SequenceViewer: Detected GBK text, starting parsing..."
              );
              processedData = processGenBankData(result);
            } else if (result && typeof result === "object") {
              // If it's already an object, use it directly
              processedData = result;
            } else {
              throw new Error("Invalid data format from loadData");
            }

            setGenomeData(processedData || null);
            setLoading(false);
            // After data loading, force update dimensions to ensure renderer can render correctly
            setTimeout(() => {
              updateDimensions();
            }, 100);
          }
          return;
        }
        setGenomeData(null);
      } catch (e) {
        if (!cancelled) {
          console.error("SequenceViewer: Data loading failed", e);
          setError(e);
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, loadData]);

  // Local file reader for GenBank input
  const handleFileChosen = async (file) => {
    if (!file) return;
    try {
      setLoading(true);
      setError(null);
      const text = await file.text();
      // Use unified processing function
      const processedData = processGenBankData(text);
      setGenomeData(processedData);
      setLoading(false);
      // ensure layout after data load
      setTimeout(() => updateDimensions(), 50);
    } catch (e) {
      console.error("SequenceViewer: GenBank parse error", e);
      setError(e);
      setLoading(false);
    }
  };

  // Handle view mode change
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  const toggleMeta = () => setShowMeta((v) => !v);

  // Add keyboard shortcut listener
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === "i" || event.key === "I") {
        event.preventDefault();
        toggleMeta();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading data: {error.message}</div>;
  }

  if (!genomeData) {
    return (
      <div
        ref={containerRef}
        className="sv-sequence-container"
        style={{
          ...style,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ color: "#666", fontSize: 14 }}>
          Load a GenBank file (.gb/.gbk) to view
        </div>
        <input
          type="file"
          accept=".gb,.gbk,.genbank,.txt"
          onChange={(e) => handleFileChosen(e.target.files?.[0])}
          style={{ cursor: "pointer" }}
        />
      </div>
    );
  }

  // Ensure valid dimensions before rendering
  if (dimensions.width <= 0 || dimensions.height <= 0) {
    console.log("SequenceViewer: Waiting for valid dimensions", {
      dimensions,
      hasContainerRef: !!containerRef.current,
      containerRect: containerRef.current
        ? containerRef.current.getBoundingClientRect()
        : null,
    });
    return <div>Loading...</div>;
  }

  return (
    <div
      ref={containerRef}
      className="sv-sequence-container"
      style={{
        ...style,
      }}
    >
      <ViewModeToggle
        currentView={viewMode}
        onViewChange={handleViewModeChange}
      />
      {/* Info button */}
      <button
        className={`sv-info-button ${showMeta ? "active" : ""}`}
        title="Toggle Info (Press 'i')"
        onClick={toggleMeta}
      >
        &#xf449;
      </button>
      {showMeta && <MetadataPanel data={genomeData} />}
      {viewMode === "linear" ? (
        <LinearSequenceRenderer
          data={genomeData}
          width={dimensions.width}
          height={dimensions.height}
          onFeatureClick={onFeatureClick}
          hideInlineMeta={true}
        />
      ) : viewMode === "circular" ? (
        <CircularSequenceRenderer
          data={genomeData}
          width={dimensions.width}
          height={dimensions.height}
          onFeatureClick={onFeatureClick}
          hideInlineMeta={true}
        />
      ) : (
        <DetailedSequenceViewer
          data={genomeData}
          width={dimensions.width}
          height={dimensions.height}
          onFeatureClick={onFeatureClick}
          hideInlineMeta={true}
        />
      )}
      {/* Debug information */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          background: "rgba(0,0,0,0.8)",
          color: "white",
          padding: "5px",
          fontSize: "12px",
          zIndex: 9999,
        }}
      >
        Dimensions: {dimensions.width} x {dimensions.height}
      </div>
    </div>
  );
};

// Outer component
const SequenceViewer = (props) => {
  return <SequenceViewerInner {...props} />;
};

export default SequenceViewer;
