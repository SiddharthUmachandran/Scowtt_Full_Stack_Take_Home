'use client';
import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-10 shadow-lg text-center">
        <h1 className="text-3xl font-extrabold text-gray-900">Movie Memory</h1>
        <p className="text-gray-600">Sign in to save your favorite cinema moments.</p>
        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}