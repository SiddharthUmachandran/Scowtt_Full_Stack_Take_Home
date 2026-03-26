"use server";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "../api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

import { assertActorMatchesTarget, isFactFresh, FACT_CACHE_WINDOW_MS } from "./movie-fact-cache";

type MovieFactState = {
  fact?: string;
  error?: string;
} | null;

const OPENAI_TIMEOUT_MS = 30_000;
const GENERATION_LOCK_TTL_MS = 60_000;

// Rate limiting: generation start attempts per user.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_STARTS_PER_WINDOW = 5;

// TODO: prune old MovieFactRequestLog rows periodically (or via a scheduled job)
// to avoid unbounded table growth.

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Normalize the fact text to remove extra spaces and newlines
function normalizeFactText(input: unknown) {
  if (typeof input !== "string") return null;
  const normalized = input.trim().replace(/\s+/g, " ");
  if (!normalized) return null;

  // Basic safety rails for UI.
  if (normalized.length > 400) return normalized.slice(0, 400).trim();
  return normalized;
}

async function fetchMovieFactFromOpenAI(movieTitle: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY in server environment.");
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    // Using fetch keeps the implementation lightweight (no extra dependency)
    // ensures API keys stay server-side.
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 160,
        messages: [
          {
            role: "system",
            content:
              "You generate short, accurate, non-marketing movie trivia facts. Return only the fact text (no quotes, no title, no extra words).",
          },
          {
            role: "user",
            content:
              `The user's favorite movie is: "${movieTitle}".\n\n` +
              "Generate one interesting factual movie trivia item specifically about that movie. " +
              "Keep it to 1-2 sentences.",
          },
        ],
      }),
    });

    if (!res.ok) {
      // Keep server error details off the client; include only status.
      throw new Error(`OpenAI request failed with status ${res.status}.`);
    }

    const data: unknown = await res.json();
    const content =
      (data as { choices?: Array<{ message?: { content?: unknown } }> | undefined })?.choices?.[0]
        ?.message?.content;

    return normalizeFactText(content);
  } finally {
    clearTimeout(timeout);
  }
}

async function getFavoriteMovieTitle(userId: string) {
  const favoriteMovie = await prisma.movie.findUnique({
    where: { userId },
    select: { title: true },
  });

  return favoriteMovie?.title ?? null;
}

async function getLatestFact(params: { userId: string; movieTitle: string }) {
  return prisma.movieFact.findFirst({
    where: { userId: params.userId, movieTitle: params.movieTitle },
    orderBy: { createdAt: "desc" },
    select: { factText: true, createdAt: true },
  });
}

type LockWhere = {
  userId_movieTitle: {
    userId: string;
    movieTitle: string;
  };
};

type Decision =
  | { mode: "cached"; factText: string }
  | { mode: "rate_limited" }
  | { mode: "in_progress"; factText: string | null }
  | { mode: "generate" };

async function releaseGenerationLock(lockWhere: LockWhere) {
  await prisma.movieFactGenerationLock.delete({ where: lockWhere }).catch(() => {
    /* lock might already be gone */
  });
}

async function decideGenerationPath(params: {
  actorUserId: string;
  movieTitle: string;
  now: Date;
  lockWhere: LockWhere;
}) {
  const { actorUserId, movieTitle, now, lockWhere } = params;

  return prisma.$transaction(async (tx) => {
    const factNow = await tx.movieFact.findFirst({
      where: { userId: actorUserId, movieTitle },
      orderBy: { createdAt: "desc" },
      select: { factText: true, createdAt: true },
    });

    if (factNow && isFactFresh({ createdAt: factNow.createdAt, now, cacheWindowMs: FACT_CACHE_WINDOW_MS })) {
      return { mode: "cached", factText: factNow.factText } satisfies Decision;
    }

    const existingLock = await tx.movieFactGenerationLock.findUnique({
      where: lockWhere,
      select: { expiresAt: true },
    });

    if (existingLock && existingLock.expiresAt.getTime() > now.getTime()) {
      return { mode: "in_progress", factText: factNow?.factText ?? null } satisfies Decision;
    }

    const requestCount = await tx.movieFactRequestLog.count({
      where: {
        userId: actorUserId,
        createdAt: { gte: new Date(now.getTime() - RATE_LIMIT_WINDOW_MS) },
      },
    });

    if (requestCount >= RATE_LIMIT_MAX_STARTS_PER_WINDOW) {
      return { mode: "rate_limited" } satisfies Decision;
    }

    await tx.movieFactRequestLog.create({
      data: { userId: actorUserId, movieTitle },
    });

    await tx.movieFactGenerationLock.upsert({
      where: lockWhere,
      create: {
        userId: actorUserId,
        movieTitle,
        expiresAt: new Date(now.getTime() + GENERATION_LOCK_TTL_MS),
      },
      update: {
        expiresAt: new Date(now.getTime() + GENERATION_LOCK_TTL_MS),
      },
    });

    return { mode: "generate" } satisfies Decision;
  });
}

async function resolveInProgressDecision(params: {
  actorUserId: string;
  movieTitle: string;
  fallbackFactText: string | null;
}) {
  const { actorUserId, movieTitle, fallbackFactText } = params;

  // Another tab is generating. Poll briefly for a newly cached fact.
  for (let attempt = 0; attempt < 3; attempt++) {
    await sleep(500);

    const fact = await getLatestFact({ userId: actorUserId, movieTitle });
    if (!fact) continue;

    if (isFactFresh({ createdAt: fact.createdAt, now: new Date(), cacheWindowMs: FACT_CACHE_WINDOW_MS })) {
      return { fact: fact.factText } satisfies MovieFactState;
    }

    // Fallback: return most recent cached fact even if slightly stale.
    return { fact: fact.factText } satisfies MovieFactState;
  }

  if (fallbackFactText) {
    return { fact: fallbackFactText } satisfies MovieFactState;
  }

  return { error: "Generating a movie fact right now. Please try again in a moment." } satisfies MovieFactState;
}

export async function generateMovieFact(_prevState: MovieFactState, _formData: FormData) {
  void _prevState;
  void _formData;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin");

  const actorUserId = session.user.id;
  const movieTitle = await getFavoriteMovieTitle(actorUserId);

  if (!movieTitle) {
    return { error: "Please add your favorite movie first on the onboarding page." } satisfies MovieFactState;
  }

  // Make authorization explicit: we only ever use the signed-in userId for queries.
  assertActorMatchesTarget({ actorUserId, targetUserId: actorUserId });

  const now = new Date();
  const latestFact = await getLatestFact({ userId: actorUserId, movieTitle });

  // 1) 60-second cache window
  if (latestFact && isFactFresh({ createdAt: latestFact.createdAt, now, cacheWindowMs: FACT_CACHE_WINDOW_MS })) {
    return { fact: latestFact.factText } satisfies MovieFactState;
  }

  const lockWhere = { userId_movieTitle: { userId: actorUserId, movieTitle } } as const;
  // 2) Burst/idempotency protection: generation lock + atomic rate limit.
  const decision = await decideGenerationPath({
    actorUserId,
    movieTitle,
    now,
    lockWhere,
  });

  if (decision.mode === "cached") {
    return { fact: decision.factText } satisfies MovieFactState;
  }

  if (decision.mode === "rate_limited") {
    return { error: "Too many requests. Please try again shortly." } satisfies MovieFactState;
  }

  if (decision.mode === "in_progress") {
    return resolveInProgressDecision({
      actorUserId,
      movieTitle,
      fallbackFactText: decision.factText,
    });
  }

  // decision.mode === "generate"
  try {
    const factText = await fetchMovieFactFromOpenAI(movieTitle);
    if (!factText) throw new Error("OpenAI returned an empty fact.");

    await prisma.movieFact.create({
      data: {
        userId: actorUserId,
        movieTitle,
        factText,
      },
    });
    await releaseGenerationLock(lockWhere);

    return { fact: factText } satisfies MovieFactState;
  } catch (err) {
    console.error("generateMovieFact openai error", { actorUserId, movieTitle, err });

    await releaseGenerationLock(lockWhere);

    // 3) Failure handling: OpenAI failed => return most recent cached fact if it exists.
    const mostRecent = await getLatestFact({ userId: actorUserId, movieTitle });
    if (mostRecent?.factText) {
      return { fact: mostRecent.factText } satisfies MovieFactState;
    }

    return { error: "Sorry—couldn't generate a movie fact right now. Please try again." } satisfies MovieFactState;
  }
}

