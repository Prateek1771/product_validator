export type PlaybookId = "brief" | "profile" | "pricing" | "battlecard" | "landscape" | "pain" | "sizing" | "opportunity";

export const PLAYBOOKS: { id: PlaybookId; label: string; hint: string; example: string }[] = [
  { id: "brief", label: "BRIEF", hint: "what changed and what to do", example: "What changed in the plant-based food market this year?" },
  { id: "profile", label: "PROFILE", hint: "side-by-side competitor profiles", example: "Competitor profile of Notion, Coda and Confluence" },
  { id: "pricing", label: "PRICING", hint: "prices, hidden costs and cost scenarios", example: "Pricing teardown of Shopify vs BigCommerce" },
  { id: "battlecard", label: "BATTLECARD", hint: "who wins where, and how to sell against them", example: "HubSpot vs Salesforce for a 50-person sales team" },
  { id: "landscape", label: "LANDSCAPE", hint: "market map, competitor matrix and SWOT", example: "Project management software market" },
  { id: "pain", label: "PAIN", hint: "what users complain about, with quotes", example: "What do users complain about in Notion?" },
  { id: "sizing", label: "SIZING", hint: "TAM, SAM and SOM with the maths shown", example: "Size the US home fitness equipment market" },
  { id: "opportunity", label: "OPPORTUNITY", hint: "should you build it: segments, risks, a call", example: "Should I build a budgeting app for freelancers in India?" },
];

export const playbookLabel = (id?: string | null) => PLAYBOOKS.find((p) => p.id === id)?.label ?? "BRIEF";
