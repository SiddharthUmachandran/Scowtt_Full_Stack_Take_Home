import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const session = await getServerSession(authOptions);

  // If already logged in, skip the landing page and go to dashboard
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white font-sans text-black">
      <main className="flex flex-col items-center gap-8 px-8 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
          Movie <span className="text-blue-600">Memory</span>
        </h1>
        <p className="max-w-md text-xl text-zinc-600">
          Capture your cinematic journey. Save your favorites and discover your next obsession.
        </p>
        
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/signin"
            className="flex h-12 items-center justify-center rounded-full bg-black px-8 text-base font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Get Started
          </Link>
          <a
            href="https://github.com/your-username/your-repo"
            target="_blank"
            className="flex h-12 items-center justify-center rounded-full border border-zinc-200 px-8 text-base font-medium transition-colors hover:bg-zinc-50"
          >
            View Source
          </a>
        </div>
      </main>
      
      <footer className="absolute bottom-8 text-sm text-zinc-400">
        Built for the Scowtt Full-Stack Challenge
      </footer>
    </div>
  );
}