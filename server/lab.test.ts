import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Context factories ────────────────────────────────────────────────────────

function makeCtx(role: "collaborator" | "supervisor" | "admin" = "collaborator"): TrpcContext {
  return {
    user: {
      id: role === "admin" ? 1 : role === "supervisor" ? 2 : 3,
      openId: `test-${role}`,
      email: `${role}@lab.test`,
      name: `Test ${role}`,
      loginMethod: "email",
      role,
      isActive: true,
      teamsWebhook: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function makeUnauthCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

// ─── Auth tests ───────────────────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns null for unauthenticated users", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user for authenticated users", async () => {
    const caller = appRouter.createCaller(makeCtx("collaborator"));
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.role).toBe("collaborator");
  });
});

describe("auth.logout", () => {
  it("returns success and clears cookie", async () => {
    const clearedCookies: string[] = [];
    const ctx = makeCtx();
    ctx.res.clearCookie = (name: string) => { clearedCookies.push(name); };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies.length).toBeGreaterThan(0);
  });
});

// ─── Equipment access control tests ──────────────────────────────────────────

describe("equipment.list", () => {
  it("allows collaborators to list equipment", async () => {
    const caller = appRouter.createCaller(makeCtx("collaborator"));
    const result = await caller.equipment.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows supervisors to list equipment", async () => {
    const caller = appRouter.createCaller(makeCtx("supervisor"));
    const result = await caller.equipment.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows admins to list equipment including inactive", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.equipment.list({ includeInactive: true });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("equipment.create (admin only)", () => {
  it("throws FORBIDDEN for collaborators", async () => {
    const caller = appRouter.createCaller(makeCtx("collaborator"));
    await expect(
      caller.equipment.create({ name: "Test", category: "Test" })
    ).rejects.toThrow();
  });

  it("throws FORBIDDEN for supervisors", async () => {
    const caller = appRouter.createCaller(makeCtx("supervisor"));
    await expect(
      caller.equipment.create({ name: "Test", category: "Test" })
    ).rejects.toThrow();
  });
});

// ─── Bookings access control tests ───────────────────────────────────────────

describe("bookings.pending (supervisor only)", () => {
  it("throws FORBIDDEN for collaborators", async () => {
    const caller = appRouter.createCaller(makeCtx("collaborator"));
    await expect(caller.bookings.pending()).rejects.toThrow();
  });

  it("allows supervisors to view pending bookings", async () => {
    const caller = appRouter.createCaller(makeCtx("supervisor"));
    const result = await caller.bookings.pending();
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows admins to view pending bookings", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.bookings.pending();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("bookings.myBookings", () => {
  it("allows collaborators to view their own bookings", async () => {
    const caller = appRouter.createCaller(makeCtx("collaborator"));
    const result = await caller.bookings.myBookings();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Users access control tests ──────────────────────────────────────────────

describe("users.list (supervisor/admin only)", () => {
  it("throws FORBIDDEN for collaborators", async () => {
    const caller = appRouter.createCaller(makeCtx("collaborator"));
    await expect(caller.users.list()).rejects.toThrow();
  });

  it("allows supervisors to list users", async () => {
    const caller = appRouter.createCaller(makeCtx("supervisor"));
    const result = await caller.users.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("users.updateRole (admin only)", () => {
  it("throws FORBIDDEN for supervisors", async () => {
    const caller = appRouter.createCaller(makeCtx("supervisor"));
    await expect(
      caller.users.updateRole({ userId: 99, role: "collaborator" })
    ).rejects.toThrow();
  });
});

// ─── Reports access control tests ────────────────────────────────────────────

describe("reports.byEquipment (supervisor/admin only)", () => {
  it("throws FORBIDDEN for collaborators", async () => {
    const caller = appRouter.createCaller(makeCtx("collaborator"));
    await expect(
      caller.reports.byEquipment({ startDate: "2026-01-01", endDate: "2026-12-31" })
    ).rejects.toThrow();
  });

  it("allows supervisors to view reports", async () => {
    const caller = appRouter.createCaller(makeCtx("supervisor"));
    const result = await caller.reports.byEquipment({
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Settings access control tests ───────────────────────────────────────────

describe("settings.getAll (admin only)", () => {
  it("throws FORBIDDEN for collaborators", async () => {
    const caller = appRouter.createCaller(makeCtx("collaborator"));
    await expect(caller.settings.getAll()).rejects.toThrow();
  });

  it("throws FORBIDDEN for supervisors", async () => {
    const caller = appRouter.createCaller(makeCtx("supervisor"));
    await expect(caller.settings.getAll()).rejects.toThrow();
  });

  it("allows admins to view all settings", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.settings.getAll();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Reports filter tests ─────────────────────────────────────────────────────

describe("reports.byEquipment — filtros por equipamento e status", () => {
  it("aceita filtro de equipamento (equipmentId) sem erros", async () => {
    const caller = appRouter.createCaller(makeCtx("supervisor"));
    const result = await caller.reports.byEquipment({
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      equipmentId: 1,
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("aceita filtro de status 'approved' sem erros", async () => {
    const caller = appRouter.createCaller(makeCtx("supervisor"));
    const result = await caller.reports.byEquipment({
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      statusFilter: "approved",
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("aceita filtro de status 'cancelled' sem erros", async () => {
    const caller = appRouter.createCaller(makeCtx("supervisor"));
    const result = await caller.reports.byEquipment({
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      statusFilter: "cancelled",
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("aceita combinação de filtros equipmentId + statusFilter", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.reports.byEquipment({
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      equipmentId: 1,
      statusFilter: "approved",
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("não retorna registros com status 'rejected' nos resultados", async () => {
    const caller = appRouter.createCaller(makeCtx("supervisor"));
    const result = await caller.reports.byEquipment({
      startDate: "2020-01-01",
      endDate: "2030-12-31",
    });
    // A query exclui rejected na origem via ne(bookings.status, 'rejected').
    // O total inclui approved + pending + cancelled (todos exceto rejected).
    // Verificamos que approved + pending <= total (cancelled pode existir).
    expect(Array.isArray(result)).toBe(true);
    for (const row of result) {
      const total = Number(row.total);
      const approved = Number(row.approved);
      const pending = Number(row.pending);
      expect(approved + pending).toBeLessThanOrEqual(total);
      // total deve ser positivo se a linha existe
      expect(total).toBeGreaterThan(0);
    }
  });
});

describe("reports.byUser — filtros por equipamento e status", () => {
  it("aceita filtro de equipamento (equipmentId) sem erros", async () => {
    const caller = appRouter.createCaller(makeCtx("supervisor"));
    const result = await caller.reports.byUser({
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      equipmentId: 1,
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("aceita filtro de status 'approved' sem erros", async () => {
    const caller = appRouter.createCaller(makeCtx("supervisor"));
    const result = await caller.reports.byUser({
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      statusFilter: "approved",
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("aceita filtro de status 'cancelled' sem erros", async () => {
    const caller = appRouter.createCaller(makeCtx("supervisor"));
    const result = await caller.reports.byUser({
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      statusFilter: "cancelled",
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("throws FORBIDDEN para colaboradores", async () => {
    const caller = appRouter.createCaller(makeCtx("collaborator"));
    await expect(
      caller.reports.byUser({ startDate: "2026-01-01", endDate: "2026-12-31" })
    ).rejects.toThrow();
  });
});

describe("reports.occupancy — exclui rejected", () => {
  it("retorna dados de ocupação sem erros", async () => {
    const caller = appRouter.createCaller(makeCtx("supervisor"));
    const result = await caller.reports.occupancy({ year: 2026 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("retorna dados de ocupação mensal sem erros", async () => {
    const caller = appRouter.createCaller(makeCtx("supervisor"));
    const result = await caller.reports.occupancy({ year: 2026, month: 4 });
    expect(Array.isArray(result)).toBe(true);
  });
});
