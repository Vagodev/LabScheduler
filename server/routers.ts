import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { systemRouter } from "./_core/systemRouter";
import { loginUser, createUser, changePassword, clearSessionCookie, setSessionCookie, signToken } from "./auth";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  approveBooking,
  cancelBooking,
  checkBookingConflict,
  createBooking,
  createBookingRaw,
  createEquipment,
  deleteEquipment,
  getAllBookings,
  getAllEquipment,
  getAllSettings,
  getAllUsers,
  getBookingById,
  getBookingStats,
  getBookingsByEquipment,
  getBookingsByUser,
  getEquipmentAccessForUser,
  getEquipmentAccessList,
  getEquipmentById,
  getMonthlyOccupancy,
  getPendingBookings,
  getSetting,
  getUserBookingStats,
  getUserConsecutiveBookings,
  rejectBooking,
  removeEquipmentAccess,
  seedEquipment,
  setEquipmentAccess,
  setSetting,
  updateEquipment,
  updateUserActive,
  updateUserRole,
  userCanAccessEquipment,
} from "./db";
import { sendTeamsNotification } from "./notifications";
import { isBrazilianHoliday } from "./holidays";

// ─── Middleware ───────────────────────────────────────────────────────────────

const supervisorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "supervisor" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a supervisores." });
  }
  return next({ ctx });
});

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
  }
  return next({ ctx });
});

// ─── Equipment Router ─────────────────────────────────────────────────────────

const equipmentRouter = router({
  list: protectedProcedure
    .input(z.object({ includeInactive: z.boolean().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const includeInactive = input?.includeInactive && ctx.user.role === "admin";
      await seedEquipment();
      return getAllEquipment(includeInactive);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const equip = await getEquipmentById(input.id);
      if (!equip) throw new TRPCError({ code: "NOT_FOUND", message: "Equipamento não encontrado." });
      return equip;
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        category: z.string().min(1),
        description: z.string().optional(),
        location: z.string().optional(),
        requiresApproval: z.boolean().optional(),
        isRestrictedAccess: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await createEquipment(input);
      return { success: true };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        category: z.string().min(1).optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        isActive: z.boolean().optional(),
        requiresApproval: z.boolean().optional(),
        isRestrictedAccess: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateEquipment(id, data);
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteEquipment(input.id);
      return { success: true };
    }),

  getAccessList: adminProcedure
    .input(z.object({ equipmentId: z.number() }))
    .query(({ input }) => getEquipmentAccessList(input.equipmentId)),

  setAccess: adminProcedure
    .input(
      z.object({
        equipmentId: z.number(),
        userId: z.number(),
        canBook: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await setEquipmentAccess(input.equipmentId, input.userId, input.canBook, ctx.user.id);
      return { success: true };
    }),

  removeAccess: adminProcedure
    .input(z.object({ equipmentId: z.number(), userId: z.number() }))
    .mutation(async ({ input }) => {
      await removeEquipmentAccess(input.equipmentId, input.userId);
      return { success: true };
    }),

  myAccess: protectedProcedure.query(({ ctx }) => getEquipmentAccessForUser(ctx.user.id)),
});

// ─── Bookings Router ──────────────────────────────────────────────────────────

const bookingsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          equipmentId: z.number().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      if (ctx.user.role === "collaborator") {
        return getBookingsByUser(ctx.user.id);
      }
      return getAllBookings(input ?? {});
    }),

  myBookings: protectedProcedure.query(({ ctx }) => getBookingsByUser(ctx.user.id)),

  pending: supervisorProcedure.query(() => getPendingBookings()),

  byEquipment: protectedProcedure
    .input(
      z.object({
        equipmentId: z.number(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(({ input }) =>
      getBookingsByEquipment(input.equipmentId, input.startDate, input.endDate)
    ),

  calendarView: protectedProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(({ input }) =>
      getAllBookings({ startDate: input.startDate, endDate: input.endDate })
    ),

  create: protectedProcedure
    .input(
      z.object({
        equipmentId: z.number(),
        bookingDate: z.string(),
        shift: z.enum(["morning", "afternoon", "full_day"]),
        purpose: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check equipment access
      const canAccess = await userCanAccessEquipment(ctx.user.id, input.equipmentId);
      if (!canAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para agendar este equipamento.",
        });
      }

      // Validate: not a weekend
      const bookingDayOfWeek = new Date(input.bookingDate + "T12:00:00").getDay();
      if (bookingDayOfWeek === 0 || bookingDayOfWeek === 6) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não é possível agendar em finais de semana.",
        });
      }

      // Validate: not a Brazilian national holiday
      if (isBrazilianHoliday(input.bookingDate)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não é possível agendar em feriados nacionais.",
        });
      }

      // Check booking conflict
      const hasConflict = await checkBookingConflict(
        input.equipmentId,
        input.bookingDate,
        input.shift
      );
      if (hasConflict) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Este equipamento já está reservado neste turno.",
        });
      }

      // Check consecutive days limit (2 days)
      // Parse YYYY-MM-DD safely without timezone conversion
      const [bYear, bMonth, bDay] = input.bookingDate.split("-").map(Number);
      const addDays = (y: number, m: number, d: number, delta: number): string => {
        const dt = new Date(y, m - 1, d + delta);
        const yy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, "0");
        const dd = String(dt.getDate()).padStart(2, "0");
        return `${yy}-${mm}-${dd}`;
      };
      const dayBefore = addDays(bYear, bMonth, bDay, -1);
      const dayAfter = addDays(bYear, bMonth, bDay, 1);

      const consecutiveCount = await getUserConsecutiveBookings(
        ctx.user.id,
        dayBefore,
        dayAfter
      );

      if (consecutiveCount >= 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Limite de 2 dias consecutivos de agendamento atingido.",
        });
      }

      await createBookingRaw({
        equipmentId: input.equipmentId,
        userId: ctx.user.id,
        bookingDate: input.bookingDate,
        shift: input.shift,
        purpose: input.purpose ?? null,
        notes: input.notes ?? null,
      });

      return { success: true };
    }),

  approve: supervisorProcedure
    .input(z.object({ bookingId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const booking = await getBookingById(input.bookingId);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      if (booking.booking.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Agendamento não está pendente." });
      }

      await approveBooking(input.bookingId, ctx.user.id);

      // Notify via Teams
      await sendTeamsNotification({
        title: "✅ Agendamento Aprovado",
        message: `Seu agendamento de **${booking.equip.name}** para ${booking.booking.bookingDate} foi **aprovado** por ${ctx.user.name}.`,
        userId: booking.booking.userId,
      });

      return { success: true };
    }),

  reject: supervisorProcedure
    .input(z.object({ bookingId: z.number(), reason: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const booking = await getBookingById(input.bookingId);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      if (booking.booking.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Agendamento não está pendente." });
      }

      await rejectBooking(input.bookingId, ctx.user.id, input.reason);

      // Notify via Teams
      await sendTeamsNotification({
        title: "❌ Agendamento Rejeitado",
        message: `Seu agendamento de **${booking.equip.name}** para ${booking.booking.bookingDate} foi **rejeitado**. Motivo: ${input.reason}`,
        userId: booking.booking.userId,
      });

      return { success: true };
    }),

  cancel: protectedProcedure
    .input(z.object({ bookingId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const booking = await getBookingById(input.bookingId);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      if (
        booking.booking.userId !== ctx.user.id &&
        ctx.user.role !== "supervisor" &&
        ctx.user.role !== "admin"
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await cancelBooking(input.bookingId);
      return { success: true };
    }),
});

// ─── Users Router ─────────────────────────────────────────────────────────────

const usersRouter = router({
  list: supervisorProcedure.query(() => getAllUsers()),

  updateRole: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["collaborator", "supervisor", "admin"]),
      })
    )
    .mutation(async ({ input }) => {
      await updateUserRole(input.userId, input.role);
      return { success: true };
    }),

  setActive: adminProcedure
    .input(z.object({ userId: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      await updateUserActive(input.userId, input.isActive);
      return { success: true };
    }),
});

// ─── Reports Router ───────────────────────────────────────────────────────────

const reportsRouter = router({
  byEquipment: supervisorProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      equipmentId: z.number().optional(),
      statusFilter: z.enum(["all", "approved", "cancelled"]).optional(),
    }))
    .query(({ input }) => getBookingStats(input.startDate, input.endDate, input.equipmentId, input.statusFilter)),

  byUser: supervisorProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      equipmentId: z.number().optional(),
      statusFilter: z.enum(["all", "approved", "cancelled"]).optional(),
    }))
    .query(({ input }) => getUserBookingStats(input.startDate, input.endDate, input.equipmentId, input.statusFilter)),

  occupancy: supervisorProcedure
    .input(z.object({ year: z.number(), month: z.number().optional() }))
    .query(({ input }) => getMonthlyOccupancy(input.year, input.month)),
});

// ─── Settings Router ──────────────────────────────────────────────────────────

const settingsRouter = router({
  getAll: adminProcedure.query(() => getAllSettings()),

  get: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(({ input }) => getSetting(input.key)),

  set: adminProcedure
    .input(z.object({ key: z.string(), value: z.string(), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      await setSetting(input.key, input.value, input.description);
      return { success: true };
    }),
});

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),

    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const user = await loginUser(input.email, input.password);
        const token = signToken({ userId: user.id, email: user.email, role: user.role });
        setSessionCookie(ctx.res, token);
        return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, mustChangePassword: user.mustChangePassword };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      clearSessionCookie(ctx.res);
      return { success: true } as const;
    }),

    changePassword: protectedProcedure
      .input(z.object({ newPassword: z.string().min(8) }))
      .mutation(async ({ input, ctx }) => {
        await changePassword(ctx.user.id, input.newPassword);
        return { success: true };
      }),

    createUser: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        temporaryPassword: z.string().min(6),
        role: z.enum(["collaborator", "supervisor", "admin"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const user = await createUser(input.name, input.email, input.temporaryPassword, input.role);
        return { success: true, userId: user.id };
      }),
  }),
  equipment: equipmentRouter,
  bookings: bookingsRouter,
  users: usersRouter,
  reports: reportsRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
