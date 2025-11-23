// Simple browser API wrapper to embed SequenceViewer in other apps
// Exposes: window.SequenceViwer.Viewer.create(container, options)

import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import SequenceViewer from "../components/SequenceViewer/SequenceViewer.jsx";
import { parseGenbankText } from "../components/ParseAndPreparation/parse-genbank-input/browser-genbank-parser";
import { annotateRestrictionSites } from "../components/ParseAndPreparation/restriction-sites.browser";

function normalizeParsed(parsed) {
  const normalized = {
    definition: parsed?.definition || "",
    locus: parsed?.locus || {},
    features: parsed?.features || [],
    origin: parsed?.origin || "",
    res_site: parsed?.res_site || [],
  };
  try {
    if (normalized.origin && (!normalized.res_site || normalized.res_site.length === 0)) {
      const topology = (normalized.locus?.topology || "").toLowerCase();
      const isCircular = topology.includes("circular");
      normalized.res_site = annotateRestrictionSites(normalized.origin, {
        topology: isCircular ? "circular" : "linear",
      });
    }
  } catch {}
  return normalized;
}

function Embedded({ initialData }) {
  const [data, setData] = useState(initialData || null);
  const api = useMemo(() => ({ setData }), [setData]);
  // attach imperative update hook for outer wrapper
  if (typeof window !== "undefined") {
    window.__SV_EMBED_LAST__ = api;
  }
  return data ? (
    <SequenceViewer data={data} />
  ) : (
    <div style={{ padding: 12, color: "#666" }}>No sequence data loaded</div>
  );
}

function mount(container, initialData) {
  const root = ReactDOM.createRoot(container);
  root.render(<Embedded initialData={initialData} />);
  return root;
}

async function fetchText(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return await res.text();
}

export const Viewer = {
  async create(container, options = {}) {
    const el = typeof container === "string" ? document.getElementById(container) : container;
    if (!el) throw new Error("Container element not found");

    const root = mount(el, null);

    const api = {
      // Load GenBank from a URL
      async loadGenbank(url, fetchInit) {
        const text = await fetchText(url, fetchInit);
        const parsed = parseGenbankText(text);
        const normalized = normalizeParsed(parsed);
        window.__SV_EMBED_LAST__?.setData(normalized);
        return normalized;
      },
      // Load GenBank from plain text
      async loadGenbankText(text) {
        const parsed = parseGenbankText(text);
        const normalized = normalizeParsed(parsed);
        window.__SV_EMBED_LAST__?.setData(normalized);
        return normalized;
      },
      // Directly set normalized JSON data
      setData(data) {
        window.__SV_EMBED_LAST__?.setData(data);
      },
      destroy() {
        try { root.unmount(); } catch {}
      },
    };
    return api;
  },
};

// Attach to window for script tag usage
if (typeof window !== "undefined") {
  window.SequenceViwer = window.SequenceViwer || {}; // keep misspelled alias for provided example
  window.SequenceViewer = window.SequenceViewer || {};
  window.SequenceViwer.Viewer = Viewer;
  window.SequenceViewer.Viewer = Viewer;
}

export default Viewer;


