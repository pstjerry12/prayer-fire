'use client';

import { useMemo } from 'react';
import { useCachedJson } from '@/lib/cachedJson';
import { DEFAULT_PLAN_CONFIG, parsePlanConfig, type PlanConfig } from '@/lib/planConfig';

/** The plan descriptions and Leader tiers: the defaults at once, the admin's version as soon as it is loaded. */
export function usePlanConfig(): PlanConfig {
  const data = useCachedJson<{ config: unknown }>('/api/plan-config', 5 * 60 * 1000);
  return useMemo(() => (data?.config ? parsePlanConfig(data.config) : DEFAULT_PLAN_CONFIG), [data]);
}
