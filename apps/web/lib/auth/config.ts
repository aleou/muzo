import { z } from 'zod';

const schema = z.object({
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  EMAIL_FROM: z.string().email('EMAIL_FROM must be a valid email address'),
  EMAIL_SERVER_HOST: z.string().min(1, 'EMAIL_SERVER_HOST is required'),
  EMAIL_SERVER_PORT: z.coerce.number().int().positive(),
  EMAIL_SERVER_USER: z.string().min(1, 'EMAIL_SERVER_USER is required'),
  EMAIL_SERVER_PASSWORD: z.string().min(1, 'EMAIL_SERVER_PASSWORD is required'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

interface AuthConfig {
  nextAuthSecret: string;
  email: {
    from: string;
    server: {
      host: string;
      port: number;
      auth: {
        user: string;
        pass: string;
      };
      secure: boolean;
    };
  };
  oauth: {
    google: {
      clientId: string;
      clientSecret: string;
    } | null;
  };
}

let cachedConfig: AuthConfig | null = null;

export function getAuthConfig(): AuthConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parsed = schema.safeParse({
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST,
    EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT,
    EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER,
    EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  });

  if (!parsed.success) {
    throw new Error('Invalid authentication environment variables: ' + parsed.error.message);
  }

  const env = parsed.data;
  const secure = env.EMAIL_SERVER_PORT === 465;

  cachedConfig = {
    nextAuthSecret: env.NEXTAUTH_SECRET,
    email: {
      from: env.EMAIL_FROM,
      server: {
        host: env.EMAIL_SERVER_HOST,
        port: env.EMAIL_SERVER_PORT,
        secure,
        auth: {
          user: env.EMAIL_SERVER_USER,
          pass: env.EMAIL_SERVER_PASSWORD,
        },
      },
    },
    oauth: {
      google:
        env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
          ? {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
            }
          : null,
    },
  } satisfies AuthConfig;

  return cachedConfig;
}
