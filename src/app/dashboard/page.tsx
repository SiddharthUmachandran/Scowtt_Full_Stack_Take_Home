import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "../api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/app/dashboard/logout-button";
import MovieFactGenerator from "@/app/dashboard/movie-fact-generator";

function initialsFromName(input?: string | null) {
  const value = (input ?? "").trim();
  if (!value) return "";

  const parts = value.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/signin");
  }

  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      image: true,
    },
  });

  const favoriteMovie = await prisma.movie.findUnique({
    where: { userId },
    select: { title: true },
  });

  const displayName = user?.name ?? user?.email ?? "Guest";
  const displayEmail = user?.email ?? "No email provided";
  const displayInitials = initialsFromName(user?.name) || initialsFromName(user?.email) || "?";

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Dashboard</h1>
            <p className="mt-1 text-gray-600">Welcome back.</p>
          </div>
          <LogoutButton />
        </div>

        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center gap-4">
            {user?.image ? (
              // Keep plain img here to avoid remote image config for this scope.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={displayName}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-xl font-bold text-gray-700">
                {displayInitials}
              </div>
            )}

            <div className="min-w-0">
              <div className="truncate text-xl font-semibold text-gray-900">{displayName}</div>
              <div className="truncate text-gray-600">{displayEmail}</div>
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Favorite movie</h2>
          <p className="mt-2 text-gray-700">
            {favoriteMovie?.title ? favoriteMovie.title : "No favorite movie yet."}
          </p>

          {!favoriteMovie?.title && (
            <p className="mt-3 text-sm text-gray-500">
              Add one on{" "}
              <a className="font-medium text-blue-600 hover:underline" href="/onboarding">
                onboarding
              </a>
              .
            </p>
          )}
        </section>

        <MovieFactGenerator />
      </div>
    </main>
  );
}