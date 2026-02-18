/**
 * @file useContainerDimensions.js
 * @description Hook for measuring container size and reacting to resize.
 * Single responsibility: expose containerRef and dimensions.
 */

import { useEffect, useState, useRef, useCallback } from "react";

/**
 * @returns {{ containerRef: React.RefObject, dimensions: { width: number, height: number }, updateDimensions: () => void }}
 */
export function useContainerDimensions() {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      setDimensions({ width, height });
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [updateDimensions]);

  return { containerRef, dimensions, updateDimensions };
}
