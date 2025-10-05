feat: Implement professional authentication system with custom MongoDB adapter

## Overview
Complete authentication system with NextAuth.js, custom MongoDB adapter (no replica set required), and branded MUZO email templates via Mailjet API.

## Core Features
- ✅ Magic link email authentication with custom Mailjet integration
- ✅ JWT-based sessions (Edge Runtime compatible)
- ✅ Custom MongoDB adapter with transaction fallbacks
- ✅ Professional MUZO branded email templates
- ✅ Route protection middleware
- ✅ Google OAuth support (optional)

## New Files

### Authentication Core
- `apps/web/lib/auth/adapter.ts` - Custom MongoDB adapter without replica set requirement
- `apps/web/lib/auth/auth-config.ts` - Shared NextAuth config (Edge Runtime compatible)
- `apps/web/lib/auth/email-template.ts` - Professional MUZO branded email templates
- `apps/web/lib/auth/README.md` - Comprehensive authentication documentation

### Configuration
- `apps/web/auth.ts` - Main NextAuth instance with providers
- `apps/web/middleware.ts` - Route protection middleware

### Documentation
- `.github/AUTHENTICATION_IMPLEMENTATION.md` - Implementation details and deployment guide

## Modified Files
- `packages/db/prisma/schema.prisma` - Added `emailVerified` field to User model
- `apps/web/lib/data/dashboard.ts` - Fixed TypeScript imports (removed .js extensions)

## Removed Files
- `AUTHENTICATION_FIX.md` - Temporary debug file (no longer needed)

## Technical Details

### MongoDB Standalone Support
Custom adapter automatically handles Prisma transaction errors (P2031) with raw MongoDB commands:
- `$runCommandRaw` fallbacks for all transaction-requiring operations
- No replica set configuration needed
- Production-ready with informational warning

### Email Integration
- Mailjet API v3.1 (REST endpoint, not SMTP)
- Custom HTML + plain text templates
- MUZO branding with purple gradient (#7c3aed → #6d28d9)
- Responsive design, security notices

### Session Management
- JWT strategy for Edge Runtime compatibility
- 30-day expiration
- User data (id, role) persisted in token
- Compatible with Next.js middleware

### Code Quality
- Full JSDoc documentation
- TypeScript strict mode
- Professional error handling
- Modular architecture
- Edge Runtime compatible

## Environment Variables Required
```env
NEXTAUTH_SECRET, NEXTAUTH_URL
DATABASE_URL (MongoDB)
EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD, EMAIL_FROM (Mailjet)
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (optional)
```

## Testing Completed
✅ Email magic link flow
✅ JWT session creation
✅ Route protection
✅ MongoDB standalone compatibility
✅ Edge Runtime middleware
✅ Mailjet API integration

## Breaking Changes
None - New feature addition

## Migration Notes
- Old session cookies may show "Invalid Compact JWE" error (expected, clear cookies)
- MongoDB replica set recommended for production but not required

---
Ready for production deployment 🚀
