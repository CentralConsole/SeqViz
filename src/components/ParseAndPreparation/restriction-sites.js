/* eslint-env node */
/* global require, module */
/* eslint-disable no-useless-escape */
// Description: Compute restriction enzyme cut sites on a DNA sequence.
// Ported minimal logic from SMS (Sequence Manipulation Suite) to Node.
// Reference patterns from sms_restriction_sites.js (GPL-3.0 licensed).

const { STANDARD_SITE_STRING } = require("./enzymes/standard-sites.js");

/*
const STANDARD_SITE_STRING =
  "/aggcct/ (AatI agg|cct)3," +
  "/gacgtc/ (AatII gacgt|c)1," +
  "/tgcgca/ (Acc16I tgc|gca)3," +
  "/cgcg/ (AccII cg|cg)2," +
  "/tccgga/ (AccIII t|ccgga)5," +
  "/aacgtt/ (AclI aa|cgtt)4," +
  "/cacgtg/ (AcvI cac|gtg)3," +
  "/gtac/ (AfaI gt|ac)2," +
  "/agcgct/ (AfeI agc|gct)3," +
  "/cttaag/ (AflII c|ttaag)5," +
  "/accggt/ (AgeI a|ccggt)5," +
  "/actagt/ (AhlI a|ctagt)5," +
  "/gtgcac/ (Alw441 g|tgcac)5," +
  "/agct/ (AluI ag|ct)2," +
  "/agcgct/ (Aor51HI agc|gct)3," +
  "/gggccc/ (ApaI gggcc|c)1," +
  "/gtgcac/ (ApaLI g|tgcac)5," +
  "/ggcgcgcc/ (AscI gg|cgcgcc)6," +
  "/attaat/ (AseI at|taat)4," +
  "/ggtacc/ (Asp718I g|gtacc)5," +
  "/ttcgaa/ (AsuII tt|cgaa)4," +
  "/c[cty]cg[agr]g/ (AvaI c|ycgrg)5," +
  "/tgcgca/ (AviII tgc|gca)3," +
  "/cctagg/ (AvrII c|ctagg)5," +
  "/tggcca/ (BalI tgg|cca)3," +
  "/ggatcc/ (BamHI g|gatcc)5," +
  "/atcgat/ (BanIII at|cgat)4," +
  "/ggcgcc/ (BbeI ggcgc|c)1," +
  "/cacgtg/ (BbrPI cac|gtg)3," +
  "/gcatgc/ (BbuI gcatg|c)1," +
  "/actagt/ (BcuI a|ctagt)5," +
  "/tgatca/ (BclI t|gatca)5," +
  "/ctag/ (BfaI c|tag)3," +
  "/cttaag/ (BfrI c|ttaag)5," +
  "/atgcat/ (BfrBI atg|cat)3," +
  "/agatct/ (BglII a|gatct)5," +
  "/cctagg/ (BlnI c|ctagg)5," +
  "/atcgat/ (BseCI at|cgat)4," +
  "/gcgcgc/ (BsePI g|cgcgc)5," +
  "/cggccg/ (BseX3I c|ggccg)5," +
  "/accggt/ (BshTI a|ccggt)5," +
  "/tgtaca/ (Bsp1407I t|gtaca)5," +
  "/ccatgg/ (Bsp19I c|catgg)5," +
  "/atcgat/ (BspDI at|cgat)4," +
  "/tccgga/ (BspEI t|ccgga)5," +
  "/tgtaca/ (BsrGI t|gtaca)5," +
  "/gcgcgc/ (BssHII g|cgcgc)5," +
  "/cgcg/ (BstUI cg|cg)2," +
  "/atcgat/ (ClaI at|cgat)4," +
  "/gatc/ (DpnII |gatc)4," +
  "/tttaaa/ (DraI ttt|aaa)3," +
  "/cggccg/ (EagI c|ggccg)5," +
  "/gaattc/ (EcoRI g|aattc)5," +
  "/gatatc/ (EcoRV gat|atc)3," +
  "/ggcgcc/ (EgeI ggc|gcc)3," +
  "/ggccggcc/ (FseI ggccgg|cc)2," +
  "/tgcgca/ (FspI tgc|gca)3," +
  "/ggcc/ (HaeIII gg|cc)2," +
  "/gt[cty][agr]ac/ (HincII gty|rac)3," +
  "/aagctt/ (HindIII a|agctt)5," +
  "/ga[acgturyswkmbdhvn]tc/ (HinfI g|antc)4," +
  "/gttaac/ (HpaI gtt|aac)3," +
  "/ccgg/ (HpaII c|cgg)3," +
  "/ggcgcc/ (KasI g|gcgcc)5," +
  "/ggtacc/ (KpnI ggtac|c)1," +
  "/[acgturyswkmbdhvn]gatc[acgturyswkmbdhvn]/ (MboI |gatc)5," +
  "/caattg/ (MfeI c|aattg)5," +
  "/acgcgt/ (MluI a|cgcgt)5," +
  "/tggcca/ (MscI tgg|cca)3," +
  "/ttaa/ (MseI t|taa)3," +
  "/ccgg/ (MspI c|cgg)3," +
  "/gccggc/ (NaeI gcc|ggc)3," +
  "/ggcgcc/ (NarI gg|cgcc)4," +
  "/ccatgg/ (NcoI c|catgg)5," +
  "/catatg/ (NdeI ca|tatg)4," +
  "/gatc/ (NdeII |gatc)4," +
  "/gccggc/ (NgoMIV g|ccggc)5," +
  "/gctagc/ (NheI g|ctagc)5," +
  "/catg/ (NlaIII catg|)0," +
  "/gcggccgc/ (NotI gc|ggccgc)6," +
  "/tcgcga/ (NruI tcg|cga)3," +
  "/atgcat/ (NsiI atgca|t)1," +
  "/ttaattaa/ (PacI ttaat|taa)3," +
  "/acatgt/ (PciI a|catgt)5," +
  "/ggcc/ (PhoI gg|cc)2," +
  "/gtttaaac/ (PmeI gttt|aaac)4," +
  "/cacgtg/ (PmlI cac|gtg)3," +
  "/ttataa/ (PsiI tta|taa)3," +
  "/ctgcag/ (PstI ctgca|g)1," +
  "/cgatcg/ (PvuI cgat|cg)2," +
  "/cagctg/ (PvuII cag|ctg)3," +
  "/gtac/ (RsaI gt|ac)2," +
  "/gagctc/ (SacI gagct|c)1," +
  "/ccgcgg/ (SacII ccgc|gg)2," +
  "/gtcgac/ (SalI g|tcgac)5," +
  "/cctgcagg/ (SbfI cctgca|gg)2," +
  "/agtact/ (ScaI agt|act)3," +
  "/ggcgcc/ (SfoI ggc|gcc)3," +
  "/cccggg/ (SmaI ccc|ggg)3," +
  "/tacgta/ (SnaBI tac|gta)3," +
  "/actagt/ (SpeI a|ctagt)5," +
  "/gcatgc/ (SphI gcatg|c)1," +
  "/aatatt/ (SspI aat|att)3," +
  "/gagctc/ (SstI gagct|c)1," +
  "/ccgcgg/ (SstII ccgc|gg)2," +
  "/aggcct/ (StuI agg|cct)3," +
  "/atttaaat/ (SwaI attt|aaat)4," +
  "/tcga/ (TaqI t|cga)3," +
  "/ctcgag/ (TliI c|tcgag)5," +
  "/attaat/ (VspI at|taat)4," +
  "/tctaga/ (XbaI t|ctaga)5," +
  "/ctcgag/ (XhoI c|tcgag)5," +
  "/cccggg/ (XmaI c|ccggg)5";
*/

function parseStandardSites(siteString) {
  // Returns list of { enzyme, recognitionRe, cutDistance, cutPattern, recognition }
  const items = siteString
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const parsed = [];
  for (const item of items) {
    const reMatch = item.match(/\/(.+)\//);
    const metaMatch = item.match(/\(([^\)]+)\)(\d+)/);
    if (!reMatch || !metaMatch) continue;
    const recognitionRe = reMatch[1];
    const meta = metaMatch[1]; // e.g., "EcoRI g|aattc"
    const cutDistance = parseInt(metaMatch[2], 10);
    const parts = meta.split(/\s+/);
    const enzyme = parts[0];
    const cutPattern = parts[1]; // e.g., g|aattc or gat|atc
    const recognition = cutPattern.replace("|", "");
    parsed.push({
      enzyme,
      recognitionRe,
      cutDistance,
      cutPattern,
      recognition,
    });
  }
  return parsed;
}

function degenerateToRegExp(pattern) {
  // Lowercase degenerate bases mapping similar to SMS convertDegenerates, but into JS class ranges
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
  // Heuristic: if left side shorter, typical 5' overhang on left enzyme like EcoRI
  return {
    type: left.length < right.length ? "sticky-5" : "sticky-3",
    overhangLength: Math.abs(left.length - right.length),
  };
}

function annotateRestrictionSites(sequence, options = { topology: "linear" }) {
  const seq = sequence.toUpperCase();
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
      const matchIndex = m.index; // 0-based start
      const matchLen = m[0].length;
      const lastIndex = matchIndex + matchLen;
      const cutPos0 = lastIndex - enzyme.cutDistance; // 0-based in searchSeq
      // Map back to original sequence range
      const posInSeq0 = cutPos0 - shiftValue; // may be negative or >= seq.length in circular case
      if (!isCircular) {
        if (posInSeq0 < 0 || posInSeq0 >= seq.length) continue;
      }
      const pos1 = ((posInSeq0 % seq.length) + seq.length) % seq.length; // wrap
      // Derive recognition concrete sequence for this match
      const recogSeq = searchSeq.slice(matchIndex, matchIndex + matchLen);
      const cutIdx = enzyme.cutPattern.indexOf("|");
      const leftLen = cutIdx;
      //const rightLen = enzyme.recognition.length - cutIdx;
      const overhangInfo = classifyOverhang(enzyme.cutPattern);

      // overhang sequence (approx) from matched recognition
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
        position: pos1 + 1, // 1-based
        cutIndexInRecognition: cutIdx,
        cutDistance: enzyme.cutDistance,
        type: overhangInfo.type, // blunt | sticky-5 | sticky-3 | unknown
        overhangLength: overhangInfo.overhangLength,
        overhangSeq: overhangSeq.toLowerCase(),
      });
      // Overlapping matches: advance by 1 like SMS
      rx.lastIndex = matchIndex + 1;
    }
  }

  // Sort by position then enzyme name
  results.sort(
    (a, b) => a.position - b.position || a.enzyme.localeCompare(b.enzyme)
  );
  return results;
}

module.exports = {
  annotateRestrictionSites,
};
