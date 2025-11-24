// 数据处理工具函数
export const DataUtils = {
  parseLocus: (locus) => locus.split(/\s+/),
  getFeature: (data) => data.features,
  getType: (feature) => feature.type,
  getLocation: (feature) => feature.location,
  getInformation: (feature) => feature.information,
  cleanString: (str) => {
    if (typeof str !== "string") return str;
    return str.replace(/[^\d.-]/g, "");
  },
  formatNumber: (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  },
  isInRange: (value, min, max) => {
    return value >= min && value <= max;
  },
  clamp: (value, min, max) => {
    return Math.min(Math.max(value, min), max);
  },
};

// 文本处理工具函数
export const TextUtils = {
  // 测量文本宽度
  measureTextWidth: (text, fontSize, fontFamily) => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    context.font = `${fontSize}px ${fontFamily}`;
    return context.measureText(text).width;
  },

  // 截断文本以适应宽度
  truncateText: (text, maxWidth, fontSize, fontFamily) => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    context.font = `${fontSize}px ${fontFamily}`;

    if (context.measureText(text).width <= maxWidth) {
      return text;
    }

    let truncatedText = text;
    while (
      truncatedText.length > 0 &&
      context.measureText(truncatedText + "...").width > maxWidth
    ) {
      truncatedText = truncatedText.slice(0, -1);
    }

    return truncatedText + "...";
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

// 节流函数
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// 颜色工具函数
export const ColorUtils = {
  // 生成随机颜色
  getRandomColor: () => {
    return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  },

  // 检查颜色是否太亮
  isLightColor: (color) => {
    const hex = color.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128;
  },

  // 获取对比色
  getContrastColor: (color) => {
    return ColorUtils.isLightColor(color) ? "#000000" : "#FFFFFF";
  },
};

// 数学工具函数
export const MathUtils = {
  // 线性插值
  lerp: (start, end, t) => {
    return start * (1 - t) + end * t;
  },

  // 映射值到新范围
  map: (value, inMin, inMax, outMin, outMax) => {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  },

  // 计算两点之间的距离
  distance: (x1, y1, x2, y2) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  },

  /**
   * 生成基于种子的伪随机数（0 到 1 之间）
   * 使用线性同余生成器（LCG），相同种子总是产生相同结果
   * @param {number} seed - 种子值
   * @returns {number} 0 到 1 之间的伪随机数
   */
  seededRandom: (seed) => {
    // LCG parameters from Numerical Recipes
    // Formula: (a * seed + c) % m
    const a = 1664525;
    const c = 1013904223;
    const m = 4294967296; // 2^32
    return ((seed * a + c) % m) / m;
  },
};
