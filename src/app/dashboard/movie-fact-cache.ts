export const FACT_CACHE_WINDOW_MS = 60_000;

export function isFactFresh(params: {
  createdAt: Date | null | undefined;
  now: Date;
  cacheWindowMs?: number;
}) {
  const createdAt = params.createdAt;
  if (!createdAt) return false;

  const cacheWindowMs = params.cacheWindowMs ?? FACT_CACHE_WINDOW_MS;
  return params.now.getTime() - createdAt.getTime() < cacheWindowMs;
}

// Authorization helper: ensures we never accidentally query another user's facts.
export function assertActorMatchesTarget(params: {
  actorUserId: string;
  targetUserId: string;
}) {
  if (params.actorUserId !== params.targetUserId) {
    throw new Error("Unauthorized");
  }
}

