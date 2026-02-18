# Sequence Viewer

[![React](https://img.shields.io/badge/React-18%2B-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-Friendly-green.svg)](https://electronjs.org/)
[![Plug & Play](https://img.shields.io/badge/Plug%20%26%20Play-✅-brightgreen.svg)]()

A React component for visualizing genomic data with support for feature display and interaction. Truly "plug and play".

## Quick Start

```bash
npm install sequence-viewer react react-dom d3
```

```javascript
import { SequenceViewer } from "sequence-viewer";

function App() {
  return (
    <div style={{ width: "100%", height: "600px" }}>
      {/* By default, the component displays a file selection interface for loading GenBank files locally */}
      <SequenceViewer viewMode="circular" />
    </div>
  );
}
```

Or pass data directly:

```javascript
import { SequenceViewer } from "sequence-viewer";

function App() {
  return (
    <div style={{ width: "100%", height: "600px" }}>
      <SequenceViewer
        data={{
          locus: { sequenceLength: 16569 },
          features: [],
          origin: "ACGT...",
        }}
        viewMode="circular"
      />
    </div>
  );
}
```

## Installation

```bash
npm install sequence-viewer
# Host application must provide peer dependencies (React 18 or 19, ReactDOM 18 or 19, D3 >= 7)
npm install react react-dom d3
```

## Features

This component has all necessary styles and font resources built-in, making it truly "plug and play":

- ✅ **Built-in Fonts**: Maple Mono Nerd Font is bundled within the component, no additional configuration needed
- ✅ **Built-in Styles**: All UI styles are integrated, using `sv-` prefix to avoid conflicts
- ✅ **Zero External Dependencies**: Component doesn't depend on external CSS or font files
- ✅ **Responsive**: Supports automatic light/dark theme switching
- ✅ **Type Safe**: TypeScript support (type declarations coming soon)
- ✅ **Electron Friendly**: Optimized for Electron projects

## Font Notes

This component strongly depends on the Maple Mono Nerd Font (Maple Mono NF) for rendering. **The component has this font built-in, no additional configuration is required**.

### Custom Fonts (Optional)

If you need to override the default font in your host project:

1. Via Public Static Resource Path (for Vite/CRA/Electron renderer process)

Place font files in a public directory accessible by your host application, for example:

```
public/
  assets/
    fonts/
      maple-mono-nf/
        MapleMono-NF-Regular.ttf
        MapleMono-NF-Bold.ttf
        MapleMono-NF-Italic.ttf
```

Declare @font-face in your host global CSS (adjust paths according to your deployment):

```css
@font-face {
  font-family: "Maple Mono NF";
  src: url("/assets/fonts/maple-mono-nf/MapleMono-NF-Regular.ttf") format("truetype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Maple Mono NF";
  src: url("/assets/fonts/maple-mono-nf/MapleMono-NF-Bold.ttf") format("truetype");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Maple Mono NF";
  src: url("/assets/fonts/maple-mono-nf/MapleMono-NF-Italic.ttf") format("truetype");
  font-weight: 400;
  font-style: italic;
  font-display: swap;
}
```

2. Via Bundler Import (fonts as module assets)

Place fonts in your host source directory (e.g., `src/assets/fonts/maple-mono-nf/`), and reference them with relative paths in your global styles:

```css
@font-face {
  font-family: "Maple Mono NF";
  src: url("./assets/fonts/maple-mono-nf/MapleMono-NF-Regular.ttf") format("truetype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
/* Same for Bold/Italic variants */
```

Electron projects: It's recommended to host fonts in a static directory accessible by the renderer process (such as `resources` or `public`), maintaining URLs that can be directly accessed by pages (e.g., `/assets/fonts/...` under the site root provided by `win.loadURL`). Do not read font files through Node APIs inside the component.

## Usage

### Basic Usage

#### 1. Local File Loading (Default)

The component loads no files by default and displays a friendly file selection interface. Users can select GenBank files (.gb, .gbk, .genbank, .txt) locally by clicking the "Choose File" button.

```javascript
import React from "react";
import { SequenceViewer } from "sequence-viewer";

function App() {
  return (
    <div style={{ width: "100%", height: "600px" }}>
      {/* Without passing data or loadData, the component will show the file selection interface */}
      <SequenceViewer viewMode="circular" />
    </div>
  );
}
```

#### 2. Pass Data Object Directly

If you already have parsed data, you can pass it directly:

```javascript
import React from "react";
import { SequenceViewer } from "sequence-viewer";

function App() {
  return (
    <div style={{ width: "100%", height: "600px" }}>
      <SequenceViewer
        data={{
          locus: { sequenceLength: 16569 },
          features: [],
          origin: "ACGT...",
        }}
        viewMode="circular"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
```

### Lazy Loading Data (from Backend API or Other Sources)

If you want to load data from a backend API or other data source, you can use the `loadData` prop:

```javascript
import React from "react";
import { SequenceViewer } from "sequence-viewer";

function App() {
  const loadData = async () => {
    // Load GBK file from backend API
    const res = await fetch("/api/genbank/mito2.gbk");
    if (!res.ok) {
      throw new Error(`Failed to load GBK file: ${res.statusText}`);
    }
    return await res.text(); // Returns GBK text string, component will auto-parse
  };

  // Or load parsed JSON data
  // const loadData = async () => {
  //   const res = await fetch("/api/genome-data.json");
  //   return await res.json();
  // };

  return (
    <div style={{ width: "100%", height: "600px" }}>
      <SequenceViewer
        loadData={loadData}
        viewMode="linear"
        onFeatureClick={(feature) => console.log("Feature:", feature)}
      />
    </div>
  );
}
```

### Controlled View Mode

```javascript
import React, { useState } from "react";
import { SequenceViewer } from "sequence-viewer";

function App() {
  const [viewMode, setViewMode] = useState("circular");

  return (
    <div>
      <div>
        <button onClick={() => setViewMode("linear")}>Linear</button>
        <button onClick={() => setViewMode("circular")}>Circular</button>
        <button onClick={() => setViewMode("detailed")}>Detailed</button>
      </div>
      <div style={{ width: "100%", height: "600px" }}>
        <SequenceViewer data={yourData} viewMode={viewMode} />
      </div>
    </div>
  );
}
```

### Data Loading Methods Summary

The component supports three data loading methods:

1. **Local File Selection (Default)**: When neither `data` nor `loadData` is passed, the component displays a file selection interface
2. **Direct Data Object**: Pass a parsed JSON object using the `data` prop
3. **Lazy Loading**: Use the `loadData` callback function to load from backend API or other data sources

**Note**: If both `data` and `loadData` are provided, `data` takes precedence.

### Data Formats

The component supports two data formats:

#### 1. GenBank Format (GBK/GB)

The component can directly load and parse GenBank format files:

```javascript
const loadData = async () => {
  // Load GBK file from backend API
  const res = await fetch("/api/genbank/mito2.gbk");
  return await res.text(); // Returns GBK text string
};
```

The component will automatically:

- Parse GBK file content
- Extract locus, features, origin, and other information
- Automatically annotate restriction sites, including cut positions for both forward and reverse strands

#### 2. JSON Format

If using pre-parsed JSON data, the format is as follows:

```json
{
  "locus": {
    "locusName": "NC_012920",
    "sequenceLength": 16569,
    "moleculeType": "DNA",
    "topology": "circular",
    "division": "PRI",
    "date": "31-OCT-2014"
  },
  "definition": "Homo sapiens mitochondrion, complete genome.",
  "features": [
    {
      "type": "gene",
      "location": [["577", false, "647"]],
      "information": {
        "gene": "TRNF",
        "product": "tRNA-Phe"
      }
    }
  ],
  "origin": "gatcacaggtctatcaccctattaaccactcacggg...",
  "res_site": [
    {
      "enzyme": "DpnII",
      "recognition": "gatc",
      "cutPattern": "|gatc",
      "position": 1,
      "reversePosition": 4,
      "cutIndexInRecognition": 0,
      "cutDistance": 4,
      "type": "unknown",
      "overhangLength": 0,
      "overhangSeq": ""
    }
  ]
}
```

### Getting Feature Data

There are two ways to get feature data when users click on features:

#### 1. Via Callback Function

```javascript
import React from "react";
import { SequenceViewer } from "sequence-viewer";

function App() {
  const handleFeatureClick = (feature) => {
    console.log("Feature data:", feature);
    // feature contains complete feature information, including:
    // - id: Feature ID
    // - type: Feature type
    // - location: Location information
    // - information: Detailed information (gene, product, note, etc.)
  };

  return (
    <div>
      <SequenceViewer data={dataObject} onFeatureClick={handleFeatureClick} />
    </div>
  );
}
```

#### 2. Via Custom Events (Optional)

```javascript
import React, { useEffect } from "react";
import { SequenceViewer } from "sequence-viewer";

function App() {
  useEffect(() => {
    const handleGenomeFeatureClick = (event) => {
      const { feature, timestamp } = event.detail;
      console.log("Feature data:", feature);
      console.log("Click time:", timestamp);
    };

    window.addEventListener("genomeFeatureClick", handleGenomeFeatureClick);

    return () => {
      window.removeEventListener(
        "genomeFeatureClick",
        handleGenomeFeatureClick
      );
    };
  }, []);

  return (
    <div>
      <SequenceViewer data={dataObject} />
    </div>
  );
}
```

## Component Props

| Prop           | Type     | Required | Default   | Description                                                                                    |
| -------------- | -------- | -------- | --------- | ---------------------------------------------------------------------------------------------- |
| data           | Object   | No       | -         | Genomic data object (recommended)                                                              |
| loadData       | Function | No       | -         | Lazy load data function, returns Promise `<string>` (GBK text) or Promise `<Object>` (JSON)    |
| viewMode       | String   | No       | "linear"  | View mode: "linear", "circular", or "detailed"                                                 |
| width          | Number   | No       | auto      | Component width, adapts to container by default                                                |
| height         | Number   | No       | auto      | Component height, adapts to container by default                                               |
| style          | Object   | No       | {}        | Custom container styles                                                                        |
| onFeatureClick | Function | No       | -         | Feature click callback function                                                                |
| className      | String   | No       | -         | Custom CSS class name                                                                          |

### Feature Data Structure

When a user clicks on a feature, the returned data structure is as follows:

```javascript
{
  id: "feature1",           // Feature ID
  type: "gene",            // Feature type
  location: [              // Location information array
    ["100", false, "200"]         // Each location is an array containing start position, whether on complement strand, end position
  ],
  information: {           // Detailed feature information
    gene: "GENE1",         // Gene name
    product: "Protein 1",  // Product name
    note: "Some notes"     // Note information
  }
}
```

### Style Customization

You can customize component styles via the `style` prop:

```javascript
<SequenceViewer
  data={yourDataObject} // Must be an object, not a path string
  style={{
    width: "100%",
    height: "600px",
    backgroundColor: "#f5f5f5",
    // Other styles...
  }}
/>
```

## Testing and Development

### Local Testing

```bash
# Clone repository
git clone <repository-url>
cd sequence-viewer

# Install dependencies
npm install

# Run full development environment
npm run dev

# Run simplified test environment (component only)
npm run dev:simple

# Build library (for npm publish)
npm run build

# Build demo app (for static deploy, e.g. Netlify)
npm run build:demo
# Preview demo: npm run preview:demo
```

### Deploying the demo (e.g. Netlify)

- **Build command**: `npm run build:demo`
- **Publish directory**: `dist-demo`

A `netlify.toml` is included; connect the repo to Netlify and use the above settings (or leave defaults if using the config file).

### Testing Plug & Play Features

1. **Simplified Testing**: Run `npm run dev:simple` to see how the component behaves in a minimal environment
2. **Build Testing**: Run `npm run build` to verify fonts and styles are correctly packaged

### Development Guide

- Component styles use `sv-` prefix to avoid conflicts with host styles
- Font files: `src/components/SequenceViewer/assets/fonts/`
- Main styles: `src/components/SequenceViewer/SequenceViewer.css`
- GenBank parsing: `src/components/ParseAndPreparation/parse-genbank-input/browser-genbank-parser.js`
- Restriction sites (enzyme data and annotator): `src/components/ParseAndPreparation/enzymes/` — `standard-sites.js` (enzyme list), `restriction-sites.browser.js` (sequence annotation)
- SequenceViewer composes: `SequenceViewer.jsx`, `dataProcessor.js`, `useGenomeData.js`, `useContainerDimensions.js`, `FilePickerUI.jsx`
- Build artifacts: `dist/sequence-viewer.es.js` and `dist/sequence-viewer.cjs.js`

## Important Notes

1. **Dependency Requirements**: React 18 or 19, ReactDOM 18 or 19, D3 >= 7 (provided by host application)
2. **Data Format**: Supports GenBank format (GBK/GB) and JSON format. GenBank format is recommended as the component will automatically parse and annotate restriction sites
3. **Data Validation**: It's recommended to validate data before use
4. **Data Input**:
   - **Default Behavior**: When neither `data` nor `loadData` is passed, the component displays a file selection interface, allowing users to load files locally
   - **Direct Input**: Pass parsed data using the `data` object
   - **Lazy Loading**: Use the `loadData()` callback function to load from backend API or other data sources. `loadData` can return a GBK text string or a parsed JSON object
5. **Container Dimensions**: Ensure the component container has explicit width and height to avoid initial dimensions of 0
6. **Style Isolation**: Component uses `sv-` prefix, but still be aware of potential impacts from host global styles
7. **Local File Selection**: Component has built-in file selection functionality, supporting `.gb`, `.gbk`, `.genbank`, `.txt` format files

## Examples

### Example 1: Local File Selection (Default)

```javascript
import React from "react";
import { SequenceViewer } from "sequence-viewer";

function App() {
  const handleFeatureClick = (feature) => {
    console.log("Feature data via callback:", feature);
  };

  return (
    <div style={{ width: "100%", height: "600px" }}>
      {/* Default file selection interface */}
      <SequenceViewer
        onFeatureClick={handleFeatureClick}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#f5f5f5",
        }}
      />
    </div>
  );
}
```

### Example 2: Load from Backend API

```javascript
import React from "react";
import { SequenceViewer } from "sequence-viewer";

function App() {
  const handleFeatureClick = (feature) => {
    console.log("Feature data via callback:", feature);
  };

  // Load GBK file from backend API
  const loadData = async () => {
    const res = await fetch("/api/genbank/mito2.gbk");
    if (!res.ok) {
      throw new Error(`Failed to load GBK file: ${res.statusText}`);
    }
    return await res.text(); // Returns GBK text, component will auto-parse
  };

  return (
    <div style={{ width: "100%", height: "600px" }}>
      <SequenceViewer
        loadData={loadData}
        onFeatureClick={handleFeatureClick}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#f5f5f5",
        }}
      />
    </div>
  );
}
```

### Example 3: Pass Data Directly

```javascript
import React from "react";
import { SequenceViewer } from "sequence-viewer";

function App() {
  const genomeData = {
    locus: { sequenceLength: 16569 },
    features: [],
    origin: "ACGT...",
  };

  return (
    <div style={{ width: "100%", height: "600px" }}>
      <SequenceViewer
        data={genomeData}
        viewMode="circular"
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}
```

