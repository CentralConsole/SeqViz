// 配置常量
export const CONFIG = {
  dimensions: {
    margin: {
      top: 0.05,
      right: 0.05,
      bottom: 0.05,
      left: 0.05,
    },
    unit: 10,
    boxHeightMultiplier: 1.0,
    fontSizeMultiplier: 0.7,
    vSpace: 20,
    safetyMargin: 10,
  },
  styles: {
    box: {
      strokeWidth: 1,
      strokeColor: "#000",
      fillOpacity: 1.0,
      stroke: "#000", // 边框颜色
      strokeWidth: 1, // 边框宽度
    },
    bone: {
      opacity: 0.5,
      strokeLinecap: "round",
      strokeDasharray: "5,5",
    },
    gap: {
      strokeLinecap: "butt",
    },
    variation: {
      strokeLinecap: "round",
    },
    annotation: {
      fontSize: 7,
      fontFamily: "Maple Mono CN, Maple Mono, Arial, sans-serif",
      fill: "#333",
      fillDark: "#e0e0e0", // 深色主题下的文本颜色
    },
  },
  colors: {
    // 深色主题灰暗配色
    source: {
      fill: "#4A7A6C",
      stroke: "rgb(142, 209, 189)",
    },
    operon: {
      fill: "#3C6C8C",
      stroke: "rgb(169, 146, 227)",
    },
    CDS: {
      fill: "#287733",
      stroke: "rgb(165, 216, 76)",
    },
    gene: {
      fill: "#333377",
      stroke: "rgb(143, 175, 211)",
    },
    tRNA: {
      fill: "#614D7C",
      stroke: "rgb(187, 156, 210)",
    },
    rRNA: {
      fill: "#7E4450",
      stroke: "rgb(213, 112, 112)",
    },
    misc_feature: {
      fill: "#607D8B",
      stroke: "#405D6B",
    },
    regulatory: {
      fill: "#475A66",
      stroke: "rgb(98, 195, 255)",
    },
    STS: {
      fill: "#7D5A40",
      stroke: "rgb(204, 137, 66)",
    },
    mRNA: {
      fill: "#FF9800",
      stroke: "#DF7800",
    },
    exon: {
      fill: "#9C27B0",
      stroke: "#7C0790",
    },
    intron: {
      fill: "#E91E63",
      stroke: "#C90E43",
    },
    promoter: {
      fill: "#FF5722",
      stroke: "#DF3702",
    },
    terminator: {
      fill: "#F44336",
      stroke: "#D42326",
    },
    variation: {
      fill: "#00BCD4",
      stroke: "#009CB4",
    },
    gap: {
      fill: "#9E9E9E",
      stroke: "#7E7E7E",
    },
    others: {
      fill: "#757575",
      stroke: "rgb(185, 185, 185)",
    },
  },
  fonts: {
    primary: {
      family: "Arial, sans-serif",
      weight: "normal",
    },
    secondary: {
      family: "Courier New, monospace",
      weight: "normal",
    },
  },
  interaction: {
    hoverDelay: 200,
    tooltipOffset: 10,
    highlightOpacity: 0.7,
  },
  animation: {
    duration: 300,
    easing: "ease-in-out",
  },
  performance: {
    maxFeatures: 1000,
    batchSize: 100,
    debounceTime: 100,
  },
  svgWidthRatio: 0.8, // SVG宽度占首次加载时窗口宽度的比例
  svgWidthPaddingRatio: 1.2, // SVG宽度padding比例（内容宽度的倍数）
  svgHeightPaddingRatio: 1.2, // SVG高度padding比例（内容高度的倍数）
  linearLayout: {
    rowSpacing: 30, // 行间距
    textHeight: 20, // 文本高度
    safetyMargin: 20, // 安全边距
    textSpacing: 5, // 文本间距
    minAnnotationHeight: 20, // 最小注释高度
    textBoxMargin: 10, // 文本与框之间的边距
  },
};
