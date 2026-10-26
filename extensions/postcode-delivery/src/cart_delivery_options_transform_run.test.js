import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cartDeliveryOptionsTransformRun } from "./cart_delivery_options_transform_run.js";

const BASE_CONFIG = {
  enabled: true,
  auOnly: true,
  blockPoBoxes: false,
  poBoxMessage: "",
  blockedStates: [],
  blockedStatesMessage: "",
  blockedPostcodes: "",
  blockedPostcodesMessage: "",
  quarantineStates: [],
  quarantineMessage: "",
  remotePostcodes: "0800-0899",
  remoteHideRates: ["Standard Shipping"],
  metroPostcodes: "2000-2050",
  metroOnlyRates: ["Same Day"],
};

function makeInput(zip, provinceCode, rates, config = {}) {
  return {
    cart: {
      deliveryGroups: [
        {
          deliveryAddress: { zip, provinceCode, countryCode: "AU" },
          deliveryOptions: rates.map((title, i) => ({ handle: `rate_${i}`, title })),
        },
      ],
    },
    deliveryCustomization: {
      metafield: { value: JSON.stringify({ ...BASE_CONFIG, ...config }) },
    },
  };
}

function hiddenHandles(result) {
  return result.operations
    .filter((op) => op.deliveryOptionHide)
    .map((op) => op.deliveryOptionHide.deliveryOptionHandle);
}

describe("cartDeliveryOptionsTransformRun", () => {
  it("hides remote rate for remote postcode", () => {
    const result = cartDeliveryOptionsTransformRun(
      makeInput("0850", "NT", ["Standard Shipping", "Express"]),
    );
    const hidden = hiddenHandles(result);
    assert.ok(hidden.includes("rate_0"), "Standard Shipping should be hidden");
    assert.ok(!hidden.includes("rate_1"), "Express should not be hidden");
  });

  it("does not hide when only one rate available", () => {
    const result = cartDeliveryOptionsTransformRun(
      makeInput("0850", "NT", ["Standard Shipping"]),
    );
    assert.equal(hiddenHandles(result).length, 0, "Should not hide the last rate");
  });

  it("hides metro-only rate outside metro", () => {
    const result = cartDeliveryOptionsTransformRun(
      makeInput("3000", "VIC", ["Standard Shipping", "Same Day"]),
    );
    const hidden = hiddenHandles(result);
    assert.ok(hidden.includes("rate_1"), "Same Day should be hidden outside metro");
  });

  it("shows metro-only rate inside metro", () => {
    const result = cartDeliveryOptionsTransformRun(
      makeInput("2010", "NSW", ["Standard Shipping", "Same Day"]),
    );
    const hidden = hiddenHandles(result);
    assert.ok(!hidden.includes("rate_1"), "Same Day should be visible in metro");
  });

  it("returns no operations when disabled", () => {
    const result = cartDeliveryOptionsTransformRun(
      makeInput("0850", "NT", ["Standard Shipping", "Express"], { enabled: false }),
    );
    assert.equal(result.operations.length, 0);
  });

  it("returns no operations for non-AU address", () => {
    const result = cartDeliveryOptionsTransformRun({
      cart: {
        deliveryGroups: [
          {
            deliveryAddress: { zip: "90210", provinceCode: "CA", countryCode: "US" },
            deliveryOptions: [{ handle: "r0", title: "Standard Shipping" }],
          },
        ],
      },
      deliveryCustomization: { metafield: { value: JSON.stringify(BASE_CONFIG) } },
    });
    assert.equal(result.operations.length, 0);
  });
});
