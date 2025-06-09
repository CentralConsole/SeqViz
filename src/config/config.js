// 配置常量
export const CONFIG = {
  dimensions: {
    margin: {
      top: 0.15,
      right: 0.05,
      bottom: 0.05,
      left: 0.05,
    },
    unit: 20,
    boxHeightMultiplier: 2.0,
    fontSizeMultiplier: 1.4,
    vSpace: 40,
    safetyMargin: 20,
  },
  styles: {
    box: {
      strokeWidth: 2,
      strokeColor: "#000",
      fillOpacity: 1.0,
      stroke: "#000", // 边框颜色
      strokeWidth: 2, // 边框宽度
    },
    axis: {
      stroke: "rgb(161, 161, 161)", // 坐标轴和刻度线的颜色
      strokeWidth: 2, // 坐标轴和刻度线的宽度
      tickLength: 4, // 刻度线长度
      background: {
        fill: "rgb(30, 30, 30)", // 半透明深色背景
        stroke: "none", // 无边框
      },
      text: {
        fill: "#e0e0e0", // 刻度文字颜色
        fontSize: 14, // 刻度文字大小
        fontFamily:
          "Maple Mono CN, Maple Mono, Consolas, Monaco, 'Courier New', monospace", // 刻度文字字体
      },
    },
    bone: {
      opacity: 0.5,
      strokeLinecap: "round",
      strokeDasharray: "10,10",
    },
    gap: {
      strokeLinecap: "butt",
    },
    variation: {
      strokeLinecap: "round",
    },
    annotation: {
      fontSize: 14,
      fontFamily:
        "Maple Mono CN, Maple Mono, Consolas, Monaco, 'Courier New', monospace",
      fill: "#333",
      fillDark: "#e0e0e0", // 深色主题下的文本颜色
      textPathRadialOffset: 22, // 文本路径的径向移动距离
    },
    background: {
      color: "#121212", // 统一背景色配置
    },
  },
  featureType: {
    // 深色主题灰暗配色
    source: {
      fill: "#4A7A6C",
      stroke: "rgb(142, 209, 189)",
      shape: "arrow",
      isDisplayed: false,
    },
    operon: {
      fill: "#3C6C8C",
      stroke: " rgb(169, 146, 227)",
      shape: "rect",
      isDisplayed: true,
    },
    CDS: {
      fill: "#287733",
      stroke: "rgb(165, 216, 76)",
      shape: "arrow",
      isDisplayed: true,
    },
    gene: {
      fill: " #333377",
      stroke: "rgb(143, 175, 211)",
      shape: "arrow",
      isDisplayed: true,
    },
    tRNA: {
      fill: " #614D7C",
      stroke: "rgb(187, 156, 210)",
      shape: "rect",
      isDisplayed: true,
    },
    rRNA: {
      fill: " #7E4450",
      stroke: "rgb(213, 112, 112)",
      shape: "rect",
      isDisplayed: true,
    },
    misc_feature: {
      fill: "#607D8B",
      stroke: " #405D6B",
      shape: "rect",
      isDisplayed: true,
    },
    regulatory: {
      fill: "#475A66",
      stroke: "rgb(98, 195, 255)",
      shape: "rect",
      isDisplayed: true,
    },
    STS: {
      fill: "rgb(121, 114, 32)",
      stroke: "rgb(210, 216, 18)",
      shape: "arrow",
      isDisplayed: true,
    },
    mRNA: {
      fill: "#FF9800",
      stroke: "#DF7800",
      shape: "arrow",
      isDisplayed: true,
    },
    exon: {
      fill: "#9C27B0",
      stroke: "#7C0790",
      shape: "rect",
      isDisplayed: true,
    },
    intron: {
      fill: "#E91E63",
      stroke: "#C90E43",
      shape: "rect",
      isDisplayed: true,
    },
    promoter: {
      fill: "#FF5722",
      stroke: "#DF3702",
      shape: "rect",
      isDisplayed: true,
    },
    terminator: {
      fill: "#F44336",
      stroke: "#D42326",
      shape: "rect",
      isDisplayed: true,
    },
    variation: {
      fill: "#00BCD4",
      stroke: "#009CB4",
      shape: "rect",
      isDisplayed: true,
    },
    gap: {
      fill: "#9E9E9E",
      stroke: "#7E7E7E",
      shape: "rect",
      isDisplayed: true,
    },
    others: {
      fill: "#757575",
      stroke: "rgb(185, 185, 185)",
      shape: "rect",
      isDisplayed: true,
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
    hover: {
      // 悬停时的样式配置
      strokeWidthMultiplier: 2, // 边框加粗倍数
      textShadow: "0 0 3px rgba(0,0,0,0.3)", // 文本阴影
      textBackground: {
        fill: "rgba(58, 58, 58, 0.5)", // 文本背景填充
        stroke: "rgb(148, 148, 148)", // 文本背景边框
        strokeWidth: 1, // 文本背景边框宽度
      },
      leader: {
        stroke: "#333", // 引导线颜色
        strokeWidth: 2, // 引导线宽度
      },
      cursor: "pointer", // 光标样式
      fontWeight: "bold", // 文本加粗
    },
    normal: {
      // 正常状态的样式配置
      textShadow: "none", // 无文本阴影
      textBackground: {
        fill: "none", // 无文本背景填充
        stroke: "none", // 无文本背景边框
      },
      leader: {
        stroke: "#aaa", // 引导线默认颜色
        strokeWidth: 1, // 引导线默认宽度
      },
      fontWeight: "normal", // 文本正常粗细
    },
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
  // 序列查看器样式配置
  sequenceViewer: {
    container: {
      width: "100%",
      height: "100%",
      position: "relative",
      overflow: "auto",
      backgroundColor: undefined, // 由 styles.background.color 控制
    },
    renderer: {
      position: "relative",
      width: "100%",
      height: "100%",
      overflow: "auto",
      backgroundColor: undefined, // 由 styles.background.color 控制
    },
    svg: {
      display: "block",
      overflow: "visible",
    },
    tooltip: {
      position: "absolute",
      background: "#282828",
      padding: "8px",
      borderRadius: "4px",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.5)",
      color: "#e0e0e0",
      fontSize: "12px",
      pointerEvents: "none",
      zIndex: 1000,
    },
    loading: {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      color: "#e0e0e0",
    },
    error: {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      color: "#ff6b6b",
    },
    scrollbar: {
      width: "8px",
      height: "8px",
      track: {
        background: "#1a1a1a",
      },
      thumb: {
        background: "#333",
        borderRadius: "4px",
        hover: {
          background: "#444",
        },
      },
    },
    feature: {
      pointerEvents: "all",
      cursor: "pointer",
      hover: {
        opacity: 0.9,
      },
    },
    bone: {
      stroke: "#444",
      strokeWidth: "1px",
    },
    box: {
      shapeRendering: "crispEdges",
      transition: "opacity 0.2s",
      hover: {
        opacity: 0.8,
      },
    },
    annotation: {
      fill: "#ffffff",
      pointerEvents: "none",
    },
    annotationBg: {
      fill: "rgba(50, 50, 50, 0.85)",
      stroke: "#333",
      strokeWidth: "1px",
      rx: "2px",
      ry: "2px",
    },
    responsive: {
      controls: {
        position: "static",
        margin: "10px",
      },
    },
  },
  // 视图切换按钮配置
  viewModeToggle: {
    container: {
      position: "absolute",
      top: "20px",
      right: "20px",
      zIndex: 1000,
      display: "flex",
      gap: "10px",
    },
    button: {
      color: "white",
      border: "none",
      padding: "8px 16px",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "14px",
      transition: "background-color 0.3s",
    },
    active: {
      backgroundColor: "#4caf50",
    },
    inactive: {
      backgroundColor: "#ccc",
    },
    hover: {
      opacity: 0.9,
    },
    responsive: {
      container: {
        position: "static",
        margin: "10px",
        justifyContent: "center",
      },
    },
  },
};
