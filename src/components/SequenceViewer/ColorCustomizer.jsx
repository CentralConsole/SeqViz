/**
 * @file ColorCustomizer.jsx
 * @description Panel for customizing nucleotide and feature type colors.
 * Updates CONFIG in place and notifies parent to re-render.
 */

import React, { useState, useRef, useCallback } from "react";
import { CONFIG, applyTheme, DARK_THEME } from "../../config/config";
import { LIGHT_THEME } from "../../config/themes/light";
import "./ColorCustomizer.css";

/** Default nucleotide colors (detailed view) - snapshot for reset */
const DEFAULT_NUCLEOTIDES = {
  A: "#ff6b6b",
  T: "#4ecdc4",
  C: "#45b7d1",
  G: "#96ceb4",
  N: "#95a5a6",
  default: "#e0e0e0",
};

/**
 * One row: label + color input. Updates target object and calls onChange.
 */
function ColorRow({ label, color, onChange, title }) {
  const handleChange = (e) => {
    const v = e.target.value;
    onChange(v);
  };
  return (
    <div className="color-customizer-row" title={title || label}>
      <label className="color-customizer-label">{label}</label>
      <input
        type="color"
        value={color}
        onChange={handleChange}
        className="color-customizer-input"
        aria-label={label}
      />
      <input
        type="text"
        value={color}
        onChange={handleChange}
        className="color-customizer-hex"
        aria-label={`${label} hex`}
      />
    </div>
  );
}

/**
 * ColorCustomizer panel. Mutates CONFIG; calls onApply when colors change so parent can re-render.
 * @param {Object} props
 * @param {boolean} [props.open] - Whether panel is visible
 * @param {Function} [props.onApply] - Called after any color change (no args)
 */
const ColorCustomizer = ({ open = true, onApply }) => {
  const detailedConfig = CONFIG.detailedSequenceViewer || {};
  const nucleotideColors = detailedConfig.nucleotideColors || {};
  const featureType = CONFIG.featureType || {};
  const styles = CONFIG.styles || {};

  const [themeMode, setThemeMode] = useState(() => {
    const c = styles.background?.color;
    if (typeof c !== "string") return "dark";
    const normalized = c.replace(/\s/g, "").toLowerCase();
    if (normalized === "#f5f5f5" || normalized === "#ffffff" || normalized === "#fff") return "light";
    return "dark";
  });
  const [nucleotides, setNucleotides] = useState(() => ({
    ...DEFAULT_NUCLEOTIDES,
    ...nucleotideColors,
  }));
  const [featureTypes, setFeatureTypes] = useState(() => {
    const acc = {};
    Object.keys(featureType).forEach((key) => {
      const t = featureType[key];
      if (t && (t.fill != null || t.stroke != null)) {
        acc[key] = { fill: t.fill ?? "#999", stroke: t.stroke ?? "#666" };
      }
    });
    return acc;
  });

  const initialFeatureTypesRef = useRef(null);
  if (initialFeatureTypesRef.current == null) {
    const acc = {};
    Object.keys(featureType).forEach((key) => {
      const t = featureType[key];
      if (t && (t.fill != null || t.stroke != null)) {
        acc[key] = { fill: t.fill ?? "#999", stroke: t.stroke ?? "#666" };
      }
    });
    initialFeatureTypesRef.current = acc;
  }

  const applyThemeMode = useCallback(
    (mode) => {
      setThemeMode(mode);
      applyTheme(mode === "light" ? LIGHT_THEME : DARK_THEME);
      onApply?.();
    },
    [onApply]
  );

  const applyNucleotides = useCallback(
    (next) => {
      setNucleotides(next);
      if (!CONFIG.detailedSequenceViewer) CONFIG.detailedSequenceViewer = {};
      if (!CONFIG.detailedSequenceViewer.nucleotideColors) {
        CONFIG.detailedSequenceViewer.nucleotideColors = {};
      }
      Object.assign(CONFIG.detailedSequenceViewer.nucleotideColors, next);
      onApply?.();
    },
    [onApply]
  );

  const applyFeatureTypes = useCallback(
    (next) => {
      setFeatureTypes(next);
      Object.keys(next).forEach((key) => {
        const c = featureType[key];
        if (c) {
          if (next[key].fill != null) c.fill = next[key].fill;
          if (next[key].stroke != null) c.stroke = next[key].stroke;
        }
      });
      onApply?.();
    },
    [onApply, featureType]
  );

  const handleNucleotideChange = (key, value) => {
    const next = { ...nucleotides, [key]: value };
    applyNucleotides(next);
  };

  const handleFeatureTypeChange = (key, field, value) => {
    const prev = featureTypes[key] || { fill: "#999", stroke: "#666" };
    const next = {
      ...featureTypes,
      [key]: { ...prev, [field]: value },
    };
    applyFeatureTypes(next);
  };

  const handleResetNucleotides = () => {
    applyNucleotides({ ...DEFAULT_NUCLEOTIDES });
  };

  const handleResetFeatureTypes = () => {
    const initial = initialFeatureTypesRef.current || {};
    setFeatureTypes(initial);
    Object.keys(initial).forEach((key) => {
      const c = featureType[key];
      if (c) {
        c.fill = initial[key].fill;
        c.stroke = initial[key].stroke;
      }
    });
    onApply?.();
  };

  if (!open) return null;

  return (
    <div className="color-customizer-panel">
      <h3 className="color-customizer-title">Color customization</h3>

      <section className="color-customizer-section">
        <div className="color-customizer-section-header">
          <span>Background</span>
        </div>
        <div className="color-customizer-theme-buttons">
          <button
            type="button"
            className={`color-customizer-theme-btn ${themeMode === "dark" ? "active" : ""}`}
            onClick={() => applyThemeMode("dark")}
          >
            Dark mode
          </button>
          <button
            type="button"
            className={`color-customizer-theme-btn ${themeMode === "light" ? "active" : ""}`}
            onClick={() => applyThemeMode("light")}
          >
            Light mode
          </button>
        </div>
      </section>

      <section className="color-customizer-section">
        <div className="color-customizer-section-header">
          <span>Nucleotides (Detailed view)</span>
          <button type="button" className="color-customizer-reset" onClick={handleResetNucleotides}>
            Reset
          </button>
        </div>
        <div className="color-customizer-grid">
          {Object.keys(DEFAULT_NUCLEOTIDES).map((key) => (
            <ColorRow
              key={key}
              label={key === "default" ? "default" : key}
              color={nucleotides[key] ?? DEFAULT_NUCLEOTIDES[key]}
              onChange={(v) => handleNucleotideChange(key, v)}
            />
          ))}
        </div>
      </section>

      <section className="color-customizer-section">
        <div className="color-customizer-section-header">
          <span>Feature types (fill / stroke)</span>
          <button type="button" className="color-customizer-reset" onClick={handleResetFeatureTypes}>
            Reset
          </button>
        </div>
        <div className="color-customizer-feature-list">
          {Object.keys(featureTypes).sort().map((key) => (
            <div key={key} className="color-customizer-feature-row">
              <span className="color-customizer-feature-name">{key}</span>
              <div className="color-customizer-feature-cells">
                <ColorRow
                  label="fill"
                  color={featureTypes[key]?.fill ?? "#999"}
                  onChange={(v) => handleFeatureTypeChange(key, "fill", v)}
                  title={`${key} fill`}
                />
                <ColorRow
                  label="stroke"
                  color={featureTypes[key]?.stroke ?? "#666"}
                  onChange={(v) => handleFeatureTypeChange(key, "stroke", v)}
                  title={`${key} stroke`}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ColorCustomizer;
