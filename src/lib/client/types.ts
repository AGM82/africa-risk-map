/**
 * Client / BrokerOrganisation / ClientBrokerAssignment domain types.
 *
 * Client is the tenant root: AuthContext.clientId is a Client.id. Everything
 * here is Insurer-managed; brokers get a scoped read-only view of the clients
 * their BrokerOrganisation currently services.
 */

export const CLIENT_STATUSES = ["ACTIVE", "INACTIVE"] as const;

export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export type ClientRecord = Readonly<{
  id: string;
  name: string;
  code: string;
  status: ClientStatus;
  createdAt: Date;
  updatedAt: Date;
}>;

export type BrokerOrganisationRecord = Readonly<{
  id: string;
  name: string;
  code: string;
  createdAt: Date;
  updatedAt: Date;
}>;

export type ClientBrokerAssignmentRecord = Readonly<{
  id: string;
  clientId: string;
  brokerOrganisationId: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type ClientCreateInput = Readonly<{
  name: string;
  code: string;
  status?: ClientStatus;
}>;

export type ClientUpdateInput = Readonly<{
  name?: string;
  status?: ClientStatus;
}>;

export type BrokerOrganisationCreateInput = Readonly<{
  name: string;
  code: string;
}>;

/** A client together with its current (open) broker assignment, if any. */
export type ClientWithBroker = Readonly<{
  client: ClientRecord;
  broker: BrokerOrganisationRecord | null;
  assignment: ClientBrokerAssignmentRecord | null;
}>;
