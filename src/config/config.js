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
      fillOpacity: 0.8,
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
      fontFamily: "Arial, sans-serif",
      fill: "#333",
      fillDark: "#e0e0e0", // 深色主题下的文本颜色
    },
  },
  colors: {
    // 深色主题灰暗配色
    source: "#4A7A6C", // 灰绿色
    operon: "#3C6C8C", // 灰蓝色
    CDS: "#287733",
    gene: "#333377",
    tRNA: "#614D7C", // 灰紫色
    rRNA: "#7E4450", // 暗红色
    misc_feature: "#607D8B",
    regulatory: "#475A66", // 深灰蓝色
    STS: "#7D5A40", // 灰褐色
    mRNA: "#FF9800",
    exon: "#9C27B0",
    intron: "#E91E63",
    promoter: "#FF5722",
    terminator: "#F44336",
    variation: "#00BCD4",
    gap: "#9E9E9E",
    others: "#757575",
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
};
