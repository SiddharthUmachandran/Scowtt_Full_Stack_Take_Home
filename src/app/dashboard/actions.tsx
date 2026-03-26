"use server";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "../api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

type MovieFactState = {
  fact?: string;
  error?: string;
} | null;

type MovieFactCache = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
};

// Cache-ready scaffolding: plug in a cache implementation later.
// For now we intentionally do not cache facts.
//
// TODO (rate limiting + 60s caching + burst/idempotency):
// 1) 60-Second Cache Window:
//    - Store facts in a DB table keyed by (userId, movieTitle).
//    - If the most recent fact is < 60s old, return it.
//    - Otherwise generate a new fact and store it.
// 2) Burst / Idempotency Protection:
//    - Recommended easiest-next option: a DB-backed "generation in progress" row
//      (unique on userId+movieTitle) with a short TTL, checked inside a transaction.
//    - Alternate options exist (unique constraint per time window), but DB "in progress"
//      tends to be easiest/least error-prone next.
// 3) Failure Handling:
//    - If OpenAI fails, return the most recent cached fact (if any).
//    - Otherwise return a user-friendly error.
const cache: MovieFactCache | null = null;

// Normalize the fact text to remove extra spaces and newlines
function normalizeFactText(input: unknown) {
  if (typeof input !== "string") return null;
  const text = input.trim();
  if (!text) return null;
  return text.replace(/\s+/g, " ");
}

async function fetchMovieFactFromOpenAI(movieTitle: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY in server environment.");
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

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

export async function generateMovieFact(_prevState: MovieFactState, _formData: FormData) {
  // Avoid lint warnings: useActionState passes these args, even if we don't need them now.
  void _prevState;
  void _formData;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const userId = session.user.id;
  const cacheKey = `movie-fact:${userId}`;

  if (cache) {
    const cached = await cache.get(cacheKey);
    if (cached) return { fact: cached } satisfies MovieFactState;
  }

  const favoriteMovie = await prisma.movie.findUnique({
    where: { userId },
    select: { title: true },
  });

  if (!favoriteMovie?.title) {
    return {
      error: "Please add your favorite movie first on the onboarding page.",
    } satisfies MovieFactState;
  }

  try {
    const fact = await fetchMovieFactFromOpenAI(favoriteMovie.title);
    if (!fact) {
      return { error: "Unable to generate a movie fact right now." } satisfies MovieFactState;
    }

    if (cache) {
      await cache.set(cacheKey, fact);
    }

    return { fact } satisfies MovieFactState;
  } catch (err) {
    // Server-side logging (monitoring hook).
    console.error("generateMovieFact openai error", {
      userId,
      movieTitle: favoriteMovie.title,
      err,
    });

    // User-safe message (no internal details/status codes).
    return { error: "Sorry-couldn't generate a movie fact right now. Please try again." } satisfies MovieFactState;
  }
}

