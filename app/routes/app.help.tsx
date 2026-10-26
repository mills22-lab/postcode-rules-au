import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { Page, Layout, Card, Text, BlockStack, List, Link, InlineStack, Badge } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return {};
};

export default function HelpPage() {
  return (
    <Page
      title="Help"
      subtitle="Postcode Rules AU — setup guide"
      backAction={{ content: "Settings", url: "/app" }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Quick start</Text>

              <BlockStack gap="200">
                <Text variant="headingXs" as="h3" fontWeight="semibold">1. Deploy the app functions</Text>
                <Text as="p" tone="subdued">
                  In your terminal, run <code>shopify app deploy</code>. This compiles the two Shopify
                  Functions and registers them with your Partner account. You only need to do this once
                  per environment.
                </Text>
              </BlockStack>

              <BlockStack gap="200">
                <Text variant="headingXs" as="h3" fontWeight="semibold">2. Configure your rules</Text>
                <Text as="p" tone="subdued">
                  Go to the <Link url="/app">Settings page</Link> and enable the app. Fill in whichever
                  rules apply to your store — you don't need to use all of them.
                </Text>
              </BlockStack>

              <BlockStack gap="200">
                <Text variant="headingXs" as="h3" fontWeight="semibold">3. Save</Text>
                <Text as="p" tone="subdued">
                  Click Save. The rules are stored as a metafield on the validation and delivery
                  customization objects — no database required.
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Testing your rules</Text>

              <BlockStack gap="200">
                <Text variant="headingXs" as="h3" fontWeight="semibold">Test a blocked address</Text>
                <Text as="p" tone="subdued">
                  Go to your storefront, add any item to cart, and proceed to checkout.
                  Enter a shipping address in a state or postcode you have blocked.
                  You should see the error message you configured instead of being able to continue.
                </Text>
              </BlockStack>

              <BlockStack gap="200">
                <Text variant="headingXs" as="h3" fontWeight="semibold">Test a PO Box block</Text>
                <Text as="p" tone="subdued">
                  With PO Box blocking enabled, enter an address like <code>PO Box 123</code> or
                  <code>Locked Bag 7</code> in the address line. The checkout should prevent proceeding.
                </Text>
              </BlockStack>

              <BlockStack gap="200">
                <Text variant="headingXs" as="h3" fontWeight="semibold">Test quarantine tags</Text>
                <Text as="p" tone="subdued">
                  Tag a product with one of the quarantine tags (e.g. <code>quarantine:WA</code>).
                  Add it to cart and try to check out with a WA address — the validation should block it.
                </Text>
              </BlockStack>

              <BlockStack gap="200">
                <Text variant="headingXs" as="h3" fontWeight="semibold">Test shipping rate hiding</Text>
                <Text as="p" tone="subdued">
                  Set up a "remote postcode" range (e.g. <code>0800-0899</code> for NT remote) and a rate
                  to hide (partial match on rate title). Enter an NT remote postcode at checkout — that
                  rate should disappear from the options.
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Quarantine tags reference</Text>
              <Text as="p" tone="subdued">
                Tag any product with these to block shipment to the matching state:
              </Text>
              <List type="bullet">
                <List.Item><code>quarantine:WA</code> — Western Australia biosecurity</List.Item>
                <List.Item><code>quarantine:SA</code> — South Australia biosecurity</List.Item>
                <List.Item><code>quarantine:TAS</code> — Tasmania biosecurity</List.Item>
                <List.Item><code>quarantine:NT</code> — Northern Territory</List.Item>
                <List.Item><code>quarantine:QLD</code> — Queensland biosecurity</List.Item>
              </List>
              <Text as="p" tone="subdued">
                You can restrict quarantine to specific states in the app settings, or leave it as "all"
                to block those products to all states that have a tag.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Postcode format</Text>
              <Text as="p" tone="subdued">
                Enter postcodes or ranges in the text areas, one per line or comma-separated:
              </Text>
              <List type="bullet">
                <List.Item>Single postcode: <code>2000</code></List.Item>
                <List.Item>Range: <code>0800-0899</code></List.Item>
                <List.Item>Mix: <code>2000, 3000-3999, 7000</code></List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Deployment checklist</Text>
              <List type="number">
                <List.Item>Create a Shopify Partner account at <Link url="https://partners.shopify.com" external>partners.shopify.com</Link></List.Item>
                <List.Item>Create a dev store for testing</List.Item>
                <List.Item>Run <code>npm install -g @shopify/cli</code></List.Item>
                <List.Item>Run <code>shopify app config link</code> to connect this app to your Partner account</List.Item>
                <List.Item>Run <code>shopify app dev</code> to test locally</List.Item>
                <List.Item>Run <code>shopify app deploy</code> to push functions to Shopify</List.Item>
                <List.Item>Host the Node server (Hetzner VPS + pm2, Fly.io, or Railway) and set <code>SHOPIFY_APP_URL</code></List.Item>
                <List.Item>Submit for App Store review in the Partner Dashboard</List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
