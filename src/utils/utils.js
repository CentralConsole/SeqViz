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

// 布局工具函数
export const LayoutUtils = {
  // 检查区间是否被占用
  checkOccupation: (occupied, start, end) => {
    if (!Array.isArray(occupied)) {
      return false;
    }

    return occupied.some(
      ([occupiedStart, occupiedEnd]) =>
        (start >= occupiedStart && start < occupiedEnd) ||
        (end > occupiedStart && end <= occupiedEnd) ||
        (start <= occupiedStart && end >= occupiedEnd)
    );
  },

  // 查找可用行
  findAvailableRow: (occupied, start, end, vSpace) => {
    if (!occupied) {
      occupied = {};
    }

    let row = 1;
    while (
      occupied[row] &&
      LayoutUtils.checkOccupation(occupied[row], start, end)
    ) {
      row++;
    }

    // 确保行存在
    if (!occupied[row]) {
      occupied[row] = [];
    }

    return row;
  },

  // 获取特征边界
  getFeatureBounds: (location) => {
    let minPos = Infinity;
    let maxPos = -Infinity;

    for (const interval of location) {
      const start = Number(DataUtils.cleanString(interval[0]));
      const end = Number(DataUtils.cleanString(interval[interval.length - 1]));
      minPos = Math.min(minPos, start);
      maxPos = Math.max(maxPos, end);
    }

    return [minPos, maxPos];
  },
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
