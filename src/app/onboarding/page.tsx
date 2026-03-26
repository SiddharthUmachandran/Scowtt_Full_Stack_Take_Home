'use client';

import { useActionState } from "react"; // Use 'useFormState' if on Next.js 14
import { completeOnboarding } from "./actions";

export default function OnboardingPage() {
  // state will hold the return value of your action (the error)
  // formAction is what we pass to the <form>
  const [state, formAction, isPending] = useActionState(completeOnboarding, null);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-sm border">
        <h1 className="text-2xl font-bold mb-2">Welcome!</h1>
        <p className="text-gray-600 mb-8">Tell us your favorite movie to get started.</p>
        
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Favorite Movie</label>
            <input 
              name="favoriteMovie"
              required
              disabled={isPending}
              className="border p-2 rounded text-black focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="e.g. The Dark Knight"
            />
            {/* Show the Zod error message if it exists */}
            {state?.error && (
              <p className="text-red-500 text-xs mt-1">{state.error}</p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={isPending}
            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition disabled:bg-blue-300"
          >
            {isPending ? "Saving..." : "Save and Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}