# MUZO Web App

Application Next.js (App Router) servant à exposer l'interface utilisateur et les API routes publiques.

## Scripts

- "pnpm dev --filter @muzo/web" : démarre l'interface.
- "pnpm lint --filter @muzo/web" : exécute ESLint.
- "pnpm test --filter @muzo/web" : réservé pour les tests Playwright / Vitest.

## Principes clés

- App Router pour un rendu hybride (SSR/ISR) et des server actions.
- Auth via NextAuth, stockage des sessions en MongoDB.
- Data Fetching orchestré avec React Server Components, React Query côté client pour l'état asynchrone.
- Upload direct via API route POST /api/upload-url générant une URL pré-signée S3.
- Design System Tailwind CSS + design tokens centralisés.

Se référer à ../../docs/architecture.md pour l'architecture complète.
