# MUZO - AI-Powered Print-on-Demand Platform

Plateforme de création d'art génératif imprimable à la demande.

## 🚀 Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your values

# 3. Verify configuration
pnpm check-env

# 4. Start development servers (web + worker)
pnpm dev
```

The web app will be available at http://localhost:3000 (or 3001 if port is in use).

## 📚 Documentation

- **[Environment Variables Guide](docs/ENVIRONMENT_VARIABLES.md)** - Configuration complète des variables d'environnement
- **[Worker Troubleshooting](docs/WORKER_TROUBLESHOOTING.md)** - Guide de dépannage du worker
- **[Worker Fix Summary](docs/WORKER_FIX_SUMMARY.md)** - Améliorations récentes
- **[Architecture](docs/architecture.md)** - Structure détaillée du projet

## Stack

- **Frontend**: Next.js 14 (App Router)
- **Worker**: Node.js avec système de queue MongoDB
- **Database**: MongoDB Atlas avec Prisma ORM
- **Storage**: S3-compatible object storage
- **Payment**: Stripe
- **Fulfillment**: CloudPrinter (Printful/Printify disponibles)

## 🔧 Environment Setup

### Initial Setup

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your values (see `.env.template` for detailed template)

3. Verify configuration:
   ```bash
   pnpm check-env
   ```

### Required Variables

Les variables suivantes sont **obligatoires** :

- `DATABASE_URL` - MongoDB connection string
- `REDIS_URL` - Redis pour les queues
- `S3_*` - Configuration S3 (endpoint, keys, bucket, region)
- `RUNPOD_API_KEY`, `OPENAI_API_KEY` - Services IA
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` - Paiement
- `CLOUDPRINTER_API_KEY` - Fournisseur d'impression

Voir [Environment Variables Guide](docs/ENVIRONMENT_VARIABLES.md) pour tous les détails.

## 🏗️ Structure du Projet

```
muzo/
├── apps/
│   ├── web/           # Application Next.js
│   └── worker/        # Processeur de jobs en arrière-plan
├── packages/
│   ├── ai/            # Services de génération IA
│   ├── api/           # Utilitaires API
│   ├── cloudprinter/  # Intégration CloudPrinter
│   ├── db/            # Client Prisma
│   ├── fulfillment/   # Orchestration fulfillment
│   ├── queue/         # Système de queue
│   └── stripe/        # Intégration Stripe
├── scripts/           # Scripts utilitaires
└── docs/              # Documentation
```

## 🛠️ Development Commands

```bash
pnpm dev          # Démarrer web + worker
pnpm build        # Build tous les packages
pnpm lint         # Linting
pnpm check-env    # Vérifier les variables d'environnement
```

### Worker Configuration

Le worker partage le même `.env` que la web app. Contrôle des queues :

```env
# Traiter seulement certaines queues (séparées par virgules)
WORKER_QUEUES=generation,mockup,fulfillment

# Forcer le mode transactionnel (auto-détecté par défaut)
QUEUE_TRANSACTIONS=off
```

## 🗄️ Database (MongoDB)

### Configuration MongoDB

Deux modes de connexion supportés :

**Connexion Directe** (actuel, pas de transactions) :
```env
DATABASE_URL=mongodb://user:pass@host:port/db?directConnection=true&retryWrites=false&serverSelectionTimeoutMS=30000
```

**Replica Set** (avec transactions) :
```env
DATABASE_URL=mongodb://user:pass@host:port/db?replicaSet=rs0&retryWrites=true&serverSelectionTimeoutMS=30000
```

⚠️ **Important** : Ne pas utiliser `directConnection=true` ET `replicaSet=...` ensemble !

### Commandes Prisma

```bash
# Générer le client Prisma
pnpm -C packages/db prisma generate

# Créer une migration
pnpm -C packages/db prisma migrate dev

# Ouvrir Prisma Studio
pnpm -C packages/db prisma studio
```

## Prise en main rapide (Original)

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
