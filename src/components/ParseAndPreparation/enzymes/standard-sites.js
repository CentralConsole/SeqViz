// Reduced restriction enzyme site table - Selected enzymes only
// Format: /recognition_pattern/ (EnzymeName cut|pattern)cutDistance

const STANDARD_SITE_STRING =
  // Acc65I
  "/ggtacc/ (Acc65I g|gtacc)5," +
  // AccI
  "/gt[cty][agr]ac/ (AccI gty|rac)3," +
  // AflII
  "/cttaag/ (AflII c|ttaag)5," +
  // AlwNI
  "/cagctg/ (AlwNI cag|ctg)3," +
  // AscI
  "/ggcgcgcc/ (AscI gg|cgcgcc)6," +
  // AseI
  "/attaat/ (AseI at|taat)4," +
  // BclI
  "/tgatca/ (BclI t|gatca)5," +
  // BmtI
  "/gctagc/ (BmtI gctag|c)1," +
  // Bsu36I
  "/ccatgg/ (Bsu36I c|catgg)5," +
  // Eco53kI
  "/gagctc/ (Eco53kI gagct|c)1," +
  // EcoRV
  "/gatatc/ (EcoRV gat|atc)3," +
  // FseI
  "/ggccggcc/ (FseI ggccgg|cc)2," +
  // HincII
  "/gt[cty][agr]ac/ (HincII gty|rac)3," +
  // KpnI
  "/ggtacc/ (KpnI ggtac|c)1," +
  // MfeI
  "/caattg/ (MfeI c|aattg)5," +
  // MluI
  "/acgcgt/ (MluI a|cgcgt)5," +
  // NheI
  "/gctagc/ (NheI g|ctagc)5," +
  // PIM1 (same as PmlI)
  "/cacgtg/ (PIM1 cac|gtg)3," +
  // PmlI
  "/cacgtg/ (PmlI cac|gtg)3," +
  // PshAI
  "/gacnnnnngtc/ (PshAI gacnnn|nngtc)5," +
  // PvuI
  "/cgatcg/ (PvuI cgat|cg)2," +
  // RsrII
  "/cgatcg/ (RsrII cg|atcg)4," +
  // SacI
  "/gagctc/ (SacI gagct|c)1," +
  // SalI
  "/gtcgac/ (SalI g|tcgac)5," +
  // ScaI
  "/agtact/ (ScaI agt|act)3," +
  // SphI
  "/gcatgc/ (SphI gcatg|c)1," +
  // XbaI
  "/tctaga/ (XbaI t|ctaga)5,"; //+
// XcmI
// "/ccan[acgturyswkmbdhvn][acgturyswkmbdhvn][acgturyswkmbdhvn][acgturyswkmbdhvn][acgturyswkmbdhvn][acgturyswkmbdhvn][acgturyswkmbdhvn]tgg/ (XcmI ccannnnnnnn|ntgg)7";

export { STANDARD_SITE_STRING };

// CommonJS compatibility (Node usage)
// eslint-disable-next-line no-undef
if (typeof module !== "undefined" && module.exports) {
  // eslint-disable-next-line no-undef
  module.exports = { STANDARD_SITE_STRING };
}
