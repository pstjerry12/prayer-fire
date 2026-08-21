export interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  countryCode: string | null;
  provider: string;
  role: string;
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
  public: boolean;
  createdAt: string;
}

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
