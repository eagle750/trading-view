/** "NA" = do not apply this criterion */
export const OPTIONS_MARKET_CAP = ["NA", "> ₹5Cr", "> ₹10Cr", "custom"] as const;
export const OPTIONS_GROWTH = ["NA", ">5%", ">10%", "custom"] as const;
export const OPTIONS_DEBT = ["NA", "<1", "<2", "custom"] as const;
export const OPTIONS_PROMOTER = ["NA", ">30%", ">50%", "custom"] as const;
export const OPTIONS_FII = ["NA", ">10%", ">30%", "custom"] as const;
export const OPTIONS_ROE = ["NA", ">5%", ">10%", "custom"] as const;
export const OPTIONS_PE = [
  "NA",
  "sector-relative",
  "< sector",
  "> sector",
  "custom",
] as const;
export const OPTIONS_LAST2Q = ["NA", ">5%", ">10%"] as const;
