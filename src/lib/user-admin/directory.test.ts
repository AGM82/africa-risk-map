import { describe, expect, it, beforeEach } from "vitest";
import {
  createFixtureUserDirectory,
  resetUserDirectoryIds,
  UserNotFoundError,
} from "@/lib/user-admin/directory";

describe("fixture user directory", () => {
  beforeEach(() => {
    resetUserDirectoryIds();
  });

  it("invites, updates scope, and toggles active", async () => {
    const directory = createFixtureUserDirectory();
    const invited = await directory.invite({
      email: "new@example.com",
      role: "CLIENT",
      clientId: "client-graa",
    });
    expect(invited.pendingInvite).toBe(true);

    const scoped = await directory.setScope(invited.id, {
      role: "CLIENT",
      clientId: "client-graa",
      brokerOrganisationId: null,
    });
    expect(scoped.role).toBe("CLIENT");

    const deactivated = await directory.setActive(invited.id, false);
    expect(deactivated.active).toBe(false);

    const reactivated = await directory.setActive(invited.id, true);
    expect(reactivated.active).toBe(true);
  });

  it("throws when user is missing", () => {
    const directory = createFixtureUserDirectory();
    expect(() => {
      void directory.setActive("missing", false);
    }).toThrow(UserNotFoundError);
  });
});
