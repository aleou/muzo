# MUZO Monorepo

Monorepo Turborepo pour MUZO, la plateforme de création d'art génératif imprimable à la demande.

## Stack

- Next.js 14 (App Router) pour le front et les API routes.
- Worker Node.js orchestré via BullMQ pour la génération IA, les mockups et le fulfilment POD.
- MongoDB Atlas (Prisma) pour la persistance.
- S3 pour les médias, Stripe pour le paiement, Printful ou Printify pour l'impression.

## Prise en main rapide

1. Installer pnpm et les dépendances du workspace.
2. Copier le fichier env.example vers un fichier env puis renseigner les secrets.
3. Lancer les services nécessaires (MongoDB, Redis, stockage S3 compatible, Stripe CLI, etc.).
4. Démarrer le front avec la commande pnpm dev --filter @muzo/web et le worker avec pnpm dev --filter @muzo/worker.

## Structure

Consulter le document docs/architecture.md pour la structure détaillée, les modèles de données et les bonnes pratiques.
