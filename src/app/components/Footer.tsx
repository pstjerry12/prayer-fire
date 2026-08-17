import { Flame } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="py-8 px-4 text-center border-t border-slate-200 mt-8">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Flame className="w-5 h-5 text-red-500" />
        <span className="text-slate-900 font-serif font-bold">Prayer Fire Movement</span>
      </div>
      <p className="text-slate-500 text-xs mb-1">Ignite. Intercede. Overcome.</p>
      <p className="text-slate-500 text-[10px] mb-1">Praying like Daniel</p>
      <p className="text-slate-400 text-[10px]">© 2024 Prayer Fire Movement. All rights reserved.</p>
    </footer>
  );
}
