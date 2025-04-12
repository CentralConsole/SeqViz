import * as d3 from "d3";

// 数据处理工具函数
export const DataUtils = {
  parseLocus: (locus) => locus.split(/\s+/),
  getFeature: (data) => data.features,
  getType: (feature) => feature.type,
  getLocation: (feature) => feature.location,
  getInformation: (feature) => feature.information,
  cleanString: (str) => str.replace(">", "").replace("<", ""),
  formatNumber: (num) => d3.format(",")(num),
};

// 文本处理工具函数
export const TextUtils = {
  // 测量文本宽度
  measureTextWidth: (text, fontSize, fontFamily) => {
    // 创建或复用canvas上下文
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    context.font = `${fontSize}px ${fontFamily || "sans-serif"}`;
    return context.measureText(text).width;
  },

  // 智能截断文本（针对等宽字体优化）
  truncateText: (text, maxWidth, fontSize, fontFamily) => {
    if (!text) return "";

    // 等宽字体下每个字符的平均宽度（以fontSize为基准）
    const charWidth = fontSize * 0.6; // 0.6是等宽字体中字符宽度与字体大小的一般比例

    // 计算最大可显示字符数
    const maxChars = Math.floor(maxWidth / charWidth);

    // 如果文本长度小于最大字符数，直接返回
    if (text.length <= maxChars) {
      return text;
    }

    // 预留省略号的空间（3个字符的宽度）
    const ellipsisWidth = charWidth * 3;
    const maxCharsWithEllipsis = Math.floor(
      (maxWidth - ellipsisWidth) / charWidth
    );

    // 如果空间不足以显示任何文字（包括省略号），返回空字符串
    if (maxCharsWithEllipsis <= 0) {
      return "";
    }

    // 截断文本并添加省略号
    return text.substring(0, maxCharsWithEllipsis) + "...";
  },
};

// 防抖函数
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
