"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { MovieSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

// Define a type for our state to avoid 'any'
export type OnboardingState = {
  error?: string;
} | null;

export async function completeOnboarding(
  prevState: OnboardingState, // React injects this first
  formData: FormData          // This becomes the second argument
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    // Production-grade behavior: never throw from server actions for auth failures.
    // Redirect keeps UX consistent and avoids leaking stack traces.
    redirect("/signin");
  }

  const rawTitle = formData.get("favoriteMovie");
  
  // Use safeParse to handle the result without throwing errors
  const validation = MovieSchema.safeParse({ title: rawTitle });

  if (!validation.success) {
    // Return the error object that useActionState will catch
    return { 
      error: validation.error.flatten().fieldErrors.title?.[0] || "Invalid title" 
    };
  }

  try {
    // Production-grade data modeling: enforce "one favorite movie per user"
    // by updating the existing row (instead of inserting duplicates).
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
    // Server-side logging (monitoring hook): keep details out of the client response.
    console.error("completeOnboarding db error", { userId: session.user.id, dbError });
    return { error: "Couldn't save your favorite movie. Please try again." };
  }

  // Redirect happens outside the try/catch because redirect() 
  // technically throws a special Next.js error to handle the jump
  redirect("/dashboard");
}