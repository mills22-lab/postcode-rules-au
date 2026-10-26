/**
 * Mandatory GDPR compliance webhooks.
 * This app stores no customer PII — only shop-level config in metafields — so
 * all three topics are acknowledged with 200 and no data returned.
 */
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop } = await authenticate.webhook(request);
  console.log(`Compliance webhook ${topic} for ${shop} — no customer data stored.`);
  return new Response();
};
