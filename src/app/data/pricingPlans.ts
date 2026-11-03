export type Currency = 'USD' | 'NGN' | 'KES' | 'GHS' | 'ZAR' | 'GBP' | 'EUR';

export interface CurrencyInfo {
  code: Currency;
  label: string;
  symbol: string;
  flag: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', label: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'NGN', label: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬' },
  { code: 'KES', label: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪' },
  { code: 'GHS', label: 'Ghanaian Cedi', symbol: 'GH₵', flag: '🇬🇭' },
  { code: 'ZAR', label: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
  { code: 'GBP', label: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'EUR', label: 'Euro', symbol: '€', flag: '🇪🇺' },
];

const FX_RATES: Record<Currency, number> = {
  USD: 1,
  NGN: 1500,
  KES: 130,
  GHS: 15.5,
  ZAR: 18.5,
  GBP: 0.8,
  EUR: 0.93,
};

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  NGN: '₦',
  KES: 'KSh',
  GHS: 'GH₵',
  ZAR: 'R',
  GBP: '£',
  EUR: '€',
};

/**
 * Best-effort currency detection based on the visitor's locale region.
 * Falls back to USD.
 */
export function getDefaultCurrency(): Currency {
  if (typeof navigator === 'undefined') return 'USD';
  const language = (navigator.language || '').toLowerCase();
  const region = (language.split('-')[1] || '').toUpperCase();

  switch (region) {
    case 'NG':
      return 'NGN';
    case 'KE':
      return 'KES';
    case 'GH':
      return 'GHS';
    case 'ZA':
      return 'ZAR';
    case 'GB':
      return 'GBP';
    case 'US':
    case 'CA':
    case 'AU':
    case 'NZ':
      return 'USD';
    default:
      break;
  }

  const base = language.split('-')[0];
  if (['fr', 'de', 'es', 'it', 'nl', 'pt', 'be', 'lu', 'ie', 'at', 'fi', 'gr'].includes(base)) {
    return 'EUR';
  }
  return 'USD';
}

export interface PricingPlan {
  id: string;
  name: string;
  tagline: string;
  /** Monthly price in USD */
  monthly: number;
  /** Yearly price in USD */
  yearly: number;
  features: string[];
  highlighted?: boolean;
  cta: string;
  icon: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'seeker',
    name: 'Prayer Seeker',
    tagline: 'Everything you need to build a daily prayer life. No payment, ever.',
    monthly: 0,
    yearly: 0,
    icon: '🙏',
    cta: 'Start Free',
    features: [
      'Write your prayer points, by typing or by voice',
      'Start-Up Prayer: the 7-step guided prayer',
      'Daily prayer schedule with alarms (3 reminders)',
      'Read, search and listen to the Bible (KJV, ASV, WEB)',
      'Verse of the Day and Prayer Verses by topic',
      'My Study on your phone: notes, highlights, bookmarks (3 sermon sessions)',
      'Scripture Vault, Pray 3x guide, family and personal prayer lists',
      '3-day and 7-day fasting plans',
      'Worship player (3 songs)',
    ],
  },
  {
    id: 'partner',
    name: 'Prayer Fire Partner',
    tagline: 'Belong to the global prayer community, and never lose your notes',
    monthly: 2.99,
    yearly: 29.99,
    icon: '👑',
    highlighted: true,
    cta: 'Start 7-Day Free Trial',
    features: [
      'Everything in Prayer Seeker',
      'Join approved global prayer groups',
      'Submit & pray for partner requests',
      'Back up and sync My Study across your phones',
      'Unlimited prayer reminders, sermon notes and worship songs',
      '21-day Daniel Fast and 40-day Full Fast plans',
      'Global prayer alerts & reminders',
      'Priority support',
    ],
  },
  {
    id: 'leader',
    name: 'Fire Partner Leader',
    tagline: 'Lead your own prayer groups and movements',
    monthly: 5.99,
    yearly: 59.99,
    icon: '🔥',
    cta: 'Become a Leader',
    features: [
      'Everything in Prayer Fire Partner',
      'Create & manage prayer groups',
      'Moderation tools: review reports, hide or delete posts, pin posts, remove or block members, appoint co-leaders',
      "Group analytics: members, new members, prayer requests, testimonies, I'm praying counts and your busiest days",
      'Featured groups: ask to have your group shown first in the groups list with a Featured badge',
    ],
  },
];

export function formatPrice(usd: number, currency: Currency): string {
  const rate = FX_RATES[currency] ?? 1;
  const raw = usd * rate;
  const decimals = ['NGN', 'KES', 'GHS', 'ZAR'].includes(currency) ? 0 : 2;
  const rounded = Number(raw.toFixed(decimals));
  const symbol = CURRENCY_SYMBOLS[currency] ?? '$';
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(rounded);
  return `${symbol}${formatted}`;
}
