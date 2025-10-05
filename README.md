# MUZO Monorepo

Monorepo Turborepo pour MUZO, la plateforme de crÃ©ation d'art gÃ©nÃ©ratif imprimable Ã  la demande.

## Stack

- Next.js 14 (App Router) pour le front et les API routes.
- Worker Node.js orchestrÃ© via BullMQ pour la gÃ©nÃ©ration IA, les mockups et le fulfilment POD.
- MongoDB Atlas (Prisma) pour la persistance.
- S3 pour les mÃ©dias, Stripe pour le paiement, Printful ou Printify pour l'impression.

## Prise en main rapide

1. Installer pnpm et les dÃ©pendances du workspace.
2. Copier le fichier env.example vers un fichier env puis renseigner les secrets.
3. Lancer les services nÃ©cessaires (MongoDB, Redis, stockage S3 compatible, Stripe CLI, etc.).
4. DÃ©marrer le front avec la commande pnpm dev --filter @muzo/web et le worker avec pnpm dev --filter @muzo/worker.

## Structure

Consulter le document docs/architecture.md pour la structure dÃ©taillÃ©e, les modÃ¨les de donnÃ©es et les bonnes pratiques.
## Authentification & securite

- NextAuth gere la connexion par email (lien magique) et, si configure, Google OAuth. Renseignez `NEXTAUTH_SECRET`, `EMAIL_FROM`, `EMAIL_SERVER_*` et eventuellement `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
- Les routes protegee (`/dashboard`, `/api/upload-url`) exigent une session active via middleware. Les utilisateurs anonymes sont rediriges vers `/auth/sign-in` ou recoivent un code 401.
- Le rate limiting Upstash limite les demandes de generation d'URL S3 (`10 requetes / 60 s / utilisateur`). Configurez `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`.
