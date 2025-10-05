import type { NextAuthConfig } from 'next-auth';
import { getAuthConfig } from './config';

const config = getAuthConfig();

/**
 * Core NextAuth configuration shared between main app and middleware.
 * This configuration is Edge Runtime compatible (no Node.js dependencies).
 */
export const authConfig: NextAuthConfig = {
  secret: config.nextAuthSecret,
  trustHost: true,
  session: {
    strategy: 'jwt', // Use JWT for Edge Runtime compatibility
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/sign-in',
    verifyRequest: '/auth/verify-request',
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      // Persist user data in JWT token
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (!session.user) {
        return session;
      }

      // Add user data from JWT token to session
      if (token?.id) {
        session.user.id = token.id as string;
      }

      if (token?.role) {
        session.user.role = token.role as string;
      }

      return session;
    },
  },
  events: {
    async error(message) {
      if (message?.name === 'AdapterError') {
        console.error('[auth] Adapter layer failed. Check database connection.', message);
      }
    },
  },
};
