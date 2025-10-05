/**
 * NextAuth configuration with custom providers and branded email templates.
 * 
 * This file configures authentication providers (Email, Google) and integrates
 * with the custom MongoDB adapter and MUZO branded email templates.
 */

import NextAuth from 'next-auth';
import type { Adapter } from 'next-auth/adapters';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';
import { createAuthAdapter } from '@/lib/auth/adapter';
import { authConfig } from '@/lib/auth/auth-config';
import { getAuthConfig } from '@/lib/auth/config';
import { getMuzoEmailTemplate, getMuzoEmailText } from '@/lib/auth/email-template';

const config = getAuthConfig();

const providers = [
  EmailProvider({
    from: config.email.from,
    server: config.email.server,
    // Custom MUZO branded email template
    async sendVerificationRequest({ identifier: email, url, provider }) {
      const { host } = new URL(url);
      const { server, from } = provider;

      // Mailjet API uses api.mailjet.com for REST API, not SMTP server
      const result = await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic ' + Buffer.from(server.auth.user + ':' + server.auth.pass).toString('base64'),
        },
        body: JSON.stringify({
          Messages: [
            {
              From: {
                Email: from.split('<')[1]?.split('>')[0] || from,
                Name: 'MUZO',
              },
              To: [
                {
                  Email: email,
                },
              ],
              Subject: '🎨 Connexion à votre espace MUZO',
              TextPart: getMuzoEmailText({ url, host, email }),
              HTMLPart: getMuzoEmailTemplate({ url, host, email }),
            },
          ],
        }),
      });

      if (!result.ok) {
        const error = await result.json();
        throw new Error(`Mailjet API error: ${JSON.stringify(error)}`);
      }
    },
  }),
  ...(config.oauth.google?.clientId && config.oauth.google?.clientSecret
    ? [
        GoogleProvider({
          clientId: config.oauth.google.clientId,
          clientSecret: config.oauth.google.clientSecret,
        }),
      ]
    : []),
];

const adapter: Adapter = createAuthAdapter();

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter,
  providers,
});
