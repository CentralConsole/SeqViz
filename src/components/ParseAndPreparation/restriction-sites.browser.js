// ESM browser-friendly restriction sites annotator

import { STANDARD_SITE_STRING } from "./enzymes/standard-sites.js";

function parseStandardSites(siteString) {
  const items = siteString.split(",").map((s) => s.trim()).filter(Boolean);
  const parsed = [];
  for (const item of items) {
    const reMatch = item.match(/\/(.+)\//);
    const metaMatch = item.match(/\(([^\)]+)\)(\d+)/);
    if (!reMatch || !metaMatch) continue;
    const recognitionRe = reMatch[1];
    const meta = metaMatch[1];
    const cutDistance = parseInt(metaMatch[2], 10);
    const parts = meta.split(/\s+/);
    const enzyme = parts[0];
    const cutPattern = parts[1];
    const recognition = cutPattern.replace("|", "");
    parsed.push({ enzyme, recognitionRe, cutDistance, cutPattern, recognition });
  }
  return parsed;
}

function degenerateToRegExp(pattern) {
  let p = pattern
    .replace(/t/g, "[TU]")
    .replace(/r/g, "[AGR]")
    .replace(/y/g, "[CTUY]")
    .replace(/s/g, "[GCS]")
    .replace(/w/g, "[ATUW]")
    .replace(/k/g, "[GTUK]")
    .replace(/m/g, "[ACM]")
    .replace(/b/g, "[CGTUBSKY]")
    .replace(/d/g, "[AGTUDRKW]")
    .replace(/h/g, "[ACTUHMYW]")
    .replace(/v/g, "[ACGVSMR]")
    .replace(/n/g, "[ACGTURYSWKMBDHVN]");
  return new RegExp(p, "gi");
}

function classifyOverhang(cutPattern) {
  const [left, right] = cutPattern.split("|");
  if (!left || !right) return { type: "unknown", overhangLength: 0 };
  if (left.length === right.length) return { type: "blunt", overhangLength: 0 };
  return {
    type: left.length < right.length ? "sticky-5" : "sticky-3",
    overhangLength: Math.abs(left.length - right.length),
  };
}

export function annotateRestrictionSites(sequence, options = { topology: "linear" }) {
  const seq = (sequence || "").toUpperCase();
  const isCircular = options?.topology === "circular";
  const lookAhead = 50;
  const db = parseStandardSites(STANDARD_SITE_STRING);
  const results = [];

  let searchSeq = seq;
  let shiftValue = 0;
  if (isCircular) {
    const head = seq.slice(0, lookAhead);
    const tail = seq.slice(-lookAhead);
    searchSeq = tail + seq + head;
    shiftValue = head.length;
  }

  for (const enzyme of db) {
    const rx = degenerateToRegExp(enzyme.recognitionRe);
    let m;
    while ((m = rx.exec(searchSeq)) !== null) {
      const matchIndex = m.index;
      const matchLen = m[0].length;
      const lastIndex = matchIndex + matchLen;
      const cutPos0 = lastIndex - enzyme.cutDistance;
      const posInSeq0 = cutPos0 - shiftValue;
      if (!isCircular) {
        if (posInSeq0 < 0 || posInSeq0 >= seq.length) continue;
      }
      const pos1 = ((posInSeq0 % seq.length) + seq.length) % seq.length;
      const recogSeq = searchSeq.slice(matchIndex, matchIndex + matchLen);
      const cutIdx = enzyme.cutPattern.indexOf("|");
      const leftLen = cutIdx;
      const overhangInfo = classifyOverhang(enzyme.cutPattern);
      const leftPart = recogSeq.slice(0, leftLen);
      const rightPart = recogSeq.slice(leftLen);
      const overhangSeq = overhangInfo.overhangLength
        ? leftPart.length < rightPart.length
          ? rightPart.slice(0, overhangInfo.overhangLength)
          : leftPart.slice(-overhangInfo.overhangLength)
        : "";
      results.push({
        enzyme: enzyme.enzyme,
        recognition: enzyme.recognition,
        cutPattern: enzyme.cutPattern,
        position: pos1 + 1,
        cutIndexInRecognition: cutIdx,
        cutDistance: enzyme.cutDistance,
        type: overhangInfo.type,
        overhangLength: overhangInfo.overhangLength,
        overhangSeq: overhangSeq.toLowerCase(),
      });
      rx.lastIndex = matchIndex + 1;
    }
  }
  results.sort((a, b) => a.position - b.position || a.enzyme.localeCompare(b.enzyme));
  return results;
}


