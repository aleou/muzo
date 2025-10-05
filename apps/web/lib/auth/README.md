# Authentication System

Professional authentication system for MUZO using NextAuth.js with custom MongoDB adapter and branded email templates.

## Architecture

The authentication system is split into modular, production-ready components:

```
lib/auth/
├── adapter.ts          # Custom MongoDB adapter (no replica set required)
├── auth-config.ts      # Shared NextAuth configuration (Edge Runtime compatible)
├── config.ts           # Environment configuration
├── email-template.ts   # Branded MUZO email templates
└── README.md          # This file

auth.ts                # Main NextAuth instance with providers
middleware.ts          # Route protection middleware
```

## Features

✅ **Email Magic Links** - Passwordless authentication with custom branded emails  
✅ **JWT Sessions** - Edge Runtime compatible session management  
✅ **MongoDB Standalone** - No replica set required (transaction fallbacks)  
✅ **Professional Email Templates** - MUZO branded HTML emails via Mailjet API  
✅ **Google OAuth** - Optional OAuth provider support  
✅ **Route Protection** - Middleware-based authentication guards  

## MongoDB Configuration

This adapter works with **standalone MongoDB** (no replica set required).

### How it works

When Prisma requires transactions (error P2031), the adapter automatically falls back to raw MongoDB commands using `$runCommandRaw`:

- `createVerificationToken` - Email verification tokens
- `updateUser` - User updates (emailVerified, etc.)
- `createSession` - Session creation
- `useVerificationToken` - Token validation and cleanup

### For Production

For best performance and reliability, configure MongoDB as a replica set:
- https://pris.ly/d/mongodb-replica-set

## Email Configuration

### Mailjet API

The system uses Mailjet's REST API (v3.1) for sending branded emails:

```typescript
// Endpoint: https://api.mailjet.com/v3.1/send
// Auth: Basic (API Key + Secret Key)
```

### Email Template

Professional HTML email with MUZO branding:
- **Gradient header** - Purple (#7c3aed → #6d28d9)
- **Responsive design** - Mobile-first approach
- **Security notices** - User education about magic links
- **Dual format** - HTML + Plain text versions

## Session Strategy

**JWT-based sessions** for Edge Runtime compatibility:

```typescript
session: {
  strategy: 'jwt',
  maxAge: 30 * 24 * 60 * 60, // 30 days
}
```

User data (id, role) is persisted in the JWT token and made available in the session.

## Protected Routes

Routes protected by middleware (see `middleware.ts`):

- `/dashboard/*` - User dashboard
- `/api/upload-url/*` - File upload endpoints

Add new protected routes in `middleware.ts` config:

```typescript
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/your-route/:path*',
  ],
};
```

## Environment Variables

Required in `.env`:

```env
# NextAuth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# MongoDB
DATABASE_URL=mongodb://user:pass@host:port/muzo?options

# Mailjet
EMAIL_SERVER_USER=your-mailjet-api-key
EMAIL_SERVER_PASSWORD=your-mailjet-secret-key
EMAIL_SERVER_HOST=in-v3.mailjet.com
EMAIL_SERVER_PORT=587
EMAIL_FROM=muzo@yourdomain.com

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

## Usage

### Sign In

```typescript
import { signIn } from '@/auth';

await signIn('email', { email: 'user@example.com' });
```

### Get Session

```typescript
import { auth } from '@/auth';

const session = await auth();
if (session?.user) {
  console.log(session.user.id, session.user.email, session.user.role);
}
```

### Sign Out

```typescript
import { signOut } from '@/auth';

await signOut();
```

## Development

The adapter logs a one-time warning about MongoDB configuration:

```
[auth] Using custom MongoDB adapter without transactions.
For production, configure MongoDB as a replica set.
See: https://pris.ly/d/mongodb-replica-set
```

This is informational and does not affect functionality.

## Production Checklist

- [ ] Configure MongoDB as a replica set (recommended)
- [ ] Set strong `NEXTAUTH_SECRET` (32+ characters)
- [ ] Configure proper `NEXTAUTH_URL` for production domain
- [ ] Verify Mailjet API credentials
- [ ] Test email delivery in production
- [ ] Review JWT token expiration (30 days default)
- [ ] Enable Google OAuth if needed
- [ ] Monitor authentication logs

## Troubleshooting

### Common Issues

**Prisma P2031 Error**  
✅ Normal - Adapter handles it automatically with raw MongoDB commands

**Email not sending**  
→ Check Mailjet API credentials  
→ Verify EMAIL_FROM domain is verified in Mailjet

**Session not persisting**  
→ Ensure cookies are enabled  
→ Check NEXTAUTH_URL matches your domain  
→ Verify NEXTAUTH_SECRET is set

**JWT Invalid Compact JWE**  
→ Old session cookies from before JWT migration  
→ Clear cookies and sign in again

## License

Proprietary - MUZO Platform
