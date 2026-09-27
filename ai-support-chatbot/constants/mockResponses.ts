// Canned AI support responses for the Phase 1 mock streaming engine.
// These simulate real support bot answers — replaced by a live LLM in Phase 2.

export const MOCK_RESPONSES: string[] = [
  "Hey there! I'm your AI Support Assistant. I've reviewed your query and I'm here to help you resolve this as quickly as possible. Could you share a bit more context so I can pinpoint the exact solution?",
  "Great question! Based on what you've described, the most common fix is to restart the service and clear the local cache. Let me walk you through each step so nothing gets missed along the way.",
  "I completely understand how frustrating this can be. I've flagged your request as high priority. Our engineering team is actively monitoring this issue and we expect a resolution within the next 2–4 hours. I'll keep you posted here.",
  "Thanks for reaching out! This looks like a configuration mismatch on your account. I've already initiated a backend refresh on our end — please wait about 60 seconds and try again. Let me know if the issue persists!",
  "Absolutely, I can help with that! This feature is available under your account settings in the Advanced tab. Navigate there, toggle the option on, save your changes, and you should see the update reflected immediately.",
  "I've checked our status page and we're currently experiencing elevated latency in your region. Our infrastructure team deployed a hotfix 10 minutes ago. Services should be fully restored within the next 15–20 minutes. Sorry for the inconvenience!",
  "No worries at all — this is a common question. The free tier includes 5,000 API requests per month. If you're approaching the limit, you can upgrade to our Pro plan directly from the Billing section of your dashboard.",
  "That error usually means the authentication token has expired. Try signing out completely, clearing your browser cookies, and signing back in. If the error persists, I can manually regenerate your access token from the admin panel.",
  "I've reviewed your account and everything looks good on our end. The delay you're experiencing might be related to a slow network connection or a browser extension interfering with the request. Could you try using an incognito window and let me know what happens?",
  "Perfect — I've located your ticket. The refund has been approved and should appear on your original payment method within 3–5 business days. You'll receive a confirmation email at the address on file once it's been processed.",
];

export function getRandomMockResponse(): string {
  return MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
}
