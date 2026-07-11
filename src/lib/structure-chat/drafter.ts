import type { DrafterResult, StructureDraftPayload } from "@/lib/structure-chat/types";
import type { BenefitScale } from "@/lib/policy/types";

export type DrafterContext = Readonly<{
  sourceText: string;
  benefitScaleHint?: BenefitScale;
  /** Optional prior schedule draft used for renewal-diff refinement. */
  sourceDraft?: StructureDraftPayload | null;
  refineMessage?: string;
}>;

/**
 * Port for schema-grounded policy schedule drafting.
 * Fixture path is default for demos/CI; Anthropic when ANTHROPIC_API_KEY is set.
 */
export type AiStructureDrafter = {
  draft(context: DrafterContext): Promise<DrafterResult>;
};
