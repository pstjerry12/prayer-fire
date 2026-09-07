'use client';

/**
 * Flutterwave v3 inline checkout integration.
 * Loads https://checkout.flutterwave.com/v3.js and calls window.FlutterwaveCheckout.
 */

let scriptLoaded: Promise<boolean> | null = null;

function loadFlutterwaveScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as any).FlutterwaveCheckout) return Promise.resolve(true);
  if (scriptLoaded) return scriptLoaded;

  scriptLoaded = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.flutterwave.com/v3.js';
    script.async = false;
    script.onload = () => {
      console.log('[Flutterwave] v3 script loaded');
      resolve(!!(window as any).FlutterwaveCheckout);
    };
    script.onerror = () => {
      console.error('[Flutterwave] v3 script failed to load');
      scriptLoaded = null;
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return scriptLoaded;
}

export interface FlutterwaveOptions {
  key: string;
  email: string;
  amount: number;
  currency: 'NGN' | 'USD' | 'GBP' | 'EUR';
  name?: string;
  onSuccess: (reference: string) => void;
  onCancel: () => void;
  onError?: (error: any) => void;
}

/**
 * Open the Flutterwave inline payment popup using the v3 API.
 * Note: unlike Paystack (which expects kobo/cents), Flutterwave expects
 * the actual amount (e.g. 1000 for ₦1000), not a smallest-unit value.
 */
export async function openFlutterwave(opts: FlutterwaveOptions): Promise<boolean> {
  console.log('[Flutterwave] Opening with key:', opts.key?.substring(0, 12) + '...');
  console.log('[Flutterwave] Amount:', opts.amount, opts.currency);

  const ok = await loadFlutterwaveScript();
  const FlutterwaveCheckout = (window as any).FlutterwaveCheckout;

  if (!ok || !FlutterwaveCheckout) {
    console.error('[Flutterwave] FlutterwaveCheckout not available');
    return false;
  }

  try {
    // Guard against onclose firing after a successful/failed callback —
    // Flutterwave calls onclose even when the payment already completed.
    let settled = false;

    const txRef = `PFM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    FlutterwaveCheckout({
      public_key: opts.key,
      tx_ref: txRef,
      amount: opts.amount,
      currency: opts.currency,
      payment_options: 'card,mobilemoney,ussd,banktransfer',
      customer: {
        email: opts.email,
        name: opts.name || 'Anonymous',
      },
      customizations: {
        title: 'Prayer Fire Movement',
        description: 'Support the global prayer movement',
      },
      meta: {
        donor_name: opts.name || 'Anonymous',
      },
      callback: (response: any) => {
        console.log('[Flutterwave] Payment callback:', response);
        settled = true;
        if (response?.status === 'successful' || response?.status === 'completed') {
          opts.onSuccess(response?.tx_ref || txRef);
        } else if (opts.onError) {
          opts.onError(response);
        }
      },
      onclose: () => {
        console.log('[Flutterwave] Popup closed by user');
        if (!settled) {
          settled = true;
          opts.onCancel();
        }
      },
    });

    return true;
  } catch (err) {
    console.error('[Flutterwave] Error opening checkout:', err);
    if (opts.onError) opts.onError(err);
    return false;
  }
}
