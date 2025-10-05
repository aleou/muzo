import { prisma } from '@muzo/db';
import type { Adapter } from 'next-auth/adapters';

/**
 * Custom NextAuth adapter for MongoDB without replica set.
 * 
 * This adapter bypasses Prisma's transaction requirements by using
 * MongoDB's $runCommandRaw for operations that would normally require transactions.
 * 
 * @see https://pris.ly/d/mongodb-replica-set
 */

let hasWarningBeenShown = false;

/**
 * Log a one-time warning about MongoDB configuration.
 * For production, consider configuring MongoDB as a replica set for full transaction support.
 */
function logWarning() {
  if (hasWarningBeenShown) return;
  hasWarningBeenShown = true;
  console.warn(
    '[auth] Using custom MongoDB adapter without transactions. ' +
      'For production, configure MongoDB as a replica set. ' +
      'See: https://pris.ly/d/mongodb-replica-set'
  );
}

/**
 * Generate a valid MongoDB ObjectId.
 * @returns A 24-character hexadecimal string representing a MongoDB ObjectId
 */
function generateObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const randomBytes = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0')
  ).join('');
  return timestamp + randomBytes.substring(0, 16);
}

/**
 * Create a NextAuth adapter for MongoDB without replica set support.
 * Implements transaction fallbacks using raw MongoDB commands.
 */
export function createAuthAdapter(): Adapter {
  logWarning();

  return {
    async createUser(data) {
      return prisma.user.create({ data });
    },

    async getUser(id) {
      return prisma.user.findUnique({ where: { id } });
    },

    async getUserByEmail(email) {
      return prisma.user.findUnique({ where: { email } });
    },

    async getUserByAccount({ providerAccountId, provider }) {
      const account = await prisma.account.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        include: { user: true },
      });
      return account?.user ?? null;
    },

    async updateUser({ id, ...data }) {
      try {
        return await prisma.user.update({ where: { id }, data });
      } catch (error: any) {
        // Fallback to raw MongoDB command if transactions are not available
        if (error?.code === 'P2031') {
          
          // Convert dates to MongoDB Extended JSON format
          const updateDoc: any = {};
          for (const [key, value] of Object.entries(data)) {
            if (value instanceof Date) {
              updateDoc[key] = { $date: value.toISOString() };
            } else {
              updateDoc[key] = value;
            }
          }
          
          await prisma.$runCommandRaw({
            update: 'User',
            updates: [
              {
                q: { _id: { $oid: id } },
                u: { $set: updateDoc },
              },
            ],
          });
          
          // Fetch and return the updated user
          return await prisma.user.findUnique({ where: { id } });
        }
        throw error;
      }
    },

    async deleteUser(userId) {
      return prisma.user.delete({ where: { id: userId } });
    },

    async linkAccount(account) {
      return prisma.account.create({ data: account });
    },

    async unlinkAccount({ providerAccountId, provider }) {
      const account = await prisma.account.delete({
        where: { provider_providerAccountId: { provider, providerAccountId } },
      });
      return account;
    },

    async createSession(session) {
      try {
        return await prisma.session.create({ data: session });
      } catch (error: any) {
        // Fallback to raw MongoDB command if transactions are not available
        if (error?.code === 'P2031') {
          
          const objectId = generateObjectId();
          
          await prisma.$runCommandRaw({
            insert: 'Session',
            documents: [
              {
                _id: { $oid: objectId },
                sessionToken: session.sessionToken,
                userId: { $oid: session.userId },
                expires: { $date: new Date(session.expires).toISOString() },
              },
            ],
          });
          
          // Return the session in the format NextAuth expects
          return {
            id: objectId,
            sessionToken: session.sessionToken,
            userId: session.userId,
            expires: session.expires,
          };
        }
        throw error;
      }
    },

    async getSessionAndUser(sessionToken) {
      const userAndSession = await prisma.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      });
      if (!userAndSession) return null;
      const { user, ...session } = userAndSession;
      return { user, session };
    },

    async updateSession({ sessionToken, ...data }) {
      return prisma.session.update({ where: { sessionToken }, data });
    },

    async deleteSession(sessionToken) {
      return prisma.session.delete({ where: { sessionToken } });
    },

    async createVerificationToken(data) {
      try {
        return await prisma.verificationToken.create({ data });
      } catch (error: any) {
        // Fallback to raw MongoDB command if transactions are not available
        if (error?.code === 'P2031') {
          
          const objectId = generateObjectId();
          
          await prisma.$runCommandRaw({
            insert: 'VerificationToken',
            documents: [
              {
                _id: { $oid: objectId },
                identifier: data.identifier,
                token: data.token,
                expires: { $date: new Date(data.expires).toISOString() },
              },
            ],
          });
          
          // Return the document in the format NextAuth expects
          return {
            id: objectId,
            identifier: data.identifier,
            token: data.token,
            expires: data.expires,
          };
        }
        throw error;
      }
    },

    async useVerificationToken({ identifier, token }) {
      try {
        const verificationToken = await prisma.verificationToken.findUnique({
          where: { identifier_token: { identifier, token } },
        });

        if (!verificationToken) return null;

        // Try to delete normally first
        try {
          await prisma.verificationToken.delete({
            where: { identifier_token: { identifier, token } },
          });
        } catch (error: any) {
          // Fallback to raw MongoDB command if transactions are not available
          if (error?.code === 'P2031') {
            await prisma.$runCommandRaw({
              delete: 'VerificationToken',
              deletes: [
                {
                  q: { identifier, token },
                  limit: 1,
                },
              ],
            });
          } else {
            throw error;
          }
        }

        return verificationToken;
      } catch (error) {
        // If token doesn't exist, return null
        return null;
      }
    },
  };
}