
"use client";

import { useActionState } from "react";

import { generateMovieFact } from "./actions";

type MovieFactState = {
  fact?: string;
  error?: string;
} | null;

export default function MovieFactGenerator() {
  const [state, formAction, isPending] = useActionState<MovieFactState, FormData>(
    generateMovieFact,
    null,
  );

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3 text-base font-semibold text-gray-900">
          <span>Don&apos;t know what to watch?</span>
          <form action={formAction}>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300"
            >
              {isPending ? "Generating..." : "Generate a Movie Fact"}
            </button>
          </form>
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        {state?.fact && (
          <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-800 ring-1 ring-gray-200">
            {state.fact}
          </div>
        )}
      </div>
    </section>
  );
}

