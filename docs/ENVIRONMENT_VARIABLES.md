# Environment Variables Guide

## 📁 Structure

Ce projet utilise un **SEUL fichier `.env`** à la racine qui est partagé par toutes les applications et packages :

```
muzo/
├── .env                    # ← Variables d'environnement (UNIQUE)
├── .env.example           # ← Template public (versionné)
├── .env.template          # ← Template détaillé avec vos valeurs
├── apps/
│   ├── web/               # ← Utilise .env racine
│   └── worker/            # ← Utilise .env racine (chargé via ../../.env)
└── packages/
    └── */                 # ← Utilisent .env racine
```

## 🚀 Quick Start

### 1. Configuration Initiale

```bash
# Copier le template
cp .env.example .env

# Éditer avec vos valeurs
code .env
```

### 2. Variables Critiques

Ces variables sont **OBLIGATOIRES** pour que le projet fonctionne :

```env
# Base de données
DATABASE_URL=mongodb://...

# Redis (pour les queues)
REDIS_URL=redis://...

# S3 (pour le stockage)
S3_ENDPOINT=https://...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_BUCKET=...

# AI Services
RUNPOD_API_KEY=...
OPENAI_API_KEY=...

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
```

### 3. Démarrage

```bash
pnpm install
pnpm run dev
```

## 🗄️ Configuration MongoDB

### Problème Courant : "Server selection timeout"

Votre `DATABASE_URL` doit être configurée correctement selon votre setup MongoDB.

#### Option A : Connexion Directe (Sans Replica Set)

✅ Utilisez cette option si vous avez un seul serveur MongoDB

```env
DATABASE_URL=mongodb://user:pass@host:port/database?directConnection=true&retryWrites=false&tls=true&serverSelectionTimeoutMS=30000&connectTimeoutMS=30000
```

**Caractéristiques:**
- ✅ Simple et rapide
- ❌ Pas de transactions MongoDB
- ❌ Pas de retry automatique
- ✅ Parfait pour le développement

#### Option B : Replica Set (Avec Transactions)

✅ Utilisez cette option si vous avez un replica set configuré

```env
DATABASE_URL=mongodb://user:pass@host:port/database?replicaSet=rs0&retryWrites=true&tls=true&serverSelectionTimeoutMS=30000&connectTimeoutMS=30000
```

**Caractéristiques:**
- ✅ Transactions supportées
- ✅ Retry automatique
- ✅ Haute disponibilité
- ⚠️ Requiert un replica set configuré

#### Option C : Local Development

✅ Utilisez cette option pour développer localement

```env
DATABASE_URL=mongodb://localhost:27017/muzo?retryWrites=true&serverSelectionTimeoutMS=10000
```

### ⚠️ ERREUR COMMUNE

**❌ NE FAITES PAS ÇA :**
```env
# ERREUR : directConnection=true ET replicaSet=rs0 sont incompatibles !
DATABASE_URL=mongodb://...?directConnection=true&replicaSet=rs0&...
```

**✅ FAITES PLUTÔT :**
```env
# Choisissez L'UN ou L'AUTRE
DATABASE_URL=mongodb://...?directConnection=true&...
# OU
DATABASE_URL=mongodb://...?replicaSet=rs0&...
```

## 🔧 Configuration Worker

Le worker partage le même `.env` que la web app. Son code charge explicitement :

```typescript
// apps/worker/src/index.ts
const workspaceEnv = resolve(process.cwd(), '../../.env');
config({ path: workspaceEnv, override: true });
```

### Variables Spécifiques au Worker

```env
# Contrôle quelles queues sont actives (optionnel)
WORKER_QUEUES=generation,mockup,fulfillment

# Force le mode transactionnel (optionnel, auto-détecté)
QUEUE_TRANSACTIONS=off  # ou 'on'

# Niveau de log
LOG_LEVEL=info  # ou 'debug' pour plus de détails
```

### Désactiver Certaines Queues

Si vous voulez que le worker traite seulement certains jobs :

```env
# Traiter seulement la génération
WORKER_QUEUES=generation

# Traiter génération et mockup
WORKER_QUEUES=generation,mockup
```

## 🌐 Variables Next.js

Les variables préfixées par `NEXT_PUBLIC_` sont exposées côté client :

```env
# ✅ Accessible côté client
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# ❌ Jamais exposé côté client (sécurisé)
STRIPE_SECRET_KEY=sk_test_...
```

## 🔍 Debugging

### Vérifier que les variables sont chargées

```typescript
// Dans n'importe quel fichier
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ défini' : '❌ manquant');
console.log('REDIS_URL:', process.env.REDIS_URL ? '✅ défini' : '❌ manquant');
```

### Logs du Worker

Le worker log son démarrage :

```json
// ✅ Démarrage réussi
{"level":30,"name":"muzo-worker","msg":"Worker bootstrapped and listening for jobs"}
{"level":30,"name":"muzo-queue-init","queue":"generation","msg":"Queue worker started"}

// ❌ Problème de connexion MongoDB
{"level":50,"name":"muzo-generation-worker","msg":"MongoDB connection error in worker loop"}

// ⚠️ Fallback non-transactionnel
{"level":30,"msg":"Mongo replica set not available; falling back to non-transactional queue mode"}
```

## 📦 Fichiers

| Fichier | Usage | Versionné ? |
|---------|-------|-------------|
| `.env` | Vos valeurs réelles | ❌ NON (dans .gitignore) |
| `.env.example` | Template public | ✅ OUI |
| `.env.template` | Template avec vos valeurs | ❌ NON |

## 🚨 Sécurité

### ❌ Ne JAMAIS commiter

```bash
# Ces fichiers sont dans .gitignore
.env
.env.local
.env.*.local
.env.template
```

### ✅ Toujours versionner

```bash
# Template sans valeurs sensibles
.env.example
```

### 🏢 En Production

Utilisez un secret manager (pas de fichiers `.env`) :
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager
- Vercel Environment Variables
- Railway Variables

## 📚 Références

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [dotenv Documentation](https://github.com/motdotla/dotenv)
- [MongoDB Connection String](https://www.mongodb.com/docs/manual/reference/connection-string/)
- [Prisma Environment Variables](https://www.prisma.io/docs/guides/development-environment/environment-variables)

## ❓ FAQ

### Q: Le worker ne se connecte pas à MongoDB

**R:** Vérifiez votre `DATABASE_URL` :
1. Pas de conflit `directConnection=true` + `replicaSet=rs0`
2. Timeout suffisant (`serverSelectionTimeoutMS=30000`)
3. Credentials corrects
4. Firewall/réseau autorisent la connexion

### Q: Les variables ne sont pas chargées

**R:** Vérifiez :
1. Le fichier `.env` existe à la racine
2. Les noms de variables sont corrects (sensible à la casse)
3. Pas d'espaces autour du `=`
4. Redémarrez le serveur dev après modification

### Q: Puis-je avoir plusieurs `.env` ?

**R:** Non recommandé. Ce projet utilise un seul `.env` partagé. Si vous avez vraiment besoin de configurations différentes, utilisez :
- `.env.development`
- `.env.production`
- `.env.test`

Et chargez-les avec `NODE_ENV`.

### Q: Comment partager ma config avec l'équipe ?

**R:** 
1. ✅ Partagez `.env.example` (versionné, pas de secrets)
2. ❌ Ne partagez JAMAIS `.env` directement
3. 📝 Documentez les variables dans ce guide
4. 🔒 Partagez les secrets via un password manager (1Password, LastPass, etc.)
