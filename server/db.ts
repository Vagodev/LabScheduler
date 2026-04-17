import { and, count, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { createPool } from "mysql2";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Booking,
  Equipment,
  EquipmentAccess,
  InsertBooking,
  InsertEquipment,
  bookings,
  equipment,
  equipmentAccess,
  systemSettings,
  users,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // bookingDate is stored as varchar(10) 'YYYY-MM-DD' to avoid timezone conversion issues.
      // No dateStrings option needed since varchar columns are always returned as strings.
      const pool = createPool(process.env.DATABASE_URL!);
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(users.name);
}

export async function updateUserRole(userId: number, role: "collaborator" | "supervisor" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function updateUserActive(userId: number, isActive: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ isActive, updatedAt: new Date() }).where(eq(users.id, userId));
}

// ─── Equipment ────────────────────────────────────────────────────────────────

export async function getAllEquipment(includeInactive = false) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(equipment);
  if (!includeInactive) {
    return query.where(eq(equipment.isActive, true)).orderBy(equipment.sortOrder, equipment.name);
  }
  return query.orderBy(equipment.sortOrder, equipment.name);
}

export async function getEquipmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(equipment).where(eq(equipment.id, id)).limit(1);
  return result[0];
}

export async function createEquipment(data: InsertEquipment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(equipment).values(data);
  return result;
}

export async function updateEquipment(id: number, data: Partial<InsertEquipment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(equipment).set({ ...data, updatedAt: new Date() }).where(eq(equipment.id, id));
}

export async function deleteEquipment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(equipment).set({ isActive: false, updatedAt: new Date() }).where(eq(equipment.id, id));
}

// ─── Equipment Access ─────────────────────────────────────────────────────────

export async function getEquipmentAccessForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(equipmentAccess).where(eq(equipmentAccess.userId, userId));
}

export async function getEquipmentAccessList(equipmentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ access: equipmentAccess, user: users })
    .from(equipmentAccess)
    .innerJoin(users, eq(equipmentAccess.userId, users.id))
    .where(eq(equipmentAccess.equipmentId, equipmentId));
}

export async function setEquipmentAccess(
  equipmentId: number,
  userId: number,
  canBook: boolean,
  grantedBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(equipmentAccess)
    .values({ equipmentId, userId, canBook, grantedBy })
    .onDuplicateKeyUpdate({ set: { canBook, grantedBy } });
}

export async function removeEquipmentAccess(equipmentId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(equipmentAccess)
    .where(and(eq(equipmentAccess.equipmentId, equipmentId), eq(equipmentAccess.userId, userId)));
}

export async function userCanAccessEquipment(userId: number, equipmentId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const equip = await getEquipmentById(equipmentId);
  if (!equip) return false;
  if (!equip.isRestrictedAccess) return true;
  const access = await db
    .select()
    .from(equipmentAccess)
    .where(
      and(
        eq(equipmentAccess.userId, userId),
        eq(equipmentAccess.equipmentId, equipmentId),
        eq(equipmentAccess.canBook, true)
      )
    )
    .limit(1);
  return access.length > 0;
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export async function createBooking(data: InsertBooking) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(bookings).values(data);
  return result;
}

/**
 * Inserts a booking using a raw SQL date string (YYYY-MM-DD) to avoid
 * timezone conversion issues that occur when using Date objects with
 * the mysql2 driver in non-UTC environments.
 */
export async function createBookingRaw(data: {
  equipmentId: number;
  userId: number;
  bookingDate: string; // YYYY-MM-DD string, inserted as-is
  shift: "morning" | "afternoon" | "full_day";
  purpose?: string | null;
  notes?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.execute(
    sql`INSERT INTO bookings (equipmentId, userId, bookingDate, shift, status, purpose, notes, createdAt, updatedAt)
        VALUES (${data.equipmentId}, ${data.userId}, ${data.bookingDate}, ${data.shift}, 'pending',
                ${data.purpose ?? null}, ${data.notes ?? null}, NOW(), NOW())`
  );
}

export async function getBookingById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ booking: bookings, user: users, equip: equipment })
    .from(bookings)
    .innerJoin(users, eq(bookings.userId, users.id))
    .innerJoin(equipment, eq(bookings.equipmentId, equipment.id))
    .where(eq(bookings.id, id))
    .limit(1);
  return result[0];
}

export async function getBookingsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ booking: bookings, equip: equipment })
    .from(bookings)
    .innerJoin(equipment, eq(bookings.equipmentId, equipment.id))
    .where(eq(bookings.userId, userId))
    .orderBy(desc(bookings.bookingDate));
}

export async function getBookingsByEquipment(equipmentId: number, startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(bookings.equipmentId, equipmentId)];
  if (startDate) conditions.push(sql`${bookings.bookingDate} >= ${startDate}`);
  if (endDate) conditions.push(sql`${bookings.bookingDate} <= ${endDate}`);
  return db
    .select({ booking: bookings, user: users })
    .from(bookings)
    .innerJoin(users, eq(bookings.userId, users.id))
    .where(and(...conditions))
    .orderBy(bookings.bookingDate);
}

export async function getAllBookings(filters?: {
  status?: string;
  equipmentId?: number;
  userId?: number;
  startDate?: string;
  endDate?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(bookings.status, filters.status as Booking["status"]));
  if (filters?.equipmentId) conditions.push(eq(bookings.equipmentId, filters.equipmentId));
  if (filters?.userId) conditions.push(eq(bookings.userId, filters.userId));
  if (filters?.startDate) conditions.push(sql`${bookings.bookingDate} >= ${filters.startDate}`);
  if (filters?.endDate) conditions.push(sql`${bookings.bookingDate} <= ${filters.endDate}`);

  return db
    .select({ booking: bookings, user: users, equip: equipment })
    .from(bookings)
    .innerJoin(users, eq(bookings.userId, users.id))
    .innerJoin(equipment, eq(bookings.equipmentId, equipment.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(bookings.createdAt));
}

export async function getPendingBookings() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ booking: bookings, user: users, equip: equipment })
    .from(bookings)
    .innerJoin(users, eq(bookings.userId, users.id))
    .innerJoin(equipment, eq(bookings.equipmentId, equipment.id))
    .where(eq(bookings.status, "pending"))
    .orderBy(bookings.createdAt);
}

export async function approveBooking(bookingId: number, approverId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(bookings)
    .set({ status: "approved", approvedBy: approverId, approvedAt: new Date(), updatedAt: new Date() })
    .where(eq(bookings.id, bookingId));
}

export async function rejectBooking(bookingId: number, approverId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(bookings)
    .set({
      status: "rejected",
      approvedBy: approverId,
      approvedAt: new Date(),
      rejectionReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, bookingId));
}

export async function cancelBooking(bookingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(bookings)
    .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
    .where(eq(bookings.id, bookingId));
}

export async function checkBookingConflict(
  equipmentId: number,
  bookingDate: string,
  shift: string,
  excludeBookingId?: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const conditions = [
    eq(bookings.equipmentId, equipmentId),
    sql`${bookings.bookingDate} = ${bookingDate}`,
    // date comparison
    inArray(bookings.status, ["pending", "approved"]),
  ];

  if (shift === "full_day") {
    conditions.push(inArray(bookings.shift, ["morning", "afternoon", "full_day"]));
  } else {
    conditions.push(inArray(bookings.shift, [shift as "morning" | "afternoon", "full_day"]));
  }

  if (excludeBookingId) {
    conditions.push(ne(bookings.id, excludeBookingId));
  }

  const result = await db.select({ id: bookings.id }).from(bookings).where(and(...conditions)).limit(1);
  return result.length > 0;
}

export async function getUserConsecutiveBookings(
  userId: number,
  startDate: string,
  endDate: string
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: count() })
    .from(bookings)
    .where(
      and(
        eq(bookings.userId, userId),
        inArray(bookings.status, ["pending", "approved"]),
    sql`${bookings.bookingDate} >= ${startDate}`,
    sql`${bookings.bookingDate} <= ${endDate}`
      )
    );
  return result[0]?.count ?? 0;
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function getBookingStats(
  startDate: string,
  endDate: string,
  equipmentId?: number,
  statusFilter?: "all" | "approved" | "cancelled"
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    sql`${bookings.bookingDate} >= ${startDate}`,
    sql`${bookings.bookingDate} <= ${endDate}`,
    // Never include rejected bookings in reports
    ne(bookings.status, "rejected"),
    ...(equipmentId ? [eq(bookings.equipmentId, equipmentId)] : []),
    ...(statusFilter === "approved" ? [eq(bookings.status, "approved")] : []),
    ...(statusFilter === "cancelled" ? [eq(bookings.status, "cancelled")] : []),
  ] as const;

  return db
    .select({
      equipmentId: bookings.equipmentId,
      equipmentName: equipment.name,
      category: equipment.category,
      total: count(),
      approved: sql<number>`SUM(CASE WHEN ${bookings.status} = 'approved' THEN 1 ELSE 0 END)`,
      pending: sql<number>`SUM(CASE WHEN ${bookings.status} = 'pending' THEN 1 ELSE 0 END)`,
    })
    .from(bookings)
    .innerJoin(equipment, eq(bookings.equipmentId, equipment.id))
    .where(and(...conditions))
    .groupBy(bookings.equipmentId, equipment.name, equipment.category)
    .orderBy(desc(count()));
}

export async function getUserBookingStats(
  startDate: string,
  endDate: string,
  equipmentId?: number,
  statusFilter?: "all" | "approved" | "cancelled"
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    sql`${bookings.bookingDate} >= ${startDate}`,
    sql`${bookings.bookingDate} <= ${endDate}`,
    // Never include rejected bookings in reports
    ne(bookings.status, "rejected"),
    ...(equipmentId ? [eq(bookings.equipmentId, equipmentId)] : []),
    ...(statusFilter === "approved" ? [eq(bookings.status, "approved")] : []),
    ...(statusFilter === "cancelled" ? [eq(bookings.status, "cancelled")] : []),
  ] as const;

  return db
    .select({
      userId: bookings.userId,
      userName: users.name,
      userEmail: users.email,
      total: count(),
      approved: sql<number>`SUM(CASE WHEN ${bookings.status} = 'approved' THEN 1 ELSE 0 END)`,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.userId, users.id))
    .where(and(...conditions))
    .groupBy(bookings.userId, users.name, users.email)
    .orderBy(desc(count()));
}

export async function getMonthlyOccupancy(year: number, month?: number) {
  const db = await getDb();
  if (!db) return [];
  const startDate = month
    ? `${year}-${String(month).padStart(2, "0")}-01`
    : `${year}-01-01`;
  const endDate = month
    ? `${year}-${String(month).padStart(2, "0")}-31`
    : `${year}-12-31`;

  return db
    .select({
      month: sql<string>`DATE_FORMAT(bookings.bookingDate, '%Y-%m') AS month_key`,
      total: count(),
      approved: sql<number>`SUM(CASE WHEN ${bookings.status} = 'approved' THEN 1 ELSE 0 END)`,
    })
    .from(bookings)
    .where(
      and(
        sql`${bookings.bookingDate} >= ${startDate}`,
        sql`${bookings.bookingDate} <= ${endDate}`,
        // Never include rejected bookings in occupancy reports
        ne(bookings.status, "rejected")
      )
    )
    .groupBy(sql`DATE_FORMAT(bookings.bookingDate, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(bookings.bookingDate, '%Y-%m')`);
}

// ─── System Settings ──────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
  return result[0]?.value ?? null;
}

export async function setSetting(key: string, value: string, description?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(systemSettings)
    .values({ key, value, description })
    .onDuplicateKeyUpdate({ set: { value, updatedAt: new Date() } });
}

export async function getAllSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(systemSettings).orderBy(systemSettings.key);
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

export async function seedEquipment() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select({ id: equipment.id }).from(equipment).limit(1);
  if (existing.length > 0) return;

  const equipmentList: InsertEquipment[] = [
    { name: "Microscopia Eletrônica de Varredura (MEV)", category: "Microscopia", sortOrder: 1 },
    { name: "Microscópio Ótico 01", category: "Microscopia", sortOrder: 2 },
    { name: "Microscópio Ótico 02", category: "Microscopia", sortOrder: 3 },
    { name: "FTIR", category: "Espectroscopia", sortOrder: 4 },
    { name: "Máquina Universal de Ensaios 01", category: "Ensaios Mecânicos", sortOrder: 5 },
    { name: "Máquina Universal de Ensaios 02", category: "Ensaios Mecânicos", sortOrder: 6 },
    { name: "Máquina Universal de Ensaios Instron", category: "Ensaios Mecânicos", sortOrder: 7 },
    { name: "HDT/Vicat", category: "Ensaios Térmicos", sortOrder: 8 },
    { name: "Durômetro Rockwell", category: "Dureza", sortOrder: 9 },
    { name: "Microdurômetro", category: "Dureza", sortOrder: 10 },
    { name: "Máquina de Ensaios de Torção", category: "Ensaios Mecânicos", sortOrder: 11 },
    { name: "Máquina de Ensaios de Fadiga 01", category: "Ensaios Mecânicos", sortOrder: 12 },
    { name: "Máquina de Ensaios de Impacto por Pêndulo (Charpy e Izod)", category: "Ensaios Mecânicos", sortOrder: 13 },
    { name: "Tribômetro", category: "Ensaios Mecânicos", sortOrder: 14 },
    { name: "DSC", category: "Análise Térmica", sortOrder: 15 },
    { name: "TG", category: "Análise Térmica", sortOrder: 16 },
    { name: "Politriz 01", category: "Preparação de Amostras", sortOrder: 17 },
    { name: "Politriz 02", category: "Preparação de Amostras", sortOrder: 18 },
    { name: "Politriz 03", category: "Preparação de Amostras", sortOrder: 19 },
    { name: "Politriz 04", category: "Preparação de Amostras", sortOrder: 20 },
    { name: "Estufa", category: "Tratamentos Térmicos", sortOrder: 21 },
    { name: "Forno Mufla", category: "Tratamentos Térmicos", sortOrder: 22 },
    { name: "Espectrômetro de Emissão Óptica", category: "Espectroscopia", sortOrder: 23 },
    { name: "Densímetro", category: "Caracterização", sortOrder: 24 },
    { name: "Classificador Granulométrico", category: "Caracterização", sortOrder: 25 },
    { name: "Câmara de Exposição UV", category: "Ensaios Ambientais", sortOrder: 26 },
    { name: "Potenciostato/Galvanostato", category: "Eletroquímica", sortOrder: 27 },
    { name: "Salt Spray", category: "Ensaios Ambientais", sortOrder: 28 },
  ];

  await db.insert(equipment).values(equipmentList);
}
