/**
 * @file SelectionContext.jsx
 * @description 全局选区状态管理上下文
 * 主要职责：
 * 1. 管理序列查看器中的选区状态
 * 2. 提供选区数据的增删改查功能
 * 3. 支持不同视图模式间的选区同步
 * 4. 提供选区事件监听和通知机制
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
} from "react";

// 选区状态类型定义
const SELECTION_TYPES = {
  LINEAR: "linear",
  CIRCULAR: "circular",
  NONE: "none",
};

// 选区数据结构
const createSelection = (type, data) => ({
  id: Date.now() + Math.random(), // 唯一ID
  type, // 选区类型
  data, // 选区数据
  timestamp: Date.now(), // 创建时间
  active: true, // 是否激活
});

// 坐标转换工具函数
const convertLinearToCircular = (linearData, totalLength) => {
  if (!linearData || !totalLength) return null;

  const { start, end } = linearData;
  const startAngle = (start / totalLength) * 2 * Math.PI;
  const endAngle = (end / totalLength) * 2 * Math.PI;
  const arcLength = ((end - start) / totalLength) * 2 * Math.PI;

  return {
    startAngle,
    endAngle,
    arcLength: (arcLength * 180) / Math.PI, // 转换为度数
    innerRadius: 100, // 默认值，实际渲染时会调整
    outerRadius: 200, // 默认值，实际渲染时会调整
    direction: 1, // 默认顺时针
  };
};

const convertCircularToLinear = (circularData, totalLength) => {
  if (!circularData || !totalLength) return null;

  const { startAngle, endAngle } = circularData;
  const start = (startAngle / (2 * Math.PI)) * totalLength;
  const end = (endAngle / (2 * Math.PI)) * totalLength;

  return {
    start: Math.floor(start),
    end: Math.ceil(end),
    startX: 0, // 实际渲染时会计算
    endX: 0, // 实际渲染时会计算
    width: 0, // 实际渲染时会计算
  };
};

// 初始状态
const initialState = {
  selections: [], // 所有选区
  activeSelection: null, // 当前激活的选区
  selectionMode: SELECTION_TYPES.NONE, // 当前选区模式
  isSelecting: false, // 是否正在选择
  selectionHistory: [], // 选区历史记录
  maxHistorySize: 10, // 最大历史记录数量
  sequenceLength: 0, // 序列总长度，用于坐标转换
};

// Action types
const SELECTION_ACTIONS = {
  START_SELECTION: "START_SELECTION",
  UPDATE_SELECTION: "UPDATE_SELECTION",
  END_SELECTION: "END_SELECTION",
  CLEAR_SELECTION: "CLEAR_SELECTION",
  CLEAR_ALL_SELECTIONS: "CLEAR_ALL_SELECTIONS",
  SET_ACTIVE_SELECTION: "SET_ACTIVE_SELECTION",
  REMOVE_SELECTION: "REMOVE_SELECTION",
  SET_SELECTION_MODE: "SET_SELECTION_MODE",
  ADD_TO_HISTORY: "ADD_TO_HISTORY",
  CLEAR_HISTORY: "CLEAR_HISTORY",
  SET_SEQUENCE_LENGTH: "SET_SEQUENCE_LENGTH",
};

// Reducer function
const selectionReducer = (state, action) => {
  switch (action.type) {
    case SELECTION_ACTIONS.START_SELECTION:
      return {
        ...state,
        isSelecting: true,
        selectionMode: action.mode,
      };

    case SELECTION_ACTIONS.UPDATE_SELECTION:
      if (!state.isSelecting) return state;

      const updatedSelections = state.selections.map((selection) =>
        selection.id === state.activeSelection?.id
          ? { ...selection, data: { ...selection.data, ...action.data } }
          : selection
      );

      return {
        ...state,
        selections: updatedSelections,
      };

    case SELECTION_ACTIONS.END_SELECTION:
      if (!state.isSelecting || !action.data) return state;

      const newSelection = createSelection(state.selectionMode, action.data);
      const newSelections = [...state.selections, newSelection];

      // 添加到历史记录
      const newHistory = [newSelection, ...state.selectionHistory].slice(
        0,
        state.maxHistorySize
      );

      return {
        ...state,
        selections: newSelections,
        activeSelection: newSelection,
        isSelecting: false,
        selectionMode: SELECTION_TYPES.NONE,
        selectionHistory: newHistory,
      };

    case SELECTION_ACTIONS.CLEAR_SELECTION:
      return {
        ...state,
        activeSelection: null,
        isSelecting: false,
        selectionMode: SELECTION_TYPES.NONE,
      };

    case SELECTION_ACTIONS.CLEAR_ALL_SELECTIONS:
      return {
        ...state,
        selections: [],
        activeSelection: null,
        isSelecting: false,
        selectionMode: SELECTION_TYPES.NONE,
      };

    case SELECTION_ACTIONS.SET_ACTIVE_SELECTION:
      const selection = state.selections.find((s) => s.id === action.id);
      return {
        ...state,
        activeSelection: selection || null,
      };

    case SELECTION_ACTIONS.REMOVE_SELECTION:
      const filteredSelections = state.selections.filter(
        (s) => s.id !== action.id
      );
      const newActiveSelection =
        state.activeSelection?.id === action.id ? null : state.activeSelection;

      return {
        ...state,
        selections: filteredSelections,
        activeSelection: newActiveSelection,
      };

    case SELECTION_ACTIONS.SET_SELECTION_MODE:
      return {
        ...state,
        selectionMode: action.mode,
      };

    case SELECTION_ACTIONS.ADD_TO_HISTORY:
      const historySelection = createSelection(action.mode, action.data);
      const updatedHistory = [
        historySelection,
        ...state.selectionHistory,
      ].slice(0, state.maxHistorySize);

      return {
        ...state,
        selectionHistory: updatedHistory,
      };

    case SELECTION_ACTIONS.CLEAR_HISTORY:
      return {
        ...state,
        selectionHistory: [],
      };

    case SELECTION_ACTIONS.SET_SEQUENCE_LENGTH:
      return {
        ...state,
        sequenceLength: action.length,
      };

    default:
      return state;
  }
};

// Context
const SelectionContext = createContext();

// Provider component
export const SelectionProvider = ({ children }) => {
  const [state, dispatch] = useReducer(selectionReducer, initialState);

  // Action creators
  const startSelection = useCallback((mode) => {
    console.log("SelectionContext: startSelection called", { mode });
    dispatch({ type: SELECTION_ACTIONS.START_SELECTION, mode });
  }, []);

  const updateSelection = useCallback((data) => {
    dispatch({ type: SELECTION_ACTIONS.UPDATE_SELECTION, data });
  }, []);

  const endSelection = useCallback((data) => {
    console.log("SelectionContext: endSelection called", { data });
    dispatch({ type: SELECTION_ACTIONS.END_SELECTION, data });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: SELECTION_ACTIONS.CLEAR_SELECTION });
  }, []);

  const clearAllSelections = useCallback(() => {
    dispatch({ type: SELECTION_ACTIONS.CLEAR_ALL_SELECTIONS });
  }, []);

  const setActiveSelection = useCallback((id) => {
    dispatch({ type: SELECTION_ACTIONS.SET_ACTIVE_SELECTION, id });
  }, []);

  const removeSelection = useCallback((id) => {
    dispatch({ type: SELECTION_ACTIONS.REMOVE_SELECTION, id });
  }, []);

  const setSelectionMode = useCallback((mode) => {
    dispatch({ type: SELECTION_ACTIONS.SET_SELECTION_MODE, mode });
  }, []);

  const addToHistory = useCallback((mode, data) => {
    dispatch({ type: SELECTION_ACTIONS.ADD_TO_HISTORY, mode, data });
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({ type: SELECTION_ACTIONS.CLEAR_HISTORY });
  }, []);

  const setSequenceLength = useCallback((length) => {
    dispatch({ type: SELECTION_ACTIONS.SET_SEQUENCE_LENGTH, length });
  }, []);

  // 计算选区统计信息
  const getSelectionStats = useCallback(() => {
    const totalSelections = state.selections.length;
    const activeSelections = state.selections.filter((s) => s.active).length;
    const selectionsByType = state.selections.reduce((acc, selection) => {
      acc[selection.type] = (acc[selection.type] || 0) + 1;
      return acc;
    }, {});

    return {
      totalSelections,
      activeSelections,
      selectionsByType,
      hasActiveSelection: !!state.activeSelection,
      isSelecting: state.isSelecting,
    };
  }, [state.selections, state.activeSelection, state.isSelecting]);

  // 根据位置查找选区
  const findSelectionByPosition = useCallback(
    (position, tolerance = 5) => {
      return state.selections.find((selection) => {
        if (selection.type === SELECTION_TYPES.LINEAR) {
          const { start, end } = selection.data;
          return position >= start - tolerance && position <= end + tolerance;
        } else if (selection.type === SELECTION_TYPES.CIRCULAR) {
          const { startAngle, endAngle } = selection.data;
          // 处理圆形选区的角度范围
          const normalizedPosition = position % (2 * Math.PI);
          const normalizedStart = startAngle % (2 * Math.PI);
          const normalizedEnd = endAngle % (2 * Math.PI);

          if (normalizedStart <= normalizedEnd) {
            return (
              normalizedPosition >= normalizedStart - tolerance &&
              normalizedPosition <= normalizedEnd + tolerance
            );
          } else {
            // 跨越0度的情况
            return (
              normalizedPosition >= normalizedStart - tolerance ||
              normalizedPosition <= normalizedEnd + tolerance
            );
          }
        }
        return false;
      });
    },
    [state.selections]
  );

  // 获取当前视图的选区数据
  const getSelectionsForView = useCallback(
    (viewType) => {
      if (!state.sequenceLength) return state.selections;

      return state.selections.map((selection) => {
        if (selection.type === viewType) {
          return selection;
        }

        // 转换选区类型
        if (
          selection.type === SELECTION_TYPES.LINEAR &&
          viewType === SELECTION_TYPES.CIRCULAR
        ) {
          const circularData = convertLinearToCircular(
            selection.data,
            state.sequenceLength
          );
          return {
            ...selection,
            type: SELECTION_TYPES.CIRCULAR,
            data: circularData,
          };
        } else if (
          selection.type === SELECTION_TYPES.CIRCULAR &&
          viewType === SELECTION_TYPES.LINEAR
        ) {
          const linearData = convertCircularToLinear(
            selection.data,
            state.sequenceLength
          );
          return {
            ...selection,
            type: SELECTION_TYPES.LINEAR,
            data: linearData,
          };
        }

        return selection;
      });
    },
    [state.selections, state.sequenceLength]
  );

  const contextValue = {
    // State
    ...state,

    // Actions
    startSelection,
    updateSelection,
    endSelection,
    clearSelection,
    clearAllSelections,
    setActiveSelection,
    removeSelection,
    setSelectionMode,
    addToHistory,
    clearHistory,
    setSequenceLength,

    // Utilities
    getSelectionStats,
    findSelectionByPosition,
    getSelectionsForView,

    // Constants
    SELECTION_TYPES,
  };

  return (
    <SelectionContext.Provider value={contextValue}>
      {children}
    </SelectionContext.Provider>
  );
};

// Hook to use selection context
export const useSelection = () => {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }
  return context;
};

// Export constants for external use
export { SELECTION_TYPES, SELECTION_ACTIONS };
