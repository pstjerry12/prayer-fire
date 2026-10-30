export interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  countryCode: string | null;
  provider: string;
  role: string;
}

/** Which paid plan a person is on. Leader includes everything in Partner. */
export type SubscriptionTier = "partner" | "leader";

/** Where a subscription stands, as Google Play (through RevenueCat) reports it. */
export type SubscriptionStatus = "ACTIVE" | "IN_GRACE" | "CANCELED" | "ON_HOLD" | "EXPIRED" | "REFUNDED";

/** The paid Prayer Fire subscription, as the server reports it (null = none). */
export interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  expiresAt: string | null;
  willRenew: boolean;
  store: string | null;
  productId: string | null; // e.g. partner_sub:partner-monthly
  basePlanId: string | null; // e.g. partner-monthly
  isTrial: boolean;
  sandbox: boolean;
}

/** "Premium is free for a limited time": set by the admin; all premium features open while active. */
export interface FreeModeInfo {
  active: boolean;
  endsAt: string | null;
}

export interface WorshipSong {
  id: string;
  name: string;
  artist?: string;
  /** 'file' = uploaded audio stored in IndexedDB, 'url' = streamed from a link */
  source: 'file' | 'url';
  url?: string;
  addedAt: string;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderName: string;
  senderId?: string;
  text: string;
  kind: 'message' | 'alert';
  createdAt: string;
}

export interface PrayerGroup {
  id: string;
  name: string;
  description: string;
  inviteCode: string;
  /** User ids of the up-to-3 admins. */
  admins: string[];
  /** Member display names (fallback if not a signed-in user). */
  members: string[];
  /** Pinned scripture the group is praying together. */
  pinnedVerse?: string;
  /** Group prayer time (HH:mm). */
  prayerTime?: string;
  /** "I prayed today" tracker: member name -> date string (Date.toDateString()). */
  prayedToday?: Record<string, string>;
  /** Display names awaiting approval (private groups only). */
  pendingMembers?: string[];
  public: boolean;
  createdAt: string;
}

export type JoinResult = 'joined' | 'pending' | 'already' | 'notfound';

export type Urgency = 'low' | 'medium' | 'high';

export interface PrayerPoint {
  id: string;
  title: string;
  notes: string;
  category: string;
  urgency: Urgency;
  scripture: string;
  isPrivate: boolean;
  isAnswered: boolean;
  createdAt: string;
  answeredAt?: string;
}

export interface IntercessoryPrayer {
  id: string;
  category: string;
  title: string;
  details: string;
  isAnswered: boolean;
  createdAt: string;
}

export interface PartnerRequest {
  id: string;
  name: string;
  location: string;
  request: string;
  prayers: number;
  createdAt: string;
}

export interface FastingPlan {
  id: string;
  days: number;
  startDate: string;
  completedDays: number;
  checkedDays: string[];
}

export interface PrayerEntry {
  id: string;
  name: string;
  details: string;
  isAnswered: boolean;
}

export interface IntercessorySubCategory {
  id: string;
  name: string;
  entries: PrayerEntry[];
}

export interface IntercessoryCategory {
  id: string;
  name: string;
  subCategories: IntercessorySubCategory[];
}
