import React from "react";
import { CONFIG } from "../../config/config";

/**
 * MetadataPanel - small-font, top overlay panel to show sequence metadata
 * Props:
 * - data: genome object
 */
const MetadataPanel = ({ data }) => {
  if (!data) return null;

  const lengthText = `${
    data.locus?.sequenceLength?.toLocaleString?.() || 0
  } bp`;
  const typeText = data.locus?.moleculeType || "";
  const divisionText = data.locus?.division || "";

  const containerStyle = {
    position: "absolute",
    top: 8,
    left: "50%",
    transform: "translateX(-50%)",
    maxWidth: "80%",
    padding: "6px 10px",
    borderRadius: 6,
    background: "rgba(0,0,0,0.5)",
    color: CONFIG.styles.axis.text.fill,
    backdropFilter: "blur(4px)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    zIndex: 20,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    pointerEvents: "auto",
  };

  const titleStyle = {
    fontFamily: CONFIG.fonts.primary.family,
    fontSize: 12,
    fontWeight: 700,
    margin: 0,
    padding: 0,
    textAlign: "center",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
  };

  const descStyle = {
    fontFamily: CONFIG.fonts.primary.family,
    fontSize: 11,
    margin: 0,
    padding: 0,
    opacity: 0.9,
    textAlign: "center",
    whiteSpace: "nowrap",
  };

  return (
    <div style={containerStyle}>
      <div style={titleStyle} title={data.definition || ""}>
        {data.definition || ""}
      </div>
      <div style={descStyle}>
        Length: {lengthText} | Type: {typeText} | Division: {divisionText}
      </div>
    </div>
  );
};

export default MetadataPanel;
