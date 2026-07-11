import type {
  ExternalSignalCreateInput,
  ExternalSignalRecord,
  ExternalSignalStatus,
  ExternalSignalUpsertKey,
} from "@/lib/external-signal/types";

/**
 * Persistence port for ExternalSignal. Fixture adapter today; Prisma later.
 */
export type ExternalSignalRepository = {
  list(): Promise<readonly ExternalSignalRecord[]>;
  listByTerritory(territoryId: string): Promise<readonly ExternalSignalRecord[]>;
  listByStatus(status: ExternalSignalStatus): Promise<readonly ExternalSignalRecord[]>;
  getById(id: string): Promise<ExternalSignalRecord | null>;
  findByKey(key: ExternalSignalUpsertKey): Promise<ExternalSignalRecord | null>;
  create(input: ExternalSignalCreateInput): Promise<ExternalSignalRecord>;
  update(record: ExternalSignalRecord): Promise<ExternalSignalRecord>;
};
