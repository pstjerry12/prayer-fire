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
    tagline: 'Begin your journey to a consistent prayer life',
    monthly: 0,
    yearly: 0,
    icon: '🙏',
    cta: 'Start Free',
    features: [
      'Daily prayer points & reminders',
      '3-times-a-day prayer schedule',
      'Family & personal prayer lists',
      'Scripture Vault & KJV Bible library',
      'Fasting tracker',
      'Learn to Pray wisdom library',
    ],
  },
  {
    id: 'partner',
    name: 'Prayer Fire Partner',
    tagline: 'The full intercessory community experience',
    monthly: 2.99,
    yearly: 23.99,
    icon: '👑',
    highlighted: true,
    cta: 'Start 14-Day Free Trial',
    features: [
      'Everything in Prayer Seeker',
      'Join approved global prayer groups',
      'Submit & pray for partner requests',
      'Global prayer alerts & reminders',
      'Voice-to-text prayer writing',
      'Priority support',
    ],
  },
  {
    id: 'leader',
    name: 'Fire Partner Leader',
    tagline: 'Lead your own prayer groups and movements',
    monthly: 9.99,
    yearly: 89.99,
    icon: '🔥',
    cta: 'Become a Leader',
    features: [
      'Everything in Prayer Fire Partner',
      'Create & manage prayer groups',
      'Admin & moderation tools',
      'Partner network analytics',
      'Feature your prayer groups',
      'Early access to new features',
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
