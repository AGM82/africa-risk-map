import type {
  BrokerOrganisationCreateInput,
  BrokerOrganisationRecord,
  ClientBrokerAssignmentRecord,
  ClientCreateInput,
  ClientRecord,
  ClientUpdateInput,
} from "@/lib/client/types";

/**
 * Persistence port for the multi-tenant backbone. Fixture adapter today
 * (createFixtureClientBrokerRepository); Prisma adapter when Neon is live.
 */
export type ClientBrokerRepository = {
  listClients(): Promise<ClientRecord[]>;
  getClientById(id: string): Promise<ClientRecord | null>;
  createClient(input: ClientCreateInput & { id?: string }): Promise<ClientRecord>;
  updateClient(id: string, input: ClientUpdateInput): Promise<ClientRecord | null>;

  listBrokerOrganisations(): Promise<BrokerOrganisationRecord[]>;
  getBrokerOrganisationById(id: string): Promise<BrokerOrganisationRecord | null>;
  createBrokerOrganisation(
    input: BrokerOrganisationCreateInput & { id?: string },
  ): Promise<BrokerOrganisationRecord>;

  listAssignments(): Promise<ClientBrokerAssignmentRecord[]>;
  /** Current (effectiveTo IS NULL) assignment for a client, or null. */
  getCurrentAssignmentForClient(clientId: string): Promise<ClientBrokerAssignmentRecord | null>;
  /** Current client ids serviced by a broker organisation. */
  listClientIdsForBroker(brokerOrganisationId: string): Promise<string[]>;
  createAssignment(input: {
    id?: string;
    clientId: string;
    brokerOrganisationId: string;
    effectiveFrom?: Date;
  }): Promise<ClientBrokerAssignmentRecord>;
  /** Closes an open assignment (sets effectiveTo). Returns the closed row. */
  closeAssignment(id: string, effectiveTo: Date): Promise<ClientBrokerAssignmentRecord | null>;
};
