import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Elite: Profile mapping handles missing data gracefully
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name || profile.given_name || "New User",
          email: profile.email,
          image: profile.picture || null, // Graceful fallback for missing photo
        };
      },
    }),
  ],
  pages: {
    signIn: "/signin",
    newUser: "/onboarding", // Redirects here ONLY on first-time account creation
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // If it's a standard sign-in (not new user), go to dashboard
      if (url === baseUrl) return `${baseUrl}/dashboard`;
      return url;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };