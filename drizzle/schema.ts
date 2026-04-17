import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  mustChangePassword: boolean("mustChangePassword").default(false).notNull(),
  role: mysqlEnum("role", ["collaborator", "supervisor", "admin"]).default("collaborator").notNull(),
  teamsWebhook: text("teamsWebhook"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Equipment ────────────────────────────────────────────────────────────────

export const equipment = mysqlTable("equipment", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  requiresApproval: boolean("requiresApproval").default(true).notNull(),
  isRestrictedAccess: boolean("isRestrictedAccess").default(false).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Equipment = typeof equipment.$inferSelect;
export type InsertEquipment = typeof equipment.$inferInsert;

// ─── Equipment Access Control ─────────────────────────────────────────────────

export const equipmentAccess = mysqlTable("equipment_access", {
  id: int("id").autoincrement().primaryKey(),
  equipmentId: int("equipmentId").notNull(),
  userId: int("userId").notNull(),
  canBook: boolean("canBook").default(true).notNull(),
  grantedBy: int("grantedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EquipmentAccess = typeof equipmentAccess.$inferSelect;
export type InsertEquipmentAccess = typeof equipmentAccess.$inferInsert;

// ─── Bookings ─────────────────────────────────────────────────────────────────

export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  equipmentId: int("equipmentId").notNull(),
  userId: int("userId").notNull(),
  bookingDate: varchar("bookingDate", { length: 10 }).notNull(), // stored as 'YYYY-MM-DD' string to avoid timezone shifts
  shift: mysqlEnum("shift", ["morning", "afternoon", "full_day"]).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled"]).default("pending").notNull(),
  purpose: text("purpose"),
  notes: text("notes"),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  cancelledAt: timestamp("cancelledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

// ─── System Settings ──────────────────────────────────────────────────────────

export const systemSettings = mysqlTable("system_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  description: text("description"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
