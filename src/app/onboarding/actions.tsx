"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { MovieSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export type OnboardingState = {
  error?: string;
} | null;

export async function completeOnboarding(
  _prevState: OnboardingState, // First arg from useActionState.
  formData: FormData // Form payload.
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    // user must be authenticated
    redirect("/signin");
  }

  const rawTitle = formData.get("favoriteMovie");
  
  // Validate without throwing.
  const validation = MovieSchema.safeParse({ title: rawTitle });

  if (!validation.success) {
    const titleError = validation.error.issues.find((issue) => issue.path[0] === "title")?.message;

    // Return a simple user-facing validation error.
    return { 
      error: titleError || "Invalid title"  
    };
  }

  try {
    // Keep one favorite movie per user.
    await prisma.$transaction([
      prisma.movie.upsert({
        where: { userId: session.user.id },
        create: { title: validation.data.title, userId: session.user.id },
        update: { title: validation.data.title },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { hasCompletedOnboarding: true },
      }),
    ]);
  } catch (dbError) {
    console.error("completeOnboarding db error", { userId: session.user.id, dbError });
    return { error: "Couldn't save your favorite movie. Please try again." };
  }

  redirect("/dashboard");
}