'use client';

declare global {
  interface Window {
    PaystackPop?: any;
  }
}

let loading: Promise<boolean> | null = null;

/**
 * Load the Paystack inline popup script once, on demand.
 */
export function loadPaystack(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.PaystackPop) return Promise.resolve(true);
  if (loading) return loading;

  loading = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      loading = null;
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return loading;
}

export interface PaystackOptions {
  key: string;
  email: string;
  /** Amount in the SMALLEST currency unit (kobo for NGN, cents for USD). */
  amount: number;
  currency: 'NGN' | 'USD';
  name?: string;
  onSuccess: (reference: string) => void;
  onCancel: () => void;
}

/**
 * Open the Paystack payment popup. Returns `true` if the popup opened.
 */
export async function openPaystack(opts: PaystackOptions): Promise<boolean> {
  const ok = await loadPaystack();
  if (!ok || typeof window === 'undefined' || !window.PaystackPop) return false;

  const ref = `PFM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const handler = window.PaystackPop.setup({
    key: opts.key,
    email: opts.email,
    amount: opts.amount,
    currency: opts.currency,
    ref,
    ...(opts.name ? { label: opts.name } : {}),
    metadata: {
      custom_fields: [
        {
          display_name: 'Donor Name',
          variable_name: 'donor_name',
          value: opts.name || 'Anonymous',
        },
      ],
    },
    callback: (response: any) => {
      opts.onSuccess(response?.reference || ref);
    },
    onClose: () => {
      opts.onCancel();
    },
  });

  handler.openIframe();
  return true;
}
