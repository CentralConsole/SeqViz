import { TextUtils, DataUtils } from "./utils";

// 布局工具函数
export const LayoutUtils = {
  // 记录所有占用信息的数组，格式为 [boxRow, textLine, start, end, text]
  // 添加text字段用于调试
  occupationRecords: [],

  // 重置布局系统
  resetLayout() {
    console.log("重置布局系统，清空占用记录");
    this.occupationRecords = [];
  },

  // 添加占用记录
  addOccupationRecord(boxRow, textLine, start, end, text = "") {
    if (!this.validateParameters(boxRow, textLine, start, end)) return;

    console.log(
      `添加占用记录: [${boxRow}, ${textLine}, ${start}, ${end}, "${text}"]`
    );
    this.occupationRecords.push([boxRow, textLine, start, end, text]);
  },

  // 检查水平重叠
  checkHorizontalOverlap(start1, end1, start2, end2) {
    if (!this.validateParameters(start1, end1, start2, end2)) return true;

    const safetyMargin = 20;
    return !(end1 + safetyMargin < start2 || start1 > end2 + safetyMargin);
  },

  // 检查位置是否被占用
  isPositionOccupied(boxRow, textLine, start, end, text = "") {
    if (!this.validateParameters(boxRow, textLine, start, end)) return true;

    // 获取当前行的所有记录
    const rowRecords = this.occupationRecords.filter(
      (record) => record[0] === boxRow
    );

    // 检查每个记录
    for (const record of rowRecords) {
      const [_, recordTextLine, recordStart, recordEnd, recordText] = record;

      // 检查水平重叠
      if (this.checkHorizontalOverlap(start, end, recordStart, recordEnd)) {
        // 如果在同一文字行，直接返回占用
        if (recordTextLine === textLine) {
          return true;
        }

        // 检查垂直距离
        const distance = Math.abs(recordTextLine - textLine);
        if (distance < 1) {
          return true;
        }
      }
    }

    return false;
  },

  // 查找可用的文字行
  findAvailableTextLine(start, end, row, maxWidth, fontSize, fontFamily, text) {
    if (!this.validateParameters(start, end, maxWidth)) return null;

    const textLineHeight = fontSize * 1.5; // 行高
    const maxTextLines = 4; // 最大行数
    const baseOffset = fontSize; // 基础偏移

    // 从第1行开始尝试
    for (let line = 1; line <= maxTextLines; line++) {
      // 如果这一行没有被占用
      if (!this.isPositionOccupied(row, line, start, end, text)) {
        const position = baseOffset + (line - 1) * textLineHeight;
        this.addOccupationRecord(row, line, start, end, text);
        return position;
      }
    }

    return null;
  },

  // 验证参数
  validateParameters(...params) {
    return params.every((param) => {
      return (
        param !== undefined &&
        param !== null &&
        !isNaN(param) &&
        param !== Infinity &&
        param !== -Infinity
      );
    });
  },

  // 检查是否需要避让
  needsAvoidance(text, maxWidth, fontSize, fontFamily) {
    if (!this.validateParameters(maxWidth, fontSize)) return true;

    const textWidth = TextUtils.measureTextWidth(text, fontSize, fontFamily);
    return textWidth > maxWidth * 0.85; // 如果文字宽度超过85%就避让
  },

  // 计算文字需要的行数
  calculateTextLines(text, maxWidth, fontSize, fontFamily) {
    // 检查maxWidth是否有效
    if (isNaN(maxWidth) || maxWidth <= 0 || maxWidth === Infinity) {
      console.log(`警告: calculateTextLines接收到无效的maxWidth: ${maxWidth}`);
      return 1; // 默认返回1行
    }

    const textWidth = TextUtils.measureTextWidth(text, fontSize, fontFamily);

    // 检查textWidth是否有效
    if (isNaN(textWidth) || textWidth <= 0 || textWidth === Infinity) {
      console.log(
        `警告: calculateTextLines计算出无效的textWidth: ${textWidth}`
      );
      return 1; // 默认返回1行
    }

    return Math.ceil(textWidth / maxWidth);
  },

  // 查找可用行
  findAvailableRow(occupied, start, end, vSpace) {
    console.log(`查找可用行: 起点: ${start}, 终点: ${end}`);

    if (!occupied) {
      occupied = {};
      console.log(`  警告: occupied为空，初始化为空对象`);
    }

    let row = 0;
    while (true) {
      if (!occupied[row]) {
        occupied[row] = [];
        console.log(`  初始化row=${row}的占用数组`);
      }

      console.log(
        `  检查row=${row}是否可用，当前占用: ${JSON.stringify(occupied[row])}`
      );
      const hasOverlap = occupied[row].some(([s, e]) => {
        const overlap = this.checkHorizontalOverlap(start, end, s, e);
        console.log(
          `    与区间[${s}, ${e}]比较: ${overlap ? "重叠" : "不重叠"}`
        );
        return overlap;
      });

      if (!hasOverlap) {
        console.log(`  找到可用行: row=${row}`);

        // 同时在LayoutUtils中记录这个行占用
        // 添加此行是为了确保行号一致性
        while (
          this.occupationRecords.length > 0 &&
          this.occupationRecords.some(
            ([r, t, s, e]) =>
              r === row &&
              t === 0 &&
              this.checkHorizontalOverlap(start, end, s, e)
          )
        ) {
          row++;
          console.log(
            `  行${row - 1}在LayoutUtils中已被占用，尝试下一行: row=${row}`
          );
        }

        return row;
      }

      row++;
      console.log(`  行${row - 1}已被占用，尝试下一行: row=${row}`);
    }
  },

  // 获取特征边界
  getFeatureBounds(locations) {
    let minStart = Infinity;
    let maxEnd = -Infinity;

    locations.forEach((loc) => {
      const start = Number(DataUtils.cleanString(loc[0]));
      const end = Number(DataUtils.cleanString(loc[loc.length - 1]));

      minStart = Math.min(minStart, start);
      maxEnd = Math.max(maxEnd, end);
    });

    return [minStart, maxEnd];
  },

  // 打印当前所有占用记录
  printOccupationRecords() {
    console.log("%c当前所有占用记录:", "color: yellow; font-weight: bold");
    this.occupationRecords.forEach(([boxRow, textLine, start, end, text]) => {
      console.log(`  [${boxRow}, ${textLine}] ${start} - ${end}: "${text}"`);
    });
  },
};
