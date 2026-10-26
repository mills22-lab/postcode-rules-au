// @ts-check
import {
  addressInScope,
  normaliseConfig,
  parsePostcode,
  postcodeInRanges,
  rateMatches,
} from "./au-rules.js";

export function cartDeliveryOptionsTransformRun(input) {
  const raw = input?.deliveryCustomization?.metafield?.jsonValue;
  const cfg = normaliseConfig(raw);
  if (!raw || cfg.enabled === false) return { operations: [] };

  const hasRemoteRule = cfg.remotePostcodeRanges.length > 0 && cfg.remoteHideRates.length > 0;
  const hasMetroRule = cfg.metroPostcodeRanges.length > 0 && cfg.metroOnlyRates.length > 0;
  if (!hasRemoteRule && !hasMetroRule) return { operations: [] };

  const operations = [];
  const hidden = new Set();

  for (const group of input?.cart?.deliveryGroups || []) {
    const address = group?.deliveryAddress;
    if (!address || !addressInScope(address, cfg)) continue;
    const postcode = parsePostcode(address.zip);
    if (postcode === null) continue;

    const isRemote = hasRemoteRule && postcodeInRanges(postcode, cfg.remotePostcodeRanges);
    const isMetro = hasMetroRule && postcodeInRanges(postcode, cfg.metroPostcodeRanges);

    for (const option of group.deliveryOptions || []) {
      if (!option?.handle || hidden.has(option.handle)) continue;
      let hide = false;
      if (isRemote && rateMatches(option.title, cfg.remoteHideRates)) hide = true;
      if (hasMetroRule && !isMetro && rateMatches(option.title, cfg.metroOnlyRates)) hide = true;
      if (hide) {
        hidden.add(option.handle);
        operations.push({ deliveryOptionHide: { deliveryOptionHandle: option.handle } });
      }
    }

    // Never hide every option
    const remaining = (group.deliveryOptions || []).filter((o) => !hidden.has(o.handle));
    if (remaining.length === 0) {
      for (const o of group.deliveryOptions || []) hidden.delete(o.handle);
      for (let i = operations.length - 1; i >= 0; i--) {
        const h = operations[i].deliveryOptionHide.deliveryOptionHandle;
        if ((group.deliveryOptions || []).some((o) => o.handle === h)) operations.splice(i, 1);
      }
    }
  }

  return { operations };
}
