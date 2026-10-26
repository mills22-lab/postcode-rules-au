// @ts-check
import {
  addressInScope,
  fillMessage,
  looksLikePoBox,
  normaliseConfig,
  parsePostcode,
  postcodeInRanges,
  resolveState,
  restrictedStatesForProduct,
} from "./au-rules.js";

export function cartValidationsGenerateRun(input) {
  const raw = input?.validation?.metafield?.jsonValue;
  const cfg = normaliseConfig(raw);
  if (!raw || cfg.enabled === false) return { operations: [] };

  const errors = [];
  const seen = new Set();
  const push = (message) => {
    if (!message || seen.has(message)) return;
    seen.add(message);
    errors.push({ message, target: "cart" });
  };

  for (const group of input?.cart?.deliveryGroups || []) {
    const address = group?.deliveryAddress;
    if (!address) continue;
    if (!addressInScope(address, cfg)) continue;

    const postcode = parsePostcode(address.zip);
    const state = resolveState(address);

    if (cfg.blockPoBoxes && looksLikePoBox(address.address1, address.address2)) {
      push(cfg.poBoxMessage);
    }

    if (state && cfg.blockedStates.includes(state)) {
      push(fillMessage(cfg.blockedStatesMessage, { state, postcode: address.zip || "" }));
    }

    if (postcode !== null && postcodeInRanges(postcode, cfg.blockedPostcodeRanges)) {
      push(
        fillMessage(cfg.blockedPostcodesMessage, {
          state: state || "",
          postcode: String(address.zip || "").trim(),
        }),
      );
    }

    if (state) {
      for (const line of group.cartLines || []) {
        const m = line?.merchandise;
        if (!m || m.__typename !== "ProductVariant") continue;
        if (m.requiresShipping === false) continue;
        const restricted = restrictedStatesForProduct(m.product?.hasTags, cfg.quarantineStates);
        if (restricted.includes(state)) {
          push(
            fillMessage(cfg.quarantineMessage, {
              product: m.product?.title || "This item",
              state,
              postcode: address.zip || "",
            }),
          );
        }
      }
    }
  }

  if (errors.length === 0) return { operations: [] };
  return { operations: [{ validationAdd: { errors } }] };
}
