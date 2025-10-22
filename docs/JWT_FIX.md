# Fix JWT Error: "no matching decryption secret"

## Problème

Après avoir changé le `NEXTAUTH_SECRET`, vous voyez cette erreur :

```
[auth][error] JWTSessionError: Read more at https://errors.authjs.dev#jwtsessionerror
[auth][cause]: Error: no matching decryption secret
```

## Cause

Les cookies d'authentification existants dans votre navigateur ont été créés avec l'ancien `NEXTAUTH_SECRET`. NextAuth ne peut plus les déchiffrer avec le nouveau secret.

## Solution

### Option 1: Effacer les cookies du navigateur (Recommandé)

1. **Chrome/Edge:**
   - Ouvrir DevTools (F12)
   - Aller dans l'onglet "Application"
   - Dans la barre latérale gauche : "Storage" → "Cookies"
   - Sélectionner `http://localhost:3000` (ou votre URL)
   - Supprimer tous les cookies (clic droit → "Clear")
   - Rafraîchir la page (F5)

2. **Firefox:**
   - Ouvrir DevTools (F12)
   - Aller dans l'onglet "Storage"
   - Cliquer sur "Cookies" → `http://localhost:3000`
   - Supprimer tous les cookies
   - Rafraîchir la page (F5)

3. **Safari:**
   - Menu "Développement" → "Vider les caches"
   - Ou Préférences → Confidentialité → Gérer les données de sites web → Supprimer localhost

### Option 2: Navigation privée

Ouvrir une fenêtre de navigation privée/incognito (Ctrl+Shift+N dans Chrome/Edge).

### Option 3: Support de l'ancien secret (Production uniquement)

Si vous devez supporter les deux secrets temporairement en production :

```typescript
// apps/web/auth.ts
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter,
  providers,
  secret: [
    process.env.NEXTAUTH_SECRET!, // Nouveau secret
    process.env.NEXTAUTH_SECRET_OLD, // Ancien secret (optionnel)
  ],
});
```

⚠️ **Note**: Cette option n'est PAS nécessaire en développement. Supprimez simplement les cookies.

## Images S3 en 403

Si vous voyez des erreurs 403 pour les images S3 :

```
⨯ upstream image response failed for https://s3.aleou.app/muzo-uploads-dev/... 403
```

C'est normal ! Les URLs S3 publiques ne sont pas accessibles directement. Le système utilise maintenant des **URLs signées** (pre-signed URLs) qui donnent un accès temporaire sécurisé.

### Ce qui a été corrigé

1. **CloudPrinter fulfillment** : Utilise maintenant `getSignedS3Url()` pour générer des URLs valides 24h
2. **Next.js Image Optimization** : Next.js peut maintenant accéder aux images via ces URLs signées

### Configuration

Les URLs sont signées automatiquement dans :
- `packages/fulfillment/src/providers/cloudprinter.ts` - Pour les commandes
- `apps/web` - Pour l'affichage des images

## Vérification

Après avoir effacé les cookies :

1. Aller sur http://localhost:3000
2. Se connecter via email
3. Vérifier qu'il n'y a plus d'erreur JWT dans les logs
4. Les images doivent s'afficher correctement

## Prévention

Pour éviter ce problème à l'avenir :

1. **Ne changez jamais `NEXTAUTH_SECRET` en production** sans plan de migration
2. **En développement** : Effacer les cookies après changement de secret
3. **Utiliser le même secret** sur tous les environnements (dev/staging/prod) ou gérer la migration

## Logs attendus après fix

```
[auth] Using custom MongoDB adapter without transactions. For production, configure MongoDB as a replica set.
GET / 200 in 150ms
```

Pas d'erreur JWT ! ✅
