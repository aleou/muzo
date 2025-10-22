# Module de Gestion des Commandes

## Structure

### Pages

#### `/dashboard/orders` - Liste des commandes
- **Fichier**: `apps/web/app/dashboard/orders/page.tsx`
- **Fonctionnalités**:
  - Affiche toutes les commandes de l'utilisateur connecté
  - Affichage avec image du produit
  - Informations résumées (date, prix, statut, fournisseur)
  - Badge de statut avec icône
  - Bouton "Détails" pour accéder à la page de détails

#### `/dashboard/orders/[orderId]` - Détails d'une commande
- **Fichier**: `apps/web/app/dashboard/orders/[orderId]/page.tsx`
- **Fonctionnalités**:
  - Aperçu complet du produit avec image
  - Détails du produit (ID, variant, options sélectionnées, quantité)
  - Informations Stripe complètes:
    - Session ID
    - Payment Intent ID
    - Statut du paiement
    - Derniers chiffres de la carte
    - Lien vers Stripe Dashboard
  - Informations du job de fulfillment:
    - Statut du job
    - Nombre de tentatives
    - Erreurs éventuelles
    - Résultat du traitement
  - Adresse de livraison
  - Timeline avec historique des statuts
  - Bouton retour vers la liste

### Composants Réutilisables

#### `OrderStatusBadge`
- **Fichier**: `apps/web/components/order-status-badge.tsx`
- **Props**:
  - `status`: OrderStatus ("CREATED" | "PAID" | "SENT" | "FULFILLED" | "FAILED")
  - `showIcon?`: boolean (optionnel)
- **Utilisation**: Badge coloré avec icône pour afficher le statut de la commande

#### `PaymentStatusBadge`
- **Fichier**: `apps/web/components/order-status-badge.tsx`
- **Props**:
  - `status`: string (statut Stripe: "succeeded", "processing", etc.)
- **Utilisation**: Badge pour afficher le statut du paiement Stripe

#### `JobStatusBadge`
- **Fichier**: `apps/web/components/order-status-badge.tsx`
- **Props**:
  - `status`: string ("PENDING" | "PROCESSING" | "COMPLETED" | "FAILED")
- **Utilisation**: Badge avec icône pour afficher le statut du job de fulfillment

#### `Separator`
- **Fichier**: `apps/web/components/ui/separator.tsx`
- **Utilisation**: Ligne de séparation horizontale

## Intégration avec le Dashboard

Un bouton "Voir toutes les commandes" a été ajouté dans le dashboard principal (`/dashboard`) pour accéder facilement à la liste des commandes.

## Accès

- **URL Liste**: `/dashboard/orders`
- **URL Détails**: `/dashboard/orders/[orderId]`

## Données Affichées

### Liste des Commandes
- Image du produit (depuis `project.outputs[0].url`)
- Numéro de commande (8 derniers caractères de l'ID)
- Nom du produit
- Date de création
- Prix et devise
- Fournisseur (CloudPrinter, Printful, Printify)
- Statut avec badge coloré
- Référence fournisseur (si disponible)

### Détails de la Commande
- **Produit**:
  - Image en grand format
  - Nom du produit
  - ID produit
  - Variant ID
  - Options sélectionnées (affichées sous forme de liste)
  - Quantité
  - Fournisseur

- **Paiement Stripe**:
  - Session ID
  - Payment Intent ID
  - Montant total
  - Statut du paiement
  - Derniers 4 chiffres de la carte
  - Lien vers Stripe Dashboard

- **Fulfillment**:
  - Statut du job
  - Nombre de tentatives
  - Dernière erreur (si échec)
  - Résultat complet (si succès)

- **Livraison**:
  - Nom du destinataire
  - Adresse complète
  - Code postal et ville
  - Pays

- **Timeline**:
  - Commande créée
  - Paiement confirmé
  - Envoyée au fournisseur
  - Commande livrée

## Statuts de Commande

| Statut | Label | Couleur | Description |
|--------|-------|---------|-------------|
| CREATED | Créée | Gris | Commande créée, en attente de paiement |
| PAID | Payée | Bleu | Paiement confirmé |
| SENT | Envoyée | Violet | Envoyée au fournisseur |
| FULFILLED | Livrée | Vert | Commande livrée |
| FAILED | Échouée | Rouge | Échec du traitement |

## Statuts de Paiement Stripe

- `succeeded`: Réussi (vert)
- `processing`: En cours (bleu)
- `requires_payment_method`: Nécessite paiement (orange)
- `requires_confirmation`: Nécessite confirmation (jaune)
- `canceled`: Annulé (gris)
- `failed`: Échoué (rouge)

## Statuts de Job

- `PENDING`: En attente (jaune)
- `PROCESSING`: En cours (bleu)
- `COMPLETED`: Terminé (vert)
- `FAILED`: Échoué (rouge)
