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

// Announcements broadcast by an admin to everyone on the home page.
export const announcements = pgTable("announcements", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Testimonials — admin reviews and approves before showing publicly.
export const testimonials = pgTable("testimonials", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  testimony: text("testimony").notNull(),
  approved: boolean("approved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Upcoming global prayer events/programs announced by admin.
export const events = pgTable("events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(), // ISO date string e.g. "2026-03-21"
  time: text("time"),           // e.g. "4:00 AM WAT"
  link: text("link"),           // optional zoom/youtube link
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// App settings controlled by admin (Paystack keys, pricing, feature flags, etc.)
// Key-value store so admin can change anything from the dashboard.
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),    // e.g. "paystack_public_key", "price_partner_monthly"
  value: text("value").notNull(),   // the actual value
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type PartnerRequestRow = typeof partnerRequests.$inferSelect;
export type DonationRow = typeof donations.$inferSelect;
export type AnnouncementRow = typeof announcements.$inferSelect;
export type TestimonialRow = typeof testimonials.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type AppSettingRow = typeof appSettings.$inferSelect;
