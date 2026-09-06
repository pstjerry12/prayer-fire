'use client';

import { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn';

interface CollapsibleToggleProps {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  maxHeightPx?: number;
}

/**
 * Outline toggle + inline max-height expand panel, matching the
 * "Give" toggle pattern from DonationCard so every collapsible
 * section in the app looks and behaves identically.
 */
export default function CollapsibleToggle({ label, open, onToggle, children, maxHeightPx = 1200 }: CollapsibleToggleProps) {
  return (
    <div>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full py-2.5 rounded-xl font-bold text-sm text-[#ff6a00] bg-transparent border border-[#ff6a00]/40 hover:bg-[#ff6a00]/5 transition-colors flex items-center justify-center gap-2"
      >
        {label}
        <ChevronDown className={cn('w-4 h-4 transition-transform duration-300', open && 'rotate-180')} />
      </button>

      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: open ? `${maxHeightPx}px` : '0px' }}
      >
        {children}
      </div>
    </div>
  );
}
