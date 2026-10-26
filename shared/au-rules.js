// @ts-check
// Shared rule logic for Postcode Rules AU.
// This file is copied verbatim into each function's src/ (see scripts/sync-shared.js)
// so the functions stay self-contained for the Shopify CLI build.

/** Australian state codes as Shopify sends them in provinceCode. */
export const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"];

/**
 * Postcode ranges by state (Australia Post allocation).
 * Order matters: ACT ranges sit inside NSW numbers, so ACT is checked first.
 * @type {Array<[string, number, number]>}
 */
const STATE_RANGES = [
  ["ACT", 200, 299],
  ["ACT", 2600, 2618],
  ["ACT", 2900, 2920],
  ["NSW", 1000, 2599],
  ["NSW", 2619, 2899],
  ["NSW", 2921, 2999],
  ["VIC", 3000, 3999],
  ["VIC", 8000, 8999],
  ["QLD", 4000, 4999],
  ["QLD", 9000, 9999],
  ["SA", 5000, 5999],
  ["WA", 6000, 6797],
  ["WA", 6800, 6999],
  ["TAS", 7000, 7999],
  ["NT", 800, 999],
];

export function parsePostcode(zip) {
  if (!zip) return null;
  const digits = String(zip).trim().replace(/\s+/g, "");
  if (!/^\d{3,4}$/.test(digits)) return null;
  return Number(digits);
}

export function stateFromPostcode(postcode) {
  if (postcode === null) return null;
  for (const [state, lo, hi] of STATE_RANGES) {
    if (postcode >= lo && postcode <= hi) return state;
  }
  return null;
}

export function resolveState(address) {
  const code = (address.provinceCode || "").toUpperCase().trim();
  if (AU_STATES.includes(code)) return code;
  return stateFromPostcode(parsePostcode(address.zip));
}

export function parsePostcodeRanges(text) {
  if (!text) return [];
  const ranges = [];
  for (const raw of String(text).split(/[,\n;]+/)) {
    const token = raw.trim();
    if (!token) continue;
    const m = token.match(/^(\d{3,4})\s*(?:-|–|to)\s*(\d{3,4})$/i);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      ranges.push([Math.min(a, b), Math.max(a, b)]);
      continue;
    }
    const single = token.match(/^(\d{3,4})$/);
    if (single) {
      const n = Number(single[1]);
      ranges.push([n, n]);
    }
  }
  return ranges;
}

export function postcodeInRanges(postcode, ranges) {
  if (postcode === null) return false;
  return ranges.some(([lo, hi]) => postcode >= lo && postcode <= hi);
}

const PO_BOX_PATTERNS = [
  /\bp\.?\s*o\.?\s*box\b/i,
  /\bg\.?\s*p\.?\s*o\.?\s*box\b/i,
  /\bpost\s*office\s*box\b/i,
  /\bpo\s*b\s*\d/i,
  /\blocked\s*bag\b/i,
  /\bprivate\s*bag\b/i,
  /\bparcel\s*locker\b/i,
  /\bparcel\s*collect\b/i,
  /\bcommunity\s*mail\s*(bag|box)\b/i,
  /\bc\.?\s*m\.?\s*b\.?\s+\d/i,
  /\broadside\s*(mail|delivery)\s*(box|bag|service)\b/i,
  /\br\.?\s*m\.?\s*b\.?\s+\d/i,
  /\br\.?\s*s\.?\s*d\.?\s+\d/i,
  /\bmail\s*service\s*\d/i,
  /\bm\.?\s*s\.?\s+\d{2,}/i,
  /\bcare\s*po\b/i,
];

export function looksLikePoBox(address1, address2) {
  const text = `${address1 || ""} ${address2 || ""}`;
  return PO_BOX_PATTERNS.some((re) => re.test(text));
}

export function rateMatches(title, patterns) {
  const t = (title || "").trim().toLowerCase();
  return patterns.some((p) => {
    const pat = (p || "").trim().toLowerCase();
    if (!pat) return false;
    if (pat.endsWith("*")) return t.startsWith(pat.slice(0, -1));
    return t === pat;
  });
}

export function parseList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(/[,\n]+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

export const QUARANTINE_TAGS = [
  "quarantine",
  "quarantine-wa",
  "quarantine-tas",
  "quarantine-nt",
  "quarantine-sa",
  "quarantine-qld",
  "quarantine-vic",
  "quarantine-nsw",
  "quarantine-act",
];

export function restrictedStatesForProduct(hasTags, defaultStates) {
  const states = new Set();
  for (const { tag, hasTag } of hasTags || []) {
    if (!hasTag) continue;
    if (tag === "quarantine") {
      for (const s of defaultStates) states.add(s.toUpperCase());
    } else if (tag.startsWith("quarantine-")) {
      states.add(tag.slice("quarantine-".length).toUpperCase());
    }
  }
  return [...states];
}

export const DEFAULT_CONFIG = {
  enabled: true,
  auOnly: true,
  blockPoBoxes: false,
  poBoxMessage:
    "Sorry, we can't deliver to PO Boxes, Parcel Lockers or Locked Bags. Please enter a street address.",
  blockedStates: [],
  blockedStatesMessage: "Sorry, we don't ship to {state} yet.",
  blockedPostcodes: "",
  blockedPostcodesMessage: "Sorry, we don't deliver to postcode {postcode}.",
  quarantineStates: ["WA", "TAS", "NT"],
  quarantineMessage:
    "{product} can't be sent to {state} due to biosecurity/quarantine rules. Please remove it from your cart.",
  remotePostcodes: "",
  remoteHideRates: [],
  metroPostcodes: "",
  metroOnlyRates: [],
};

export function normaliseConfig(raw) {
  const cfg = { ...DEFAULT_CONFIG, ...(raw && typeof raw === "object" ? raw : {}) };
  cfg.blockedStates = parseList(cfg.blockedStates).map((s) => s.toUpperCase());
  cfg.quarantineStates = parseList(cfg.quarantineStates).map((s) => s.toUpperCase());
  cfg.remoteHideRates = parseList(cfg.remoteHideRates);
  cfg.metroOnlyRates = parseList(cfg.metroOnlyRates);
  cfg.blockedPostcodeRanges = parsePostcodeRanges(cfg.blockedPostcodes);
  cfg.remotePostcodeRanges = parsePostcodeRanges(cfg.remotePostcodes);
  cfg.metroPostcodeRanges = parsePostcodeRanges(cfg.metroPostcodes);
  return cfg;
}

export function fillMessage(template, values) {
  return String(template || "").replace(/\{(\w+)\}/g, (_, k) => values[k] ?? "");
}

export function addressInScope(address, cfg) {
  if (!cfg.auOnly) return true;
  const cc = (address.countryCode || "").toUpperCase();
  return cc === "" || cc === "AU";
}
