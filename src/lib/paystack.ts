'use client';

/**
 * Paystack v2 integration using @paystack/inline-js
 * The v1 script (js.paystack.co/v1/inline.js) is buggy on mobile phones.
 * The v2 npm package works reliably on all devices.
 */

// Dynamic import type
type PaystackPopV2 = {
  newTransaction: (opts: any) => any;
  checkout: (opts: any) => Promise<any>;
};

let paystackInstance: any = null;

async function getPaystackPop(): Promise<PaystackPopV2 | null> {
  if (paystackInstance) return paystackInstance;
  if (typeof window === 'undefined') return null;

  try {
    // Use the npm package which bundles the v2 inline.js
    const mod = await import('@paystack/inline-js');
    const PaystackPop = (mod as any).default || (mod as any).PaystackPop;
    if (!PaystackPop) {
      console.error('[Paystack] Could not find PaystackPop in module');
      return null;
    }
    paystackInstance = new PaystackPop();
    return paystackInstance;
  } catch (err) {
    console.error('[Paystack] Failed to load @paystack/inline-js:', err);

    // Fallback: try loading v2 script directly
    try {
      await loadScriptV2();
      if ((window as any).PaystackPop) {
        paystackInstance = new (window as any).PaystackPop();
        return paystackInstance;
      }
    } catch (err2) {
      console.error('[Paystack] Fallback script also failed:', err2);
    }

    return null;
  }
}

function loadScriptV2(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).PaystackPop) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v2/inline.js';
    script.async = false;
    script.onload = () => {
      console.log('[Paystack] v2 script loaded');
      resolve(!!(window as any).PaystackPop);
    };
    script.onerror = () => {
      console.error('[Paystack] v2 script failed to load');
      resolve(false);
    };
    document.head.appendChild(script);
  });
}

export interface PaystackOptions {
  key: string;
  email: string;
  amount: number;
  currency: 'NGN' | 'USD';
  name?: string;
  onSuccess: (reference: string) => void;
  onCancel: () => void;
  onError?: (error: any) => void;
}

/**
 * Open the Paystack payment popup using v2 API.
 * Works on mobile phones, tablets, and desktop.
 */
export async function openPaystack(opts: PaystackOptions): Promise<boolean> {
  console.log('[Paystack] Opening with key:', opts.key?.substring(0, 10) + '...');
  console.log('[Paystack] Amount:', opts.amount, opts.currency);

  const pop = await getPaystackPop();

  if (!pop) {
    console.error('[Paystack] PaystackPop not available');
    // Last resort: try v1 script
    return openPaystackV1(opts);
  }

  try {
    // v2 API: newTransaction
    const transaction = pop.newTransaction({
      key: opts.key,
      email: opts.email,
      amount: opts.amount,
      currency: opts.currency,
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
      onSuccess: (response: any) => {
        console.log('[Paystack] Payment success:', response);
        opts.onSuccess(response?.reference || response?.data?.reference || '');
      },
      onCancel: () => {
        console.log('[Paystack] Popup closed by user');
        opts.onCancel();
      },
      onError: (error: any) => {
        console.error('[Paystack] Popup error:', error);
        if (opts.onError) opts.onError(error);
      },
    });

    console.log('[Paystack] v2 transaction opened:', !!transaction);
    return !!transaction;
  } catch (err) {
    console.error('[Paystack] v2 error, falling back to v1:', err);
    return openPaystackV1(opts);
  }
}

// ── Fallback: v1 API (old script) ────────────────────────────────
let v1Loaded: Promise<boolean> | null = null;

function loadV1(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as any).PaystackPop?.setup) return Promise.resolve(true);
  if (v1Loaded) return v1Loaded;

  v1Loaded = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = false;
    script.onload = () => resolve(!!(window as any).PaystackPop?.setup);
    script.onerror = () => { v1Loaded = null; resolve(false); };
    document.head.appendChild(script);
  });

  return v1Loaded;
}

async function openPaystackV1(opts: PaystackOptions): Promise<boolean> {
  const ok = await loadV1();
  const pop = (window as any).PaystackPop;
  if (!ok || !pop?.setup) return false;

  try {
    const ref = `PFM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const handler = pop.setup({
      key: opts.key,
      email: opts.email,
      amount: opts.amount,
      currency: opts.currency,
      ref,
      ...(opts.name ? { label: opts.name } : {}),
      metadata: {
        custom_fields: [{
          display_name: 'Donor Name',
          variable_name: 'donor_name',
          value: opts.name || 'Anonymous',
        }],
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
  } catch {
    return false;
  }
}

// Keep old export for backwards compat
export function loadPaystack(): Promise<boolean> {
  return getPaystackPop().then(p => !!p);
}
