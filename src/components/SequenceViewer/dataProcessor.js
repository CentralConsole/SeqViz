/**
 * @file dataProcessor.js
 * @description GenBank text parsing and restriction-site annotation.
 * Single responsibility: convert GBK text to normalized JSON for the viewer.
 */

import { parseGenbankText } from "../ParseAndPreparation/parse-genbank-input/browser-genbank-parser";
import { annotateRestrictionSites } from "../ParseAndPreparation/enzymes/restriction-sites.browser";

/**
 * Parse GenBank text and annotate restriction sites.
 * @param {string} gbkText - GenBank text
 * @returns {Object} Normalized data (locus, features, origin, res_site, etc.)
 * @throws {Error} When gbkText is invalid
 */
export function processGenBankData(gbkText) {
  if (!gbkText || typeof gbkText !== "string") {
    throw new Error("Invalid GenBank text input");
  }

  const parsed = parseGenbankText(gbkText);

  const normalized = {
    locus: parsed.locus || {},
    definition: parsed.definition || "",
    accession: parsed.accession || "",
    version: parsed.version || "",
    dblink: parsed.dblink || "",
    keywords: parsed.keywords || "",
    source: parsed.source || "",
    reference: parsed.reference || "",
    comment: parsed.comment || "",
    features: parsed.features || [],
    origin: parsed.origin || "",
    res_site: parsed.res_site || [],
  };

  try {
    if (
      normalized.origin &&
      (!normalized.res_site || normalized.res_site.length === 0)
    ) {
      const topology = (normalized.locus?.topology || "").toLowerCase();
      const isCircular = topology.includes("circular");
      const sites = annotateRestrictionSites(normalized.origin, {
        topology: isCircular ? "circular" : "linear",
      });
      normalized.res_site = sites;
    }
  } catch (e) {
    if (typeof console !== "undefined" && console.warn) {
      console.warn("Failed to annotate restriction sites:", e);
    }
    normalized.res_site = normalized.res_site || [];
  }

  return normalized;
}
