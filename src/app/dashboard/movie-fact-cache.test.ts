import { describe, expect, it } from "vitest";

import { assertActorMatchesTarget, isFactFresh, FACT_CACHE_WINDOW_MS } from "./movie-fact-cache";

describe("Movie fact cache window", () => {
  it("returns cached fact when it is younger than 60 seconds", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const createdAt = new Date(now.getTime() - (FACT_CACHE_WINDOW_MS - 1));

    expect(isFactFresh({ createdAt, now, cacheWindowMs: FACT_CACHE_WINDOW_MS })).toBe(true);
  });

  it("does not treat a 60s-old fact as fresh (strictly less than)", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const createdAt = new Date(now.getTime() - FACT_CACHE_WINDOW_MS);

    expect(isFactFresh({ createdAt, now, cacheWindowMs: FACT_CACHE_WINDOW_MS })).toBe(false);
  });
});

describe("Authorization helper", () => {
  it("allows when actorUserId matches targetUserId", () => {
    expect(() =>
      assertActorMatchesTarget({ actorUserId: "user-1", targetUserId: "user-1" }),
    ).not.toThrow();
  });

  it("throws when actorUserId does not match targetUserId", () => {
    expect(() =>
      assertActorMatchesTarget({ actorUserId: "user-1", targetUserId: "user-2" }),
    ).toThrow("Unauthorized");
  });
});

