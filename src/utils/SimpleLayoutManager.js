import { CONFIG } from "../config/config";

class SimpleLayoutManager {
  constructor(config = {}) {
    this.config = {
      ...CONFIG.linearLayout, // 全局默认布局参数
      ...config, // 实例化时可覆盖
    };

    // 存储每行的占用情况
    this.occupiedRows = new Map();
    // 存储每行的box信息
    this.rowBoxInfo = new Map();
    // 存储每行的y坐标
    this.rowYs = new Map();
    // 存储每行的文本节点
    this.rowTextNodes = new Map();
    // 存储每行的力导向模拟器
    this.rowSimulations = new Map();
    // 存储每行的实际高度
    this.rowHeights = new Map();
    // 存储锁定的y坐标
    this.lockedRowYs = new Map();
    // 布局锁定状态
    this.boxLayoutLocked = false;
    // 模拟器运行状态
    this.simulationRunning = new Map();
  }

  // 检查两个区间是否重叠
  checkOverlap(start1, end1, start2, end2) {
    return !(
      end1 + this.config.safetyMargin < start2 ||
      start1 > end2 + this.config.safetyMargin
    );
  }

  // 查找可用行
  findAvailableRow(start, end) {
    let row = 0;
    while (true) {
      const rowOccupations = this.occupiedRows.get(row) || [];
      const hasOverlap = rowOccupations.some(([s, e]) =>
        this.checkOverlap(start, end, s, e)
      );
      if (!hasOverlap) {
        this.occupiedRows.set(row, [...rowOccupations, [start, end]]);
        return row;
      }
      row++;
    }
  }

  // 计算所有行的y坐标
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

  // 计算元素位置
  calculatePosition(start, end, row, rowHeight) {
    // 更新行高
    const prevBoxInfo = this.rowBoxInfo.get(row) || { height: 0 };
    const boxHeight = Math.max(prevBoxInfo.height, rowHeight);
    this.rowBoxInfo.set(row, { height: boxHeight });

    // 计算最小行高
    const minRowHeight =
      boxHeight + this.config.minAnnotationHeight + this.config.textSpacing;
    const prevRowHeight = this.rowHeights.get(row) || 0;

    // 更新行高
    if (!this.rowHeights.has(row) || prevRowHeight < minRowHeight) {
      this.rowHeights.set(row, minRowHeight);
      this.recalcRowYs();
    }

    // 使用锁定的y坐标（如果已锁定）
    const y = this.boxLayoutLocked
      ? this.lockedRowYs.get(row) || 0
      : this.rowYs.get(row) || 0;

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
    // 如果文本不需要避让，直接返回框内位置
    if (!isTruncated) {
      return {
        x: boxPosition.x + boxPosition.width / 2,
        y: boxPosition.y + boxPosition.height / 2,
        text,
        width: boxPosition.width,
        height: this.config.textHeight,
      };
    }

    // 只做位置计算，返回textNode对象，不再管理textNodes和力模拟
    return {
      text: text,
      width: boxPosition.width,
      height: this.config.textHeight,
      x: boxPosition.x + boxPosition.width / 2 + this.config.textBoxMargin,
      y:
        boxPosition.y +
        boxPosition.height +
        this.config.textHeight / 2 +
        this.config.textBoxMargin,
      targetX:
        boxPosition.x + boxPosition.width / 2 + this.config.textBoxMargin,
      targetY:
        boxPosition.y +
        boxPosition.height +
        this.config.textHeight / 2 +
        this.config.textBoxMargin,
      box: boxPosition,
      isTruncated: isTruncated,
    };
  }

  // 锁定布局
  lockBoxLayout() {
    this.boxLayoutLocked = true;
    this.lockedRowYs = new Map(this.rowYs);
  }

  // 解锁布局
  unlockBoxLayout() {
    this.boxLayoutLocked = false;
  }

  // 停止指定行的模拟
  stopSimulation(row) {
    const simulation = this.rowSimulations.get(row);
    if (simulation) {
      simulation.stop();
      this.simulationRunning.set(row, false);
    }
  }

  // 启动指定行的模拟
  startSimulation(row) {
    const simulation = this.rowSimulations.get(row);
    if (simulation) {
      simulation.alpha(1).restart();
      this.simulationRunning.set(row, true);
    }
  }

  // 重置布局
  reset() {
    this.occupiedRows.clear();
    this.rowBoxInfo.clear();
    this.rowYs.clear();
    this.rowTextNodes.clear();
    this.rowHeights.clear();
    this.lockedRowYs.clear();
    this.boxLayoutLocked = false;
    this.simulationRunning.clear();

    // 停止所有模拟器
    this.rowSimulations.forEach((simulation) => {
      simulation.stop();
    });
    this.rowSimulations.clear();
  }

  // 静态方法：按跨度贪心分配行号
  static assignRowsBySpan(
    items,
    getStart = (d) => d.start,
    getEnd = (d) => d.end
  ) {
    // 1. 按跨度降序排序
    const sorted = [...items].sort(
      (a, b) => getEnd(b) - getStart(b) - (getEnd(a) - getStart(a))
    );
    const rows = []; // 每行存放已分配的区间

    sorted.forEach((item) => {
      let assigned = false;
      for (let row = 0; ; row++) {
        if (!rows[row]) rows[row] = [];
        // 检查该行是否有重叠
        const overlap = rows[row].some(
          (other) =>
            !(getEnd(item) < getStart(other) || getStart(item) > getEnd(other))
        );
        if (!overlap) {
          item._row = row;
          rows[row].push(item);
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        item._row = rows.length;
        rows.push([item]);
      }
    });
    return sorted;
  }
}

export default SimpleLayoutManager;
