# MUZO Monorepo

Monorepo Turborepo pour MUZO, la plateforme de creation d'art generatif imprimable a la demande.

## Stack

- Next.js 14 (App Router) pour le front et les API routes.
- Worker Node.js consomme une file MongoDB interne pour la generation IA, les mockups et le fulfilment POD.
- MongoDB Atlas (Prisma) pour la persistance.
- S3 pour les medias, Stripe pour le paiement, Printful ou Printify pour l'impression.

## Prise en main rapide

1. Installer pnpm et les dependances du workspace.
2. Copier le fichier env.example vers un fichier .env puis renseigner les secrets.
3. Lancer les services necessaires (MongoDB, stockage S3 compatible, Stripe CLI, etc.).
4. Demarrer le front avec la commande `pnpm dev --filter @muzo/web` et le worker avec `pnpm dev --filter @muzo/worker`.

## Structure

Consulter le document `docs/architecture.md` pour la structure detaillee, les modeles de donnees et les bonnes pratiques.

## Authentification & securite

- NextAuth gere la connexion par email (lien magique) et, si configure, Google OAuth. Renseignez `NEXTAUTH_SECRET`, `EMAIL_FROM`, `EMAIL_SERVER_*` et eventuellement `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
- Les routes protegees (`/dashboard`, `/api/upload-url`) exigent une session active via middleware. Les utilisateurs anonymes sont rediriges vers `/auth/sign-in` ou recoivent un code 401.
- Le rate limiting interne (persiste dans MongoDB) limite les demandes de generation d'URL S3 (`10 requetes / 60 s / utilisateur`).
