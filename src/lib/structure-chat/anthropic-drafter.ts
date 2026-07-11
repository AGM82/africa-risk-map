import Anthropic from "@anthropic-ai/sdk";
import type { AiStructureDrafter, DrafterContext } from "@/lib/structure-chat/drafter";
import { createFixtureStructureDrafter } from "@/lib/structure-chat/fixture-drafter";
import { validateStructureDraft } from "@/lib/structure-chat/schema";
import type { DrafterResult } from "@/lib/structure-chat/types";

const SYSTEM = `You translate personal-accident policy schedule descriptions into JSON matching this shape:
{
  "benefitScale": "FIXED_SUM" | "EARNINGS_BASED",
  "policyYear": "YYYY-YYYY",
  "inceptionDate": ISO string,
  "expiryDate": ISO string,
  "paymentFrequency": "MONTHLY_BY_NUMBERS" | "ANNUAL_WITH_ADJUSTMENT" | "ANNUAL_FLAT",
  "aggregateIsClientFund": boolean,
  "categories": [{
    "categoryLabel": string,
    "planType": "ESSENTIAL" | "PREMIUM",
    "basisOfCover": "TWENTY_FOUR_HOUR" | "WORKING_HOURS_ONLY" | "WORKING_HOURS_INCL_COMMUTING" | "OTHER",
    "basisOfCoverOther": string | null,  // required free text when basisOfCover is OTHER
    "premiumAmount": number,
    "premiumBasis": "PER_PERSON_PER_MONTH" | "PER_ANNUM" | "PERCENT_OF_WAGE_ROLL",
    "aggregateAmount": number,
    "aggregateBasis": same as premiumBasis,
    "benefits": [{ "benefitType": "DEATH"|"PTD"|"TTD"|"MEDICAL"|"EVACUATION", "amountBasis": "LUMP_SUM"|"PERIODIC", "fixedAmount"?, "earningsMultiple"?, "percentOfEarnings"?, "maxBenefitWeeks"?, "waitingPeriodDays"? }]
  }],
  "uncertainFields": string[]  // JSON paths for values you could not determine
}
Rules: never invent insured-person names or payroll. FIXED_SUM uses fixedAmount; EARNINGS_BASED Death/PTD use earningsMultiple; TTD uses percentOfEarnings; Medical/Evacuation always fixedAmount. Default basisOfCover to TWENTY_FOUR_HOUR unless the schedule says otherwise; use WORKING_HOURS_INCL_COMMUTING when commuting is included; use OTHER only with basisOfCoverOther free text. Return ONLY JSON.`;

/**
 * Anthropic-backed drafter. Falls back to the fixture drafter when the API key
 * is missing or the model response fails validation.
 */
export function createAnthropicStructureDrafter(
  apiKey: string = process.env.ANTHROPIC_API_KEY ?? "",
): AiStructureDrafter {
  const fallback = createFixtureStructureDrafter();
  if (!apiKey.trim()) {
    return fallback;
  }

  const client = new Anthropic({ apiKey });

  return {
    async draft(context: DrafterContext): Promise<DrafterResult> {
      try {
        const userParts = [
          `Source text:\n${context.sourceText}`,
          context.benefitScaleHint ? `Benefit scale hint: ${context.benefitScaleHint}` : "",
          context.sourceDraft ? `Prior draft JSON:\n${JSON.stringify(context.sourceDraft)}` : "",
          context.refineMessage ? `Refinement request:\n${context.refineMessage}` : "",
        ]
          .filter(Boolean)
          .join("\n\n");

        const response = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: SYSTEM,
          messages: [{ role: "user", content: userParts }],
        });

        const textBlock = response.content.find((b) => b.type === "text");
        if (!textBlock || textBlock.type !== "text") {
          return fallback.draft(context);
        }
        const raw = textBlock.text
          .replace(/^```json\s*/i, "")
          .replace(/```$/i, "")
          .trim();
        const parsed = JSON.parse(raw) as {
          uncertainFields?: string[];
          [key: string]: unknown;
        };
        const uncertain = Array.isArray(parsed.uncertainFields)
          ? parsed.uncertainFields.filter((x): x is string => typeof x === "string")
          : [];
        const draftCandidate = { ...parsed };
        delete draftCandidate.uncertainFields;
        const validated = validateStructureDraft(draftCandidate);
        if (!validated.ok || !validated.draft) {
          return fallback.draft(context);
        }
        return { draft: validated.draft, uncertainFields: uncertain };
      } catch {
        return fallback.draft(context);
      }
    },
  };
}

/** Picks Anthropic when ANTHROPIC_API_KEY is set, otherwise the fixture drafter. */
export function createDefaultStructureDrafter(): AiStructureDrafter {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (key) return createAnthropicStructureDrafter(key);
  return createFixtureStructureDrafter();
}
