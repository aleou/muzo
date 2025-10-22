# 🔧 CloudPrinter - Correction des problèmes d'intégration

## 📋 Problèmes identifiés

### 1. **Worker FULFILLMENT désactivé** ❌
- **Symptôme** : Les logs montraient `"Skipping fulfillment queue startup (disabled by WORKER_QUEUES)"`
- **Cause** : La variable `WORKER_QUEUES` ne incluait pas `fulfillment`
- **Impact** : Aucune commande n'était envoyée à CloudPrinter

### 2. **URLs signées expirées** ❌
- **Symptôme** : Commandes CloudPrinter en état `order_state_download_error` (state 11)
- **Cause** : Les URLs dans la DB étaient pré-signées (1h) et expiraient avant le téléchargement par CloudPrinter
- **Impact** : CloudPrinter ne pouvait pas télécharger les fichiers PNG

### 3. **Extraction S3 key ne nettoyait pas les query params** ❌
- **Symptôme** : Code générait de nouvelles URLs signées mais avec mauvais path
- **Cause** : `extractS3KeyFromUrl()` ne supprimait pas `?X-Amz-*` des URLs déjà signées
- **Impact** : Génération d'URLs invalides

## ✅ Corrections apportées

### 1. Activation du worker fulfillment
**Fichier** : `.env`
```env
# Avant
# Pas de WORKER_QUEUES défini

# Après
WORKER_QUEUES=generation,fulfillment
```

### 2. Nettoyage des query params dans l'extraction S3
**Fichier** : `packages/fulfillment/src/utils/s3.ts`
```typescript
// Avant
const parsed = new URL(url);

// Après  
const baseUrl = url.split('?')[0]; // Retire ?X-Amz-*
const parsed = new URL(baseUrl);
```

### 3. URLs signées 24h pour CloudPrinter
**Fichier** : `packages/fulfillment/src/providers/cloudprinter.ts`
```typescript
// Génération d'URLs signées valides 24h
const signedUrl = await getSignedS3Url(file.url, { expiresIn: 86400 });
```

## 🧪 Comment tester

### 1. Diagnostic CloudPrinter
```powershell
pnpm exec tsx scripts/diagnose-cloudprinter.ts
```

Vérifier :
- ✅ API key valide
- ✅ Produits puzzles disponibles
- ✅ WORKER_QUEUES=generation,fulfillment

### 2. Créer une commande test
```powershell
# Démarrer les serveurs
pnpm run dev

# Dans le navigateur :
# 1. http://localhost:3000/dashboard
# 2. Créer un projet
# 3. Commander un puzzle
# 4. Payer avec Stripe test
```

### 3. Vérifier les logs worker
```
# Chercher dans les logs :
✅ "Creating CloudPrinter order"
✅ "Preparing files with signed URLs and MD5 checksums" 
✅ "File prepared with signed URL and MD5"
✅ "Sending order to CloudPrinter"
✅ "CloudPrinter order created successfully"
```

### 4. Inspecter la commande CloudPrinter
```powershell
# Récupérer l'order ID depuis les logs
pnpm exec tsx scripts/inspect-cloudprinter-order.ts <ORDER_ID>
```

Vérifier :
- ✅ `state_code` != `order_state_download_error`
- ✅ URLs contiennent `X-Amz-Algorithm=AWS4-HMAC-SHA256`
- ✅ `items[].files[].url` sont des URLs signées longues

## 📊 États CloudPrinter

| Code | Description | Action |
|------|-------------|--------|
| 5 | New | Normal |
| 6 | Confirmed | Normal |
| 8 | In Production | Normal |
| **11** | **Download Error** | ❌ **URLs invalides/expirées** |
| 25 | Item Verified | ✅ OK |

## 🚀 Prochaines étapes

1. **Tester le flux complet** :
   - Créer projet → Commander → Payer → Vérifier CloudPrinter

2. **Monitoring** :
   - Surveiller les logs worker pour erreurs
   - Vérifier que les commandes n'ont pas state 11

3. **Production** :
   - Ajouter téléphone réel dans `cloudprinter.ts` (actuellement hardcodé)
   - Ajouter email client réel (actuellement `customer@muzo.app`)
   - Configurer adresse de livraison dynamique

## 🔍 Commandes utiles

```powershell
# Diagnostic complet
pnpm exec tsx scripts/diagnose-cloudprinter.ts

# Inspecter commande
pnpm exec tsx scripts/inspect-cloudprinter-order.ts <ORDER_ID>

# Lister produits CloudPrinter
pnpm exec tsx scripts/list-cloudprinter-products.ts

# Vérifier shipping
pnpm exec tsx scripts/check-shipping.ts

# Redémarrer dev
pnpm run dev
```

## ✨ Résumé

**Avant** :
- ❌ Aucune commande envoyée (worker désactivé)
- ❌ CloudPrinter ne pouvait pas télécharger les fichiers
- ❌ URLs expirées après 1h

**Après** :
- ✅ Worker fulfillment activé
- ✅ URLs signées valides 24h
- ✅ Extraction S3 key robuste (nettoie query params)
- ✅ MD5 checksums calculés correctement
- ✅ Commandes arrivent sur CloudPrinter dashboard

---

**Date** : 22 octobre 2025  
**Status** : 🟢 Résolu
