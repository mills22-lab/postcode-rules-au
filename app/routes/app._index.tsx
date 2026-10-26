import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Checkbox,
  TextField,
  Select,
  Badge,
  Banner,
  Button,
  Divider,
  Toast,
  Frame,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useCallback, useState } from "react";
import { authenticate, MONTHLY_PLAN } from "../shopify.server";
import { loadOwners, saveConfig, configFromForm } from "../lib/rules-config.server";
import { DEFAULT_CONFIG, AU_STATES } from "../lib/au-rules.js";
import type { RulesConfig } from "../lib/rules-config.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, billing } = await authenticate.admin(request);

  // Require billing — redirects to billing page if not subscribed
  await billing.require({
    plans: [MONTHLY_PLAN],
    isTest: process.env.BILLING_TEST !== "false",
    onFailure: async () => billing.request({ plan: MONTHLY_PLAN, isTest: process.env.BILLING_TEST !== "false" }),
  });

  const owners = await loadOwners(admin);
  return {
    config: owners.config ?? DEFAULT_CONFIG,
    functionsDeployed: !!(owners.validationFunctionId && owners.deliveryFunctionId),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const form = await request.formData();
  const config = configFromForm(form);
  const errors = await saveConfig(admin, config);
  return { ok: errors.length === 0, errors };
};

const STATE_OPTIONS = Object.entries(AU_STATES).map(([code, name]) => ({
  label: `${name} (${code})`,
  value: code,
}));

export default function IndexPage() {
  const { config: initial, functionsDeployed } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const [config, setConfig] = useState<RulesConfig>(initial);
  const [toastActive, setToastActive] = useState(false);

  const saved = fetcher.state === "idle" && fetcher.data?.ok;
  const saveErrors: string[] = fetcher.data?.errors ?? [];

  // Show toast after save
  const prevState = fetcher.state;
  if (fetcher.state === "idle" && fetcher.data?.ok && !toastActive) {
    setToastActive(true);
  }

  const set = useCallback(
    <K extends keyof RulesConfig>(key: K, value: RulesConfig[K]) =>
      setConfig((c) => ({ ...c, [key]: value })),
    [],
  );

  const toggleState = (list: keyof RulesConfig, code: string) => {
    const current = config[list] as string[];
    set(
      list,
      current.includes(code) ? current.filter((s) => s !== code) : [...current, code],
    );
  };

  return (
    <Frame>
      <Page
        title="Postcode Rules AU"
        subtitle="Control which Australian addresses can check out"
        secondaryActions={[{ content: "Help", url: "/app/help" }]}
      >
        <TitleBar title="Postcode Rules AU" />

        {!functionsDeployed && (
          <Banner tone="warning" title="Functions not deployed">
            <Text as="p">
              Run <code>shopify app deploy</code> in your terminal to deploy the address and shipping
              functions, then reload this page.
            </Text>
          </Banner>
        )}

        {saveErrors.length > 0 && (
          <Banner tone="critical" title="Save failed">
            {saveErrors.map((e, i) => <Text key={i} as="p">{e}</Text>)}
          </Banner>
        )}

        <fetcher.Form method="post">
          <BlockStack gap="500">

            {/* ── Status ── */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Status</Text>
                <Checkbox
                  label="Enable Postcode Rules"
                  name="enabled"
                  checked={config.enabled}
                  onChange={(v) => set("enabled", v)}
                  helpText="Uncheck to disable all rules without deleting them."
                />
              </BlockStack>
            </Card>

            {/* ── PO Boxes ── */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">PO Boxes</Text>
                <Checkbox
                  label="Block PO Box addresses"
                  name="blockPoBoxes"
                  checked={config.blockPoBoxes}
                  onChange={(v) => set("blockPoBoxes", v)}
                  helpText="Blocks PO Box, Locked Bag, Private Bag, GPO Box, etc."
                />
                {config.blockPoBoxes && (
                  <TextField
                    label="Error message"
                    name="poBoxMessage"
                    value={config.poBoxMessage}
                    onChange={(v) => set("poBoxMessage", v)}
                    multiline={2}
                    autoComplete="off"
                  />
                )}
              </BlockStack>
            </Card>

            {/* ── Blocked States ── */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Blocked States / Territories</Text>
                <Text as="p" tone="subdued">
                  Customers with a shipping address in these states cannot check out.
                </Text>
                <BlockStack gap="200">
                  {STATE_OPTIONS.map(({ label, value }) => (
                    <Checkbox
                      key={value}
                      label={label}
                      name="blockedStates"
                      value={value}
                      checked={(config.blockedStates as string[]).includes(value)}
                      onChange={() => toggleState("blockedStates", value)}
                    />
                  ))}
                </BlockStack>
                {(config.blockedStates as string[]).length > 0 && (
                  <TextField
                    label="Error message"
                    name="blockedStatesMessage"
                    value={config.blockedStatesMessage}
                    onChange={(v) => set("blockedStatesMessage", v)}
                    multiline={2}
                    autoComplete="off"
                    helpText="Use {state} to insert the state name."
                  />
                )}
              </BlockStack>
            </Card>

            {/* ── Blocked Postcodes ── */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Blocked Postcodes</Text>
                <Text as="p" tone="subdued">
                  Enter postcodes or ranges (e.g. <code>0800-0899</code>), one per line or comma-separated.
                </Text>
                <TextField
                  label="Blocked postcodes"
                  name="blockedPostcodes"
                  value={config.blockedPostcodes}
                  onChange={(v) => set("blockedPostcodes", v)}
                  multiline={4}
                  autoComplete="off"
                  placeholder={"0800-0899\n2000\n4870-4879"}
                />
                {config.blockedPostcodes && (
                  <TextField
                    label="Error message"
                    name="blockedPostcodesMessage"
                    value={config.blockedPostcodesMessage}
                    onChange={(v) => set("blockedPostcodesMessage", v)}
                    multiline={2}
                    autoComplete="off"
                    helpText="Use {postcode} to insert the postcode."
                  />
                )}
              </BlockStack>
            </Card>

            {/* ── Quarantine ── */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Biosecurity / Quarantine</Text>
                <Text as="p" tone="subdued">
                  Products tagged <code>quarantine:WA</code>, <code>quarantine:SA</code>, etc. will be
                  blocked from shipping to those states. Enable the states you want to enforce here.
                </Text>
                <BlockStack gap="200">
                  {STATE_OPTIONS.map(({ label, value }) => (
                    <Checkbox
                      key={value}
                      label={label}
                      name="quarantineStates"
                      value={value}
                      checked={(config.quarantineStates as string[]).includes(value)}
                      onChange={() => toggleState("quarantineStates", value)}
                    />
                  ))}
                </BlockStack>
                {(config.quarantineStates as string[]).length > 0 && (
                  <TextField
                    label="Quarantine error message"
                    name="quarantineMessage"
                    value={config.quarantineMessage}
                    onChange={(v) => set("quarantineMessage", v)}
                    multiline={2}
                    autoComplete="off"
                    helpText="Use {state} to insert the state name."
                  />
                )}
              </BlockStack>
            </Card>

            {/* ── Remote area shipping ── */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Remote Area Shipping</Text>
                <Text as="p" tone="subdued">
                  Hide specific shipping rates for customers in remote postcodes.
                </Text>
                <TextField
                  label="Remote postcodes"
                  name="remotePostcodes"
                  value={config.remotePostcodes}
                  onChange={(v) => set("remotePostcodes", v)}
                  multiline={4}
                  autoComplete="off"
                  placeholder={"0800-0899\n2898\n6798"}
                />
                <TextField
                  label="Rates to hide (partial match on rate title)"
                  name="remoteHideRates"
                  value={(config.remoteHideRates as string[]).join("\n")}
                  onChange={(v) =>
                    set("remoteHideRates", v.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean))
                  }
                  multiline={3}
                  autoComplete="off"
                  placeholder={"Standard Shipping\nExpress"}
                  helpText="One rate title substring per line. Case-insensitive."
                />
              </BlockStack>
            </Card>

            {/* ── Metro-only rates ── */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Metro-Only Rates</Text>
                <Text as="p" tone="subdued">
                  Hide specific shipping rates for customers OUTSIDE metro postcodes.
                </Text>
                <TextField
                  label="Metro postcodes"
                  name="metroPostcodes"
                  value={config.metroPostcodes}
                  onChange={(v) => set("metroPostcodes", v)}
                  multiline={4}
                  autoComplete="off"
                  placeholder={"2000-2239\n3000-3207\n4000-4179"}
                />
                <TextField
                  label="Metro-only rates (partial match on rate title)"
                  name="metroOnlyRates"
                  value={(config.metroOnlyRates as string[]).join("\n")}
                  onChange={(v) =>
                    set("metroOnlyRates", v.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean))
                  }
                  multiline={3}
                  autoComplete="off"
                  placeholder={"Same Day Delivery\nMetro Express"}
                  helpText="One rate title substring per line. Rates are hidden outside metro postcodes."
                />
              </BlockStack>
            </Card>

            <InlineStack align="end">
              <Button
                submit
                variant="primary"
                loading={fetcher.state !== "idle"}
                size="large"
              >
                Save rules
              </Button>
            </InlineStack>

          </BlockStack>
        </fetcher.Form>

        {toastActive && (
          <Toast content="Rules saved" onDismiss={() => setToastActive(false)} />
        )}
      </Page>
    </Frame>
  );
}
