// 配置常量
export const CONFIG = {
  dimensions: {
    margin: {
      top: 0.1,
      right: 0.1,
      bottom: 0.1,
      left: 0.1,
    },
    unit: 20,
    boxHeightMultiplier: 0.8,
    vSpaceMultiplier: 2.5,
    fontSizeMultiplier: 0.6,
  },
  styles: {
    box: {
      strokeLinecap: "round",
      strokeWidth: 1,
    },
    bone: {
      strokeLinecap: "round",
      strokeWidth: 1,
    },
    gap: {
      strokeLinecap: "round",
      strokeWidth: 1,
    },
    variation: {
      strokeLinecap: "round",
      strokeWidth: 1,
    },
  },
  colors: {
    // 深色主题灰暗配色
    source: "#4A7A6C", // 灰绿色
    operon: "#3C6C8C", // 灰蓝色
    CDS: "#8A7940", // 灰黄色
    gene: "#456A8C", // 暗蓝色
    tRNA: "#614D7C", // 灰紫色
    rRNA: "#7E4450", // 暗红色
    misc_feature: "#535953", // 深灰绿色
    regulatory: "#475A66", // 深灰蓝色
    STS: "#7D5A40", // 灰褐色
    variation: "#6A3D5B", // 暗紫色
    gap: "#4D4D4D", // 深灰色
    others: "#5A5A5A", // 中灰色
  },
  fonts: {
    primary: {
      family: "Maple Mono, monospace",
      size: {
        small: 12,
        medium: 14,
        large: 16,
      },
      fallback: "monospace",
    },
  },
};
