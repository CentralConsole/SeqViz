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

// 翻译工具函数 - DNA -> Protein
export const TranslationUtils = {
  // 标准遗传密码表
  codons: {
    // 苯丙氨酸 (F)
    TTT: "F", TTC: "F",
    // 亮氨酸 (L)
    TTA: "L", TTG: "L", CTT: "L", CTC: "L", CTA: "L", CTG: "L",
    // 异亮氨酸 (I)
    ATT: "I", ATC: "I", ATA: "I",
    // 起始密码子 / 甲硫氨酸 (M)
    ATG: "M",
    // 缬氨酸 (V)
    GTT: "V", GTC: "V", GTA: "V", GTG: "V",
    // 丝氨酸 (S)
    TCT: "S", TCC: "S", TCA: "S", TCG: "S", AGT: "S", AGC: "S",
    // 脯氨酸 (P)
    CCT: "P", CCC: "P", CCA: "P", CCG: "P",
    // 苏氨酸 (T)
    ACT: "T", ACC: "T", ACA: "T", ACG: "T",
    // 丙氨酸 (A)
    GCT: "A", GCC: "A", GCA: "A", GCG: "A",
    // 酪氨酸 (Y)
    TAT: "Y", TAC: "Y",
    // 终止密码子 (*)
    TAA: "*", TAG: "*", TGA: "*",
    // 组氨酸 (H)
    CAT: "H", CAC: "H",
    // 谷氨酰胺 (Q)
    CAA: "Q", CAG: "Q",
    // 天冬酰胺 (N)
    AAT: "N", AAC: "N",
    // 赖氨酸 (K)
    AAA: "K", AAG: "K",
    // 天冬氨酸 (D)
    GAT: "D", GAC: "D",
    // 谷氨酸 (E)
    GAA: "E", GAG: "E",
    // 半胱氨酸 (C)
    TGT: "C", TGC: "C",
    // 色氨酸 (W)
    TGG: "W",
    // 精氨酸 (R)
    CGT: "R", CGC: "R", CGA: "R", CGG: "R", AGA: "R", AGG: "R",
    // 甘氨酸 (G)
    GGT: "G", GGC: "G", GGA: "G", GGG: "G",
  },

  // 密码子颜色（根据氨基酸化学性质分组）
  aminoAcidColors: {
    // 非极性 ( hydrophobic )
    A: "#8c8c8c", V: "#8c8c8c", I: "#8c8c8c", L: "#8c8c8c", M: "#8c8c8c", F: "#8c8c8c", W: "#8c8c8c", P: "#8c8c8c", G: "#8c8c8c",
    // 极性 ( polar )
    S: "#4ecdc4", T: "#4ecdc4", C: "#4ecdc4", Y: "#4ecdc4", N: "#4ecdc4", Q: "#4ecdc4",
    // 带电 - 正电 ( positive charge )
    K: "#ff6b6b", R: "#ff6b6b", H: "#ff6b6b",
    // 带电 - 负电 ( negative charge )
    D: "#45b7d1", E: "#45b7d1",
    // 终止密码子
    "*": "#ff0000",
  },

  /**
   * 获取互补碱基
   * @param {string} base - 碱基 (A, T, C, G)
   * @returns {string} 互补碱基
   */
  complement: (base) => {
    const baseUpper = base.toUpperCase();
    const complementMap = { A: "T", T: "A", C: "G", G: "C", N: "N" };
    return complementMap[baseUpper] || "N";
  },

  /**
   * 获取反义链序列
   * @param {string} sequence - 正义链序列
   * @returns {string} 反义链序列（5' -> 3'）
   */
  reverseComplement: (sequence) => {
    return sequence
      .toUpperCase()
      .split("")
      .reverse()
      .map((base) => TranslationUtils.complement(base))
      .join("");
  },

  /**
   * 翻译 DNA 序列为蛋白质序列
   * @param {string} dna - DNA 序列 (5' -> 3')
   * @param {number} frame - 阅读框偏移 (0, 1, 2)
   * @returns {string} 蛋白质序列
   */
  translate: (dna, frame = 0) => {
    const dnaClean = dna.toUpperCase().replace(/[^ATCG]/g, "");
    const protein = [];
    
    for (let i = frame; i + 2 < dnaClean.length; i += 3) {
      const codon = dnaClean.slice(i, i + 3);
      const aa = TranslationUtils.codons[codon] || "?";
      protein.push(aa);
    }
    
    return protein.join("");
  },

  /**
   * 翻译正义链的3个阅读框
   * @param {string} dna - DNA 序列
   * @returns {Object} 3个阅读框的翻译结果 { frame0, frame1, frame2 }
   */
  translateForward: (dna) => {
    return {
      frame0: TranslationUtils.translate(dna, 0),
      frame1: TranslationUtils.translate(dna, 1),
      frame2: TranslationUtils.translate(dna, 2),
    };
  },

  /**
   * 翻译反义链的3个阅读框
   * @param {string} dna - DNA 序列
   * @returns {Object} 3个阅读框的翻译结果 { frame0, frame1, frame2 }
   */
  translateReverse: (dna) => {
    const rc = TranslationUtils.reverseComplement(dna);
    return {
      frame0: TranslationUtils.translate(rc, 0),
      frame1: TranslationUtils.translate(rc, 1),
      frame2: TranslationUtils.translate(rc, 2),
    };
  },

  /**
   * 获取氨基酸的颜色
   * @param {string} aa - 氨基酸单字母代码
   * @returns {string} 颜色代码
   */
  getAminoAcidColor: (aa) => {
    return TranslationUtils.aminoAcidColors[aa.toUpperCase()] || "#e0e0e0";
  },

  /**
   * 获取密码子位置对应的基因组位置
   * @param {number} codonIndex - 密码子索引（从0开始）
   * @param {number} frame - 阅读框 (0, 1, 2)
   * @returns {number} 基因组起始位置 (1-based)
   */
  codonToGenomePosition: (codonIndex, frame) => {
    return codonIndex * 3 + frame + 1;
  },
};
