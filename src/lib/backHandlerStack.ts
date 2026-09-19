'use client';

// A tiny stack any mounted component can push an in-page "back" handler
// onto. BackButtonExit checks this first on every hardware/gesture back
// press: if the topmost handler has somewhere to go (a drill-down step,
// an open sub-view), it consumes the press and nothing else happens — no
// navigation, no exit toast. Only once nothing on the stack claims the
// press does the standard double-tap-to-exit behavior take over.
//
// A plain module-level stack (not React context) on purpose: registering
// is a side effect tied to a component's lifecycle, not something that
// needs to trigger a re-render anywhere.

type BackHandler = () => boolean;

const stack: BackHandler[] = [];

/** Call while a component with its own "back" semantics is mounted. */
export function pushBackHandler(handler: BackHandler): () => void {
  stack.push(handler);
  return () => {
    const idx = stack.lastIndexOf(handler);
    if (idx !== -1) stack.splice(idx, 1);
  };
}

/** Returns true if some handler consumed the press (caller should stop). */
export function consumeBackPress(): boolean {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i]()) return true;
  }
  return false;
}
