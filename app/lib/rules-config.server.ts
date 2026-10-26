import { DEFAULT_CONFIG } from "./au-rules.js";

type AdminGraphql = (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;

export const NAMESPACE = "$app:postcode-rules";
export const KEY = "config";
export const VALIDATION_TITLE = "Postcode Rules AU – address checks";
export const CUSTOMIZATION_TITLE = "Postcode Rules AU – shipping rates";
export const VALIDATION_HANDLE = "postcode-validation";
export const DELIVERY_HANDLE = "postcode-delivery";

export type RulesConfig = typeof DEFAULT_CONFIG;

type Owners = {
  validationFunctionId: string | null;
  deliveryFunctionId: string | null;
  validationId: string | null;
  deliveryCustomizationId: string | null;
  config: RulesConfig | null;
};

async function gql<T = any>(admin: AdminGraphql, query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await admin(query, variables ? { variables } : undefined);
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e: { message: string }) => e.message).join("; "));
  }
  return json.data as T;
}

export async function loadOwners(admin: AdminGraphql): Promise<Owners> {
  const data = await gql(
    admin,
    `#graphql
    query PostcodeRulesOwners($ns: String!, $key: String!) {
      shopifyFunctions(first: 25) {
        nodes { id handle apiType title }
      }
      validations(first: 25) {
        nodes {
          id
          title
          shopifyFunction { id }
          metafield(namespace: $ns, key: $key) { value }
        }
      }
      deliveryCustomizations(first: 25) {
        nodes {
          id
          title
          functionId
          metafield(namespace: $ns, key: $key) { value }
        }
      }
    }`,
    { ns: NAMESPACE, key: KEY },
  );

  const functions: Array<{ id: string; handle: string; apiType: string }> = data.shopifyFunctions.nodes;
  const validationFn = functions.find((f) => f.handle === VALIDATION_HANDLE) ?? null;
  const deliveryFn = functions.find((f) => f.handle === DELIVERY_HANDLE) ?? null;

  const validation = (data.validations.nodes as any[]).find(
    (v) => validationFn && v.shopifyFunction?.id === validationFn.id,
  );
  const customization = (data.deliveryCustomizations.nodes as any[]).find(
    (c) => deliveryFn && c.functionId === deliveryFn.id,
  );

  let config: RulesConfig | null = null;
  const stored = validation?.metafield?.value ?? customization?.metafield?.value;
  if (stored) {
    try {
      config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    } catch {
      config = null;
    }
  }

  return {
    validationFunctionId: validationFn?.id ?? null,
    deliveryFunctionId: deliveryFn?.id ?? null,
    validationId: validation?.id ?? null,
    deliveryCustomizationId: customization?.id ?? null,
    config,
  };
}

export async function saveConfig(admin: AdminGraphql, config: RulesConfig): Promise<string[]> {
  const owners = await loadOwners(admin);
  const errors: string[] = [];
  const metafields = [{ namespace: NAMESPACE, key: KEY, type: "json", value: JSON.stringify(config) }];

  if (!owners.validationFunctionId) {
    errors.push("The address-check function isn't deployed yet. Run `shopify app deploy` and reload.");
  } else if (owners.validationId) {
    const d = await gql(
      admin,
      `#graphql
      mutation PostcodeRulesValidationUpdate($id: ID!, $validation: ValidationUpdateInput!) {
        validationUpdate(id: $id, validation: $validation) {
          validation { id }
          userErrors { field message }
        }
      }`,
      { id: owners.validationId, validation: { enable: config.enabled, metafields } },
    );
    errors.push(...d.validationUpdate.userErrors.map((e: any) => e.message));
  } else {
    const d = await gql(
      admin,
      `#graphql
      mutation PostcodeRulesValidationCreate($validation: ValidationCreateInput!) {
        validationCreate(validation: $validation) {
          validation { id }
          userErrors { field message }
        }
      }`,
      {
        validation: {
          functionId: owners.validationFunctionId,
          title: VALIDATION_TITLE,
          enable: config.enabled,
          blockOnFailure: false,
          metafields,
        },
      },
    );
    errors.push(...d.validationCreate.userErrors.map((e: any) => e.message));
  }

  if (!owners.deliveryFunctionId) {
    errors.push("The shipping-rate function isn't deployed yet. Run `shopify app deploy` and reload.");
  } else if (owners.deliveryCustomizationId) {
    const d = await gql(
      admin,
      `#graphql
      mutation PostcodeRulesCustomizationUpdate($id: ID!, $input: DeliveryCustomizationInput!) {
        deliveryCustomizationUpdate(id: $id, deliveryCustomization: $input) {
          deliveryCustomization { id }
          userErrors { field message }
        }
      }`,
      {
        id: owners.deliveryCustomizationId,
        input: { enabled: config.enabled, metafields },
      },
    );
    errors.push(...d.deliveryCustomizationUpdate.userErrors.map((e: any) => e.message));
  } else {
    const d = await gql(
      admin,
      `#graphql
      mutation PostcodeRulesCustomizationCreate($input: DeliveryCustomizationInput!) {
        deliveryCustomizationCreate(deliveryCustomization: $input) {
          deliveryCustomization { id }
          userErrors { field message }
        }
      }`,
      {
        input: {
          functionId: owners.deliveryFunctionId,
          title: CUSTOMIZATION_TITLE,
          enabled: config.enabled,
          metafields,
        },
      },
    );
    errors.push(...d.deliveryCustomizationCreate.userErrors.map((e: any) => e.message));
  }

  return errors.filter(Boolean);
}

export function configFromForm(form: FormData): RulesConfig {
  const str = (k: string, fallback = "") => {
    const v = form.get(k);
    return typeof v === "string" ? v.trim() : fallback;
  };
  const bool = (k: string) => {
    const v = form.get(k);
    return v !== null && v !== "" && v !== "false" && v !== "off";
  };
  const list = (k: string) =>
    str(k)
      .split(/[,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

  return {
    enabled: bool("enabled"),
    auOnly: true,
    blockPoBoxes: bool("blockPoBoxes"),
    poBoxMessage: str("poBoxMessage", DEFAULT_CONFIG.poBoxMessage) || DEFAULT_CONFIG.poBoxMessage,
    blockedStates: form.getAll("blockedStates").map(String).map((s) => s.toUpperCase()),
    blockedStatesMessage: str("blockedStatesMessage") || DEFAULT_CONFIG.blockedStatesMessage,
    blockedPostcodes: str("blockedPostcodes"),
    blockedPostcodesMessage: str("blockedPostcodesMessage") || DEFAULT_CONFIG.blockedPostcodesMessage,
    quarantineStates: form.getAll("quarantineStates").map(String).map((s) => s.toUpperCase()),
    quarantineMessage: str("quarantineMessage") || DEFAULT_CONFIG.quarantineMessage,
    remotePostcodes: str("remotePostcodes"),
    remoteHideRates: list("remoteHideRates"),
    metroPostcodes: str("metroPostcodes"),
    metroOnlyRates: list("metroOnlyRates"),
  };
}
