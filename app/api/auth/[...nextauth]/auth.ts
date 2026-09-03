import CredentialsProvider from "next-auth/providers/credentials";
import axios from "axios";
import { AuthOptions } from "next-auth";

// Extend NextAuth types
declare module "next-auth" {
  interface User {
    id: string;
    token: string;
    role: string;
    fullName: string;
    officeId?: string | string[] | null;
    offices?: string[] | any[] | null;
    phone: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      token: string;
      role: string;
      fullName: string;
      officeId?: string | string[] | null;
      offices?: string[] | any[] | null;
      phone: string;
    };
  }
}

// Generate a fallback secret if NEXTAUTH_SECRET is not set (for development only)
const getSecret = () => {
  if (process.env.NEXTAUTH_SECRET) {
    return process.env.NEXTAUTH_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    console.warn('NEXTAUTH_SECRET is not set in production!');
  }
  // Fallback secret for development - users should set NEXTAUTH_SECRET in .env
  return "attendly-dev-secret-change-me";
};

export const authOptions: AuthOptions = {
  providers: [
    // The project currently resolves duplicate next-auth type declarations;
    // the provider runtime is compatible, but TypeScript compares the types
    // from both installations as distinct types.
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const res = await axios.post(
            `${process.env.NEXT_PUBLIC_BASE_URL}/users/login`,
            {
              email: credentials?.email,
              password: credentials?.password,
            }
          ); 

          const { user, token } = res.data.data;

          if (user?.role?.toUpperCase() === "AGENT") {
            throw new Error("Access Denied: Agents are not allowed to log in to the web application.");
          }

          if (user && token) {
            const officeIds = Array.isArray(user.officeIds)
              ? user.officeIds
              : Array.isArray(user.offices)
                ? user.offices
                : user.officeId
                  ? [user.officeId]
                  : [];

            return {
              id: user.id,
              email: user.email,
              token,
              role: user.role,
              phone: user.phone,
              fullName: `${user.name}`,
              officeId: officeIds[0] ?? user.officeId ?? null,
              offices: officeIds,
            };
          }
          return null;
        } catch (err: any) {
          console.error("Authorize error:", err);
          const message = err?.response?.data?.message || err?.message || "Invalid email or password";
          throw new Error(message);
        }
      },
    }) as any,
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: getSecret(),
  pages: {
    signIn: "/",
    error: "/",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.token = user.token;
        token.role = user.role;
        token.fullName = user.fullName;
        token.officeId = user.officeId ?? null;
        token.offices = user.offices ?? (user.officeId ? [user.officeId] : []);
        token.phone = user.phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session) {
        session.user.id = token.id as string;
        session.user.email = token.email ?? "";
        session.user.token = token.token as string;
        session.user.role = token.role as string;
        session.user.fullName = token.fullName as string;
        session.user.officeId = (token.officeId as string | string[] | null) ?? null;
        session.user.offices = (token.offices as any[] | string[] | null) ?? (token.officeId ? [token.officeId] : []);
        session.user.phone = token.phone as string;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
};
