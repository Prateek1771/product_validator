export type PlaybookId = "brief" | "profile" | "pricing" | "battlecard";

export const PLAYBOOKS: { id: PlaybookId; label: string; hint: string; example: string }[] = [
  { id: "brief", label: "BRIEF", hint: "what changed and what to do", example: "What changed in the plant-based food market this year?" },
  { id: "profile", label: "PROFILE", hint: "side-by-side competitor profiles", example: "Competitor profile of Notion, Coda and Confluence" },
  { id: "pricing", label: "PRICING", hint: "prices, hidden costs and cost scenarios", example: "Pricing teardown of Shopify vs BigCommerce" },
  { id: "battlecard", label: "BATTLECARD", hint: "who wins where, and how to sell against them", example: "HubSpot vs Salesforce for a 50-person sales team" },
];

export const playbookLabel = (id?: string | null) => PLAYBOOKS.find((p) => p.id === id)?.label ?? "BRIEF";
