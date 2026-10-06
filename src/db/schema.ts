import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  date,
  primaryKey,
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
  name: text("name"), // null when isAnonymous
  location: text("location"),
  testimony: text("testimony").notNull(),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  approved: boolean("approved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Intercessory prayer points — written once in the Prayer Workshop, then
// displayed/prayed through in the Start-Up Prayer session. Private to the
// user who wrote them (unlike testimonials, which are public once approved).
export const intercessoryPrayers = pgTable("intercessory_prayers", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  details: text("details").notNull().default(""),
  isAnswered: boolean("is_answered").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// In-app feedback from testers/users (Settings → Send Feedback). Private —
// only the admin sees it. `status` + `resolution` let the admin record what
// was done about it (e.g. "Fixed in build 13"), which doubles as the
// feedback log Google Play asks about when applying for production.
export const feedback = pgTable("feedback", {
  id: text("id").primaryKey(),
  userId: text("user_id"),            // null when not signed in
  name: text("name"),
  contact: text("contact"),           // optional email/phone for follow-up
  category: text("category").notNull().default("other"), // bug | idea | praise | other
  message: text("message").notNull(),
  appVersion: text("app_version"),    // e.g. "1.0.12 (13)", or null on web
  platform: text("platform"),         // android | ios | web
  page: text("page"),                 // path the user was on
  status: text("status").notNull().default("new"), // new | planned | done
  resolution: text("resolution"),     // admin note: what we changed and in which build
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per signed-in account per day it opened the app (the day is in
// Africa/Lagos time, the owner's timezone). Written from /api/auth/me, which
// the app calls on every launch. Powers Admin → Feedback → Daily activity.
export const userActivity = pgTable(
  "user_activity",
  {
    userId: text("user_id").notNull(),
    day: date("day").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })]
);

// Testers the admin has listed by hand (name + phone and/or email) so people
// who have NOT created an account yet can still be reminded. Matched to real
// accounts by phone/email, so they drop off this list once they sign up.
export const testers = pgTable("testers", {
  id: text("id").primaryKey(),
  name: text("name"),
  phone: text("phone"),   // digits only, including country code (e.g. 2348012345678)
  email: text("email"),   // lower-cased
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

// App settings controlled by admin (Flutterwave keys, pricing, feature flags, etc.)
// Key-value store so admin can change anything from the dashboard.
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),    // e.g. "flutterwave_public_key", "price_partner_monthly"
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
export type IntercessoryPrayerRow = typeof intercessoryPrayers.$inferSelect;
export type FeedbackRow = typeof feedback.$inferSelect;
export type TesterRow = typeof testers.$inferSelect;
