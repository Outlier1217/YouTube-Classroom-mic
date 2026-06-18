import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const teacher = await prisma.teacher.findUnique({
          where: { email: credentials.email },
        });
        if (!teacher) return null;
        const valid = await bcrypt.compare(credentials.password, teacher.password);
        if (!valid) return null;
        return { id: teacher.id, email: teacher.email, name: teacher.channelName };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token) session.user.id = token.id as string;
      return session;
    },
  },
  pages: { signIn: "/teacher" },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
