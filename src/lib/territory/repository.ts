import type {
  TerritoryCreateInput,
  TerritoryRecord,
  TerritoryRiskHistoryRecord,
  TerritoryScoreUpdate,
} from "@/lib/territory/types";

export type TerritoryRepository = {
  list(): Promise<TerritoryRecord[]>;
  getById(id: string): Promise<TerritoryRecord | null>;
  create(input: TerritoryCreateInput & { id?: string }): Promise<TerritoryRecord>;
  updateScores(id: string, scores: TerritoryScoreUpdate): Promise<TerritoryRecord | null>;
  delete(id: string): Promise<boolean>;
  listHistory(territoryId: string): Promise<TerritoryRiskHistoryRecord[]>;
  appendHistory(entry: TerritoryRiskHistoryRecord): Promise<TerritoryRiskHistoryRecord>;
};
