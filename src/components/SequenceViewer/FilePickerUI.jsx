/**
 * @file FilePickerUI.jsx
 * @description File picker UI when no genome data is loaded.
 * Single responsibility: render prompt and file input for GenBank files.
 */

import React, { useRef } from "react";

/**
 * @param {Object} props
 * @param {React.RefObject} [props.containerRef] - Ref for the wrapper div (for layout measurement)
 * @param {Function} props.onFileChosen - (file: File) => void
 * @param {Object} [props.style] - Container style overrides
 */
export default function FilePickerUI({
  containerRef,
  onFileChosen,
  style = {},
}) {
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onFileChosen(file);
  };

  return (
    <div
      ref={containerRef}
      className="sv-sequence-container sv-file-picker"
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ color: "#999", fontSize: 16, marginBottom: 8 }}>
        Load a GenBank file to view
      </div>
      <div style={{ color: "#666", fontSize: 12, marginBottom: 8 }}>
        Supported formats: .gb, .gbk, .genbank, .txt
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".gb,.gbk,.genbank,.txt"
        onChange={handleChange}
        style={{ display: "none" }}
        aria-label="Choose GenBank file"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        style={{
          padding: "12px 24px",
          fontSize: "14px",
          fontFamily: "inherit",
          color: "white",
          backgroundColor: "#4caf50",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          transition: "background-color 0.3s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#45a049";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "#4caf50";
        }}
      >
        Choose File
      </button>
    </div>
  );
}
