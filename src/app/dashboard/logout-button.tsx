"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/signin" })}
      className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
    >
      Logout
    </button>
  );
}

