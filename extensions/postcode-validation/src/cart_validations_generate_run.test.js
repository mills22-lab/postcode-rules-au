import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cartValidationsGenerateRun } from "./cart_validations_generate_run.js";

const EMPTY_CONFIG = {
  enabled: true,
  auOnly: true,
  blockPoBoxes: false,
  poBoxMessage: "We cannot deliver to PO Boxes.",
  blockedStates: [],
  blockedStatesMessage: "We do not ship to {state}.",
  blockedPostcodes: "",
  blockedPostcodesMessage: "We do not ship to postcode {postcode}.",
  quarantineStates: [],
  quarantineMessage: "This product cannot be shipped to {state}.",
  remotePostcodes: "",
  remoteHideRates: [],
  metroPostcodes: "",
  metroOnlyRates: [],
};

function makeInput(address, config = {}, cartLines = []) {
  return {
    cart: {
      deliveryGroups: [
        {
          deliveryAddress: { ...address },
        },
      ],
      lines: cartLines,
    },
    validation: {
      metafield: config ? { value: JSON.stringify({ ...EMPTY_CONFIG, ...config }) } : null,
    },
  };
}

function hasErrors(result) {
  return result.operations.some((op) => op.validationAdd?.errors?.length > 0);
}

describe("cartValidationsGenerateRun", () => {
  it("passes a normal AU address with no rules", () => {
    const result = cartValidationsGenerateRun(
      makeInput({ address1: "123 Main St", zip: "2000", provinceCode: "NSW", countryCode: "AU" }),
    );
    assert.equal(hasErrors(result), false);
  });

  it("blocks PO Box when enabled", () => {
    const result = cartValidationsGenerateRun(
      makeInput(
        { address1: "PO Box 123", zip: "2000", provinceCode: "NSW", countryCode: "AU" },
        { blockPoBoxes: true },
      ),
    );
    assert.equal(hasErrors(result), true);
  });

  it("does not block normal address when PO Box enabled", () => {
    const result = cartValidationsGenerateRun(
      makeInput(
        { address1: "42 Smith Street", zip: "2000", provinceCode: "NSW", countryCode: "AU" },
        { blockPoBoxes: true },
      ),
    );
    assert.equal(hasErrors(result), false);
  });

  it("blocks a blocked state", () => {
    const result = cartValidationsGenerateRun(
      makeInput(
        { address1: "1 Queen St", zip: "6000", provinceCode: "WA", countryCode: "AU" },
        { blockedStates: ["WA"] },
      ),
    );
    assert.equal(hasErrors(result), true);
  });

  it("blocks a blocked postcode range", () => {
    const result = cartValidationsGenerateRun(
      makeInput(
        { address1: "1 Queen St", zip: "0850", provinceCode: "NT", countryCode: "AU" },
        { blockedPostcodes: "0800-0899" },
      ),
    );
    assert.equal(hasErrors(result), true);
  });

  it("does not block postcode outside range", () => {
    const result = cartValidationsGenerateRun(
      makeInput(
        { address1: "1 Queen St", zip: "2000", provinceCode: "NSW", countryCode: "AU" },
        { blockedPostcodes: "0800-0899" },
      ),
    );
    assert.equal(hasErrors(result), false);
  });

  it("passes non-AU address regardless of rules", () => {
    const result = cartValidationsGenerateRun(
      makeInput(
        { address1: "123 Main St", zip: "90210", provinceCode: "CA", countryCode: "US" },
        { blockedStates: ["WA"], blockPoBoxes: true },
      ),
    );
    assert.equal(hasErrors(result), false);
  });

  it("returns no operations when disabled", () => {
    const result = cartValidationsGenerateRun(
      makeInput(
        { address1: "PO Box 1", zip: "6000", provinceCode: "WA", countryCode: "AU" },
        { enabled: false, blockPoBoxes: true, blockedStates: ["WA"] },
      ),
    );
    assert.equal(hasErrors(result), false);
  });
});
