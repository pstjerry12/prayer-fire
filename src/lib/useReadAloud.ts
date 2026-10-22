'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { readItems, type ReadController, type ReaderState, type SpeechItem } from './readAloud';

/** Read-aloud state for a component: start, pause/resume and stop, plus what is being read. */
export function useReadAloud() {
  const [state, setState] = useState<ReaderState>('idle');
  const [index, setIndex] = useState<number | null>(null);
  const [problem, setProblem] = useState(false);
  const [problemDetail, setProblemDetail] = useState<string | null>(null);
  const controller = useRef<ReadController | null>(null);

  const start = useCallback((items: SpeechItem[], lang?: string) => {
    setProblem(false);
    setProblemDetail(null);
    controller.current = readItems(items, {
      lang,
      onItemStart: (i) => setIndex(i),
      onStateChange: setState,
      onEnd: (reason, detail) => {
        setIndex(null);
        controller.current = null;
        if (reason === 'unsupported' || reason === 'error') {
          setProblem(true);
          setProblemDetail(detail ?? null);
        }
      },
    });
  }, []);

  const stop = useCallback(() => controller.current?.stop(), []);
  const pause = useCallback(() => controller.current?.pause(), []);
  const resume = useCallback(() => controller.current?.resume(), []);

  // Stop reading when the page or component goes away.
  useEffect(
    () => () => {
      controller.current?.stop();
    },
    []
  );

  return { state, index, problem, problemDetail, start, stop, pause, resume, reading: state !== 'idle' };
}
