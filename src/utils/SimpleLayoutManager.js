class SimpleLayoutManager {
  constructor(config = {}) {
    this.config = {
      rowSpacing: 30, // 行间距（上一行的底部到下一行的顶部）
      textHeight: 20,
      safetyMargin: 20,
      textSpacing: 5, // 文本之间的间距
      minAnnotationHeight: 20, // annotation最小高度
      ...config,
    };

    // 使用 Map 存储每行的占用情况和行高
    this.occupiedRows = new Map();
    // 存储每行中box下方文本的位置信息
    this.rowTexts = new Map();
    // 存储每行的box高度和Y坐标
    this.rowBoxInfo = new Map();
    // 存储每行中文本的x坐标范围
    this.rowTextRanges = new Map();
    this.rowHeights = new Map(); // 每行实际高度
    this.rowYs = new Map(); // 每行y坐标
    this.lockedRowYs = new Map(); // 新增：锁定渲染box时的y坐标
    this.boxLayoutLocked = false; // 新增：渲染box时锁定y
  }

  // 检查两个区间是否重叠
  checkOverlap(start1, end1, start2, end2) {
    return !(
      end1 + this.config.safetyMargin < start2 ||
      start1 > end2 + this.config.safetyMargin
    );
  }

  // 检查文本是否重叠
  checkTextOverlap(x1, width1, y1, x2, width2, y2) {
    // 计算文本的边界
    const left1 = x1 - width1 / 2;
    const right1 = x1 + width1 / 2;
    const left2 = x2 - width2 / 2;
    const right2 = x2 + width2 / 2;

    // 检查水平重叠
    const xOverlap = !(
      right1 + this.config.safetyMargin < left2 ||
      left1 > right2 + this.config.safetyMargin
    );

    // 检查垂直重叠（考虑文本高度）
    const yOverlap = Math.abs(y1 - y2) < this.config.textHeight;

    return xOverlap && yOverlap;
  }

  // 查找可用行
  findAvailableRow(start, end) {
    let row = 0;
    while (true) {
      const rowOccupations = this.occupiedRows.get(row) || [];

      // 检查当前行是否有重叠
      const hasOverlap = rowOccupations.some(([s, e]) =>
        this.checkOverlap(start, end, s, e)
      );

      if (!hasOverlap) {
        // 记录占用
        this.occupiedRows.set(row, [...rowOccupations, [start, end]]);
        return row;
      }

      row++;
    }
  }

  // 计算所有行的y坐标（在任意行高变化后调用）
  recalcRowYs() {
    let y = 0;
    for (let row = 0; this.rowHeights.has(row); row++) {
      this.rowYs.set(row, y);
      y += this.rowHeights.get(row) + this.config.rowSpacing;
    }
    // 如果未锁定，更新lockedRowYs
    if (!this.boxLayoutLocked) {
      this.lockedRowYs = new Map(this.rowYs);
    }
  }

  // 渲染box前调用，锁定所有行的y坐标
  lockBoxLayout() {
    this.boxLayoutLocked = true;
    this.lockedRowYs = new Map(this.rowYs);
  }

  // 渲染box后调用，解锁
  unlockBoxLayout() {
    this.boxLayoutLocked = false;
  }

  // 计算元素位置
  calculatePosition(start, end, row, rowHeight) {
    // 记录box高度
    const prevBoxInfo = this.rowBoxInfo.get(row) || { height: 0 };
    const boxHeight = Math.max(prevBoxInfo.height, rowHeight);
    this.rowBoxInfo.set(row, { height: boxHeight });

    // 计算最小行高 = box高度 + annotation最小高度 + padding
    const minRowHeight =
      boxHeight + this.config.minAnnotationHeight + this.config.textSpacing;
    const prevRowHeight = this.rowHeights.get(row) || 0;
    // 先用最小高度初始化
    if (!this.rowHeights.has(row) || prevRowHeight < minRowHeight) {
      this.rowHeights.set(row, minRowHeight);
      this.recalcRowYs();
    }

    // 渲染box时，y坐标只取lockedRowYs
    const y = this.lockedRowYs.get(row) || 0;
    return {
      x: start,
      y: y,
      width: end - start,
      height: boxHeight,
      row: row,
    };
  }

  // 计算文本位置
  calculateTextPosition(boxPosition, text, isTruncated) {
    if (isTruncated) {
      const row = boxPosition.row;
      const rowTexts = this.rowTexts.get(row) || [];
      const rowTextRanges = this.rowTextRanges.get(row) || [];
      const textX = boxPosition.x + boxPosition.width / 2;
      const textLeft = textX - boxPosition.width / 2;
      const textRight = textX + boxPosition.width / 2;
      let y =
        this.lockedRowYs.get(row) +
        (this.rowBoxInfo.get(row)?.height || 0) +
        this.config.textHeight / 2;
      let hasOverlap = false;
      while (true) {
        hasOverlap = false;
        for (let i = 0; i < rowTexts.length; i++) {
          const existingText = rowTexts[i];
          const range = rowTextRanges[i];
          if (this.checkOverlap(textLeft, textRight, range.left, range.right)) {
            if (
              this.checkTextOverlap(
                textX,
                boxPosition.width,
                y,
                existingText.x,
                existingText.width,
                existingText.y
              )
            ) {
              y =
                existingText.y +
                this.config.textHeight +
                this.config.textSpacing;
              hasOverlap = true;
              break;
            }
          }
        }
        if (!hasOverlap) {
          break;
        }
      }
      // 记录新的文本位置和x坐标范围
      const textPosition = {
        x: textX,
        y: y,
        width: boxPosition.width,
        height: this.config.textHeight,
        text: text,
      };
      this.rowTexts.set(row, [...rowTexts, textPosition]);
      this.rowTextRanges.set(row, [
        ...rowTextRanges,
        { left: textLeft, right: textRight },
      ]);
      // 检查是否需要增大行高
      const rowTopY = this.lockedRowYs.get(row) || 0;
      const textBottom = y + this.config.textHeight / 2;
      const curRowHeight = this.rowHeights.get(row) || 0;
      if (textBottom - rowTopY > curRowHeight) {
        this.rowHeights.set(
          row,
          textBottom - rowTopY + this.config.textSpacing
        );
        this.recalcRowYs();
      }
      return textPosition;
    } else {
      return {
        x: boxPosition.x + boxPosition.width / 2,
        y: boxPosition.y + boxPosition.height / 2,
        text,
        width: boxPosition.width,
        height: boxPosition.height,
      };
    }
  }

  // 更新行高（保留接口，实际已自动处理）
  updateRowHeight(row, height, hasTruncatedText) {
    // 不再需要手动更新，已自动处理
  }

  // 重置布局
  reset() {
    this.occupiedRows.clear();
    this.rowTexts.clear();
    this.rowBoxInfo.clear();
    this.rowTextRanges.clear();
    this.rowHeights.clear();
    this.rowYs.clear();
    this.lockedRowYs.clear();
    this.boxLayoutLocked = false;
  }
}

export default SimpleLayoutManager;
