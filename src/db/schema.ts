import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  phone: text("phone").unique(),
  countryCode: text("country_code"),
  passwordHash: text("password_hash").notNull(),
  provider: text("provider").notNull().default("email"),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Prayer requests submitted to the global partner wall.
export const partnerRequests = pgTable("partner_requests", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  request: text("request").notNull(),
  prayers: integer("prayers").notNull().default(0),
  approved: boolean("approved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Donations recorded when a payment succeeds.
export const donations = pgTable("donations", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email"),
  amount: integer("amount").notNull(), // smallest currency unit (kobo/cents)
  currency: text("currency").notNull().default("NGN"),
  reference: text("reference"),
  status: text("status").notNull().default("success"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type PartnerRequestRow = typeof partnerRequests.$inferSelect;
export type DonationRow = typeof donations.$inferSelect;
