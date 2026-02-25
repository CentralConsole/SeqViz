/**
 * Light theme overrides. Merged into CONFIG when user selects "Light mode".
 * Text, lines, and UI use dark colors for readability on light background.
 */
export const LIGHT_THEME = {
  styles: {
    box: {
      stroke: "#333",
    },
    axis: {
      stroke: "rgb(80, 80, 80)",
      background: {
        fill: "rgb(245, 245, 245)",
      },
      text: {
        fill: "#1a1a1a",
      },
    },
    annotation: {
      fill: "#1a1a1a",
      fillDark: "#1a1a1a",
    },
    background: {
      color: "#f5f5f5",
    },
  },
  interaction: {
    hover: {
      textBackground: {
        fill: "rgba(240, 240, 240, 0.95)",
        stroke: "rgb(120, 120, 120)",
      },
      leader: {
        stroke: "#333",
      },
    },
    normal: {
      leader: {
        stroke: "#555",
      },
    },
  },
  sequenceViewer: {
    tooltip: {
      background: "#f5f5f5",
      color: "#1a1a1a",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
    },
    loading: {
      color: "#1a1a1a",
    },
    error: {
      color: "#c62828",
    },
    bone: {
      stroke: "#666",
    },
    annotation: {
      fill: "#1a1a1a",
    },
    annotationBg: {
      fill: "rgba(255, 255, 255, 0.9)",
      stroke: "#999",
    },
    scrollbar: {
      track: {
        background: "#e0e0e0",
      },
      thumb: {
        background: "#999",
        hover: {
          background: "#777",
        },
      },
    },
  },
  viewModeToggle: {
    button: {
      color: "#1a1a1a",
    },
    inactive: {
      backgroundColor: "#e0e0e0",
    },
  },
  restrictionSiteLabels: {
    style: {
      fill: "#1a1a1a",
      leader: {
        stroke: "#555",
        strokeWidth: 1,
      },
    },
  },
  // Lighter feature arrow colors for light background
  featureType: {
    source: { fill: "#81b5a8", stroke: "rgb(62, 129, 109)" },
    operon: { fill: "#7b9bc7", stroke: "rgb(109, 126, 187)" },
    CDS: { fill: "#66bb6a", stroke: "rgb(85, 156, 89)" },
    gene: { fill: "#7986cb", stroke: "rgb(99, 115, 191)" },
    tRNA: { fill: "#9575cd", stroke: "rgb(121, 96, 180)" },
    rRNA: { fill: "#e57373", stroke: "rgb(198, 82, 82)" },
    misc_feature: { fill: "#90a4ae", stroke: "rgb(96, 125, 139)" },
    regulatory: { fill: "#64b5f6", stroke: "rgb(66, 165, 245)" },
    STS: { fill: "#d4e157", stroke: "rgb(175, 180, 43)" },
    mRNA: { fill: "#ffb74d", stroke: "#ff8f00" },
    exon: { fill: "#ba68c8", stroke: "#8e24aa" },
    intron: { fill: "#f06292", stroke: "#c2185b" },
    promoter: { fill: "#ff8a65", stroke: "#e64a19" },
    terminator: { fill: "#ef5350", stroke: "#c62828" },
    variation: { fill: "#4dd0e1", stroke: "#00acc1" },
    gap: { fill: "#bdbdbd", stroke: "#9e9e9e" },
    others: { fill: "#9e9e9e", stroke: "rgb(117, 117, 117)" },
  },
  detailedSequenceViewer: {
    translation: {
      aminoAcidColor: "#1a1a1a",
    },
    nucleotideColors: {
      A: "#c62828",
      T: "#00838f",
      C: "#0277bd",
      G: "#2e7d32",
      N: "#616161",
      default: "#1a1a1a",
    },
    featurePanel: {
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      border: "1px solid #bdbdbd",
    },
  },
};
