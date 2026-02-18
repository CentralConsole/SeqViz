/**
 * @file useGenomeData.js
 * @description Hook for loading and parsing genome data from props or file.
 * Single responsibility: manage genomeData, loading, error and loadFromFile.
 */

import { useEffect, useState, useCallback } from "react";
import { processGenBankData } from "./dataProcessor";

/**
 * @param {Object} options
 * @param {Object} [options.data] - Pre-loaded genome data (takes precedence)
 * @param {Function} [options.loadData] - Async loader returning GBK string or JSON
 * @returns {{ genomeData: Object|null, loading: boolean, error: Error|null, loadFromFile: (file: File) => Promise<void> }}
 */
export function useGenomeData({ data, loadData }) {
  const [genomeData, setGenomeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (data) {
          setGenomeData(data);
          return;
        }
        if (typeof loadData !== "function") {
          setGenomeData(null);
          return;
        }
        setLoading(true);
        setError(null);
        const result = await loadData();
        if (cancelled) return;

        let processedData;
        if (typeof result === "string") {
          processedData = processGenBankData(result);
        } else if (result && typeof result === "object") {
          processedData = result;
        } else {
          throw new Error("Invalid data format from loadData");
        }

        setGenomeData(processedData || null);
      } catch (e) {
        if (!cancelled) {
          setError(e);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [data, loadData]);

  const loadFromFile = useCallback(async (file) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const text = await file.text();
      const processedData = processGenBankData(text);
      setGenomeData(processedData);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  return { genomeData, loading, error, loadFromFile };
}
