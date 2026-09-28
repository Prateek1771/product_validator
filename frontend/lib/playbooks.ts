export type PlaybookId = "brief" | "profile" | "pricing" | "battlecard";

export const PLAYBOOKS: { id: PlaybookId; label: string; hint: string; example: string }[] = [
  { id: "brief", label: "BRIEF", hint: "what changed, verified by Jev", example: "What changed in Anthropic's API pricing and models recently?" },
  { id: "profile", label: "PROFILE", hint: "structured competitor profiles + positioning map", example: "Competitor profile of Mistral AI and Cohere" },
  { id: "pricing", label: "PRICING", hint: "tier-by-tier pricing teardown + page rubric", example: "Pricing teardown of the OpenAI API vs Anthropic API" },
  { id: "battlecard", label: "BATTLECARD", hint: "head-to-head sales battlecard", example: "Anthropic Claude vs OpenAI for enterprise API buyers" },
];

export const playbookLabel = (id?: string | null) => PLAYBOOKS.find((p) => p.id === id)?.label ?? "BRIEF";
