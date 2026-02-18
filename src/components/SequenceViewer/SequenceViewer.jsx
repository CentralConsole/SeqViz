/**
 * @file SequenceViewer.jsx
 * @description Reusable component for visualizing DNA/RNA sequences.
 * Composes: data (useGenomeData), layout (useContainerDimensions), file picker (FilePickerUI),
 * view mode toggle, metadata panel, and linear/circular/detailed renderers.
 */

import React, { useEffect, useState } from "react";
import LinearSequenceRenderer from "./LinearSequenceRenderer";
import CircularSequenceRenderer from "./CircularSequenceRenderer.jsx";
import DetailedSequenceViewer from "./DetailedSequenceRenderer.jsx";
import ViewModeToggle from "./ViewModeToggle";
import MetadataPanel from "./MetadataPanel.jsx";
import FilePickerUI from "./FilePickerUI.jsx";
import { useGenomeData } from "./useGenomeData";
import { useContainerDimensions } from "./useContainerDimensions";
import "./SequenceViewer.css";

/**
 * @param {Object} props
 * @param {Object} [props.data] - Sequence data object (recommended)
 * @param {Function} [props.loadData] - Lazy load: () => Promise<string|Object>
 * @param {Object} [props.style] - Container styles
 * @param {Function} [props.onFeatureClick] - Feature click handler
 * @param {string} [props.viewMode="linear"] - "linear" | "circular" | "detailed"
 */
const SequenceViewerInner = ({
  data,
  loadData,
  style = {},
  onFeatureClick,
  viewMode: initialViewMode = "linear",
}) => {
  const { containerRef, dimensions, updateDimensions } =
    useContainerDimensions();
  const { genomeData, loading, error, loadFromFile } = useGenomeData({
    data,
    loadData,
  });

  const [viewMode, setViewMode] = useState(initialViewMode);
  const [showMeta, setShowMeta] = useState(false);

  // Re-measure after data loads so renderers get correct size
  useEffect(() => {
    if (!genomeData) return;
    const t = setTimeout(updateDimensions, 100);
    return () => clearTimeout(t);
  }, [genomeData, updateDimensions]);

  const handleViewModeChange = (mode) => setViewMode(mode);
  const toggleMeta = () => setShowMeta((v) => !v);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === "i" || event.key === "I") {
        event.preventDefault();
        setShowMeta((v) => !v);
      }
    };
    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, []);

  if (loading) {
    return <div className="sv-sequence-container">Loading...</div>;
  }

  if (error) {
    return (
      <div className="sv-sequence-container">
        Error loading data: {error.message}
      </div>
    );
  }

  if (!genomeData) {
    return (
      <FilePickerUI
        containerRef={containerRef}
        onFileChosen={loadFromFile}
        style={style}
      />
    );
  }

  if (dimensions.width <= 0 || dimensions.height <= 0) {
    return <div className="sv-sequence-container">Loading...</div>;
  }

  return (
    <div
      ref={containerRef}
      className="sv-sequence-container"
      style={style}
    >
      <ViewModeToggle
        currentView={viewMode}
        onViewChange={handleViewModeChange}
      />
      <button
        type="button"
        className={`sv-info-button ${showMeta ? "active" : ""}`}
        title="Toggle Info (Press 'i')"
        onClick={toggleMeta}
        aria-label="Toggle info panel"
      >
        &#xf449;
      </button>
      {showMeta && <MetadataPanel data={genomeData} />}
      {viewMode === "linear" && (
        <LinearSequenceRenderer
          data={genomeData}
          width={dimensions.width}
          height={dimensions.height}
          onFeatureClick={onFeatureClick}
          hideInlineMeta={true}
        />
      )}
      {viewMode === "circular" && (
        <CircularSequenceRenderer
          data={genomeData}
          width={dimensions.width}
          height={dimensions.height}
          onFeatureClick={onFeatureClick}
          hideInlineMeta={true}
        />
      )}
      {viewMode === "detailed" && (
        <DetailedSequenceViewer
          data={genomeData}
          width={dimensions.width}
          height={dimensions.height}
          onFeatureClick={onFeatureClick}
          hideInlineMeta={true}
        />
      )}
    </div>
  );
};

const SequenceViewer = (props) => <SequenceViewerInner {...props} />;

export default SequenceViewer;
