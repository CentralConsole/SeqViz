/**
 * @file SelectionContext.jsx
 * @description 全局选区状态管理上下文（简化版）
 * 主要职责：
 * 1. 管理当前选区状态（每个视图只有一个选区）
 * 2. 支持不同视图模式间的选区同步
 * 3. 提供选区操作：开始、更新、结束、清除
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
} from "react";

// Selection type definitions
const SELECTION_TYPES = {
  LINEAR: "linear",
  CIRCULAR: "circular",
  DETAILED: "detailed",
  NONE: "none",
};

// Coordinate conversion utilities
const convertLinearToCircular = (linearData, totalLength) => {
  if (!linearData || !totalLength) return null;

  const { start, end } = linearData;
  const startAngle = (start / totalLength) * 2 * Math.PI;
  const endAngle = (end / totalLength) * 2 * Math.PI;
  const arcLength = ((end - start) / totalLength) * 2 * Math.PI;

  return {
    startAngle,
    endAngle,
    arcLength: (arcLength * 180) / Math.PI, // Convert to degrees
    innerRadius: 100, // Default, will be adjusted during rendering
    outerRadius: 200, // Default, will be adjusted during rendering
    direction: 1, // Default clockwise
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
    startX: 0,
    endX: 0,
    width: 0,
  };
};

// Initial state
const initialState = {
  currentSelection: null, // Current selection object: { type, data }
  selectionMode: SELECTION_TYPES.NONE, // Current selection mode
  isSelecting: false, // Whether user is currently selecting
  sequenceLength: 0, // Total sequence length for coordinate conversion
};

// Action types
const SELECTION_ACTIONS = {
  START_SELECTION: "START_SELECTION",
  UPDATE_SELECTION: "UPDATE_SELECTION",
  END_SELECTION: "END_SELECTION",
  CLEAR_SELECTION: "CLEAR_SELECTION",
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
        currentSelection: null, // Clear previous selection when starting new one
      };

    case SELECTION_ACTIONS.UPDATE_SELECTION: {
      if (!state.isSelecting) return state;

      // Update current selection data during drag
      return {
        ...state,
        currentSelection: {
          type: state.selectionMode,
          data: action.data,
        },
      };
    }

    case SELECTION_ACTIONS.END_SELECTION: {
      if (!state.isSelecting || !action.data) return state;

      // Finalize the selection
      return {
        ...state,
        currentSelection: {
          type: state.selectionMode,
          data: action.data,
        },
        isSelecting: false,
        selectionMode: SELECTION_TYPES.NONE,
      };
    }

    case SELECTION_ACTIONS.CLEAR_SELECTION:
      return {
        ...state,
        currentSelection: null,
        isSelecting: false,
        selectionMode: SELECTION_TYPES.NONE,
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
    dispatch({ type: SELECTION_ACTIONS.START_SELECTION, mode });
  }, []);

  const updateSelection = useCallback((data) => {
    dispatch({ type: SELECTION_ACTIONS.UPDATE_SELECTION, data });
  }, []);

  const endSelection = useCallback((data) => {
    dispatch({ type: SELECTION_ACTIONS.END_SELECTION, data });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: SELECTION_ACTIONS.CLEAR_SELECTION });
  }, []);

  const setSequenceLength = useCallback((length) => {
    dispatch({ type: SELECTION_ACTIONS.SET_SEQUENCE_LENGTH, length });
  }, []);

  // Get selection for current view (with coordinate conversion if needed)
  const getSelectionForView = useCallback(
    (viewType) => {
      if (!state.currentSelection) return null;

      // If selection type matches view type, return as is
      if (state.currentSelection.type === viewType) {
        return state.currentSelection;
      }

      // Convert selection type
      if (
        state.currentSelection.type === SELECTION_TYPES.LINEAR &&
        viewType === SELECTION_TYPES.CIRCULAR
      ) {
        const circularData = convertLinearToCircular(
          state.currentSelection.data,
          state.sequenceLength
        );
        if (!circularData) return null;
        return {
          type: SELECTION_TYPES.CIRCULAR,
          data: circularData,
        };
      } else if (
        state.currentSelection.type === SELECTION_TYPES.CIRCULAR &&
        viewType === SELECTION_TYPES.LINEAR
      ) {
        const linearData = convertCircularToLinear(
          state.currentSelection.data,
          state.sequenceLength
        );
        if (!linearData) return null;
        return {
          type: SELECTION_TYPES.LINEAR,
          data: linearData,
        };
      }

      return null;
    },
    [state.currentSelection, state.sequenceLength]
  );

  // For backward compatibility: return array with single selection or empty array
  const getSelectionsForView = useCallback(
    (viewType) => {
      const selection = getSelectionForView(viewType);
      return selection ? [selection] : [];
    },
    [getSelectionForView]
  );

  const contextValue = {
    // State
    currentSelection: state.currentSelection,
    selectionMode: state.selectionMode,
    isSelecting: state.isSelecting,
    sequenceLength: state.sequenceLength,

    // Actions
    startSelection,
    updateSelection,
    endSelection,
    clearSelection,
    setSequenceLength,

    // Utilities
    getSelectionForView,
    getSelectionsForView, // Backward compatibility

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
export { SELECTION_TYPES };
