# Worker Troubleshooting Guide

## Problèmes de Connexion MongoDB

### Symptômes
```
Server selection timeout: No available servers
Topology: { Type: Single, Set Name: rs0, Servers: [ { Address: mongo.aleou.app:443, Type: Unknown } ] }
```

### Solutions

#### Option 1: Configuration Directe (Recommandé pour développement)
Si vous n'avez pas besoin de transactions et que vous vous connectez directement à un serveur MongoDB unique :

```env
DATABASE_URL=mongodb://muzo_app:412f95d9c60E%24@mongo.aleou.app:443/muzo?directConnection=true&retryWrites=false&tls=true&tlsAllowInvalidCertificates=true&serverSelectionTimeoutMS=30000
```

**Changements clés:**
- Retirer `replicaSet=rs0` (incompatible avec `directConnection=true`)
- Augmenter `serverSelectionTimeoutMS` à 30000 (30 secondes)
- Définir `retryWrites=false` (pas de retry sans replica set)

#### Option 2: Configuration Replica Set (Recommandé pour production)
Si vous avez un replica set configuré :

```env
DATABASE_URL=mongodb://muzo_app:412f95d9c60E%24@mongo.aleou.app:443/muzo?replicaSet=rs0&retryWrites=true&tls=true&tlsAllowInvalidCertificates=true&serverSelectionTimeoutMS=30000&connectTimeoutMS=30000
```

**Changements clés:**
- Retirer `directConnection=true`
- Augmenter `serverSelectionTimeoutMS` à 30000
- Ajouter `connectTimeoutMS=30000`

#### Option 3: MongoDB Local pour Développement
Si vous développez localement, envisagez d'utiliser un MongoDB local :

```env
DATABASE_URL=mongodb://localhost:27017/muzo?retryWrites=true&serverSelectionTimeoutMS=10000
```

### Vérifications

1. **Test de connexion:**
   ```bash
   mongo "mongodb://muzo_app:412f95d9c60E%24@mongo.aleou.app:443/muzo?tls=true&tlsAllowInvalidCertificates=true"
   ```

2. **Vérifier le replica set:**
   ```javascript
   // Dans mongo shell
   rs.status()
   ```

3. **Test de port:**
   ```bash
   telnet mongo.aleou.app 443
   # ou
   Test-NetConnection -ComputerName mongo.aleou.app -Port 443
   ```

## Améliorations Apportées au Worker

### 1. Gestion Robuste des Erreurs de Connexion
- Le worker détecte maintenant les erreurs de connexion MongoDB
- Backoff exponentiel après des erreurs consécutives
- Log détaillé des problèmes de connexion

### 2. Détection Automatique du Mode Transaction
- Le worker détecte automatiquement si les transactions sont supportées
- Fallback automatique au mode non-transactionnel si nécessaire
- Pas besoin de configuration manuelle

### 3. Meilleure Gestion des Timeouts
- Le worker ne crashe plus sur les timeouts de connexion
- Continue de fonctionner en attendant que MongoDB revienne

## Configuration des Variables d'Environnement

### Variables Obligatoires
```env
DATABASE_URL=<votre_url_mongodb>
REDIS_URL=<votre_url_redis>
```

### Variables Optionnelles pour le Worker
```env
# Désactiver certaines queues (séparées par virgules)
WORKER_QUEUES=generation,mockup,fulfillment

# Forcer le mode transactionnel
QUEUE_TRANSACTIONS=on  # ou 'off' pour désactiver

# Niveau de log
LOG_LEVEL=info  # debug, info, warn, error
```

## Monitoring

### Logs à Surveiller

**Démarrage normal:**
```json
{"level":30,"name":"muzo-worker","msg":"Worker bootstrapped and listening for jobs"}
{"level":30,"name":"muzo-queue-init","queue":"generation","msg":"Queue worker started"}
```

**Problème de connexion:**
```json
{"level":50,"name":"muzo-generation-worker","err":{...},"msg":"MongoDB connection error in worker loop"}
```

**Fallback non-transactionnel:**
```json
{"level":30,"name":"muzo-generation-worker","msg":"Mongo replica set not available; falling back to non-transactional queue mode"}
```

## FAQ

### Q: Le worker ne traite aucun job
**R:** Vérifiez que :
1. MongoDB est accessible
2. Les jobs existent dans la base (status=PENDING)
3. La variable `WORKER_QUEUES` inclut le type de job

### Q: "Too many consecutive errors, backing off"
**R:** Cela signifie que MongoDB n'est pas disponible. Vérifiez :
1. La connexion réseau
2. Les credentials dans DATABASE_URL
3. Le firewall/security groups

### Q: Les jobs restent en RUNNING indéfiniment
**R:** Le worker a probablement crashé. Le système libère automatiquement les jobs après `lockDurationMs` (5 minutes par défaut).

## Docker Compose pour Développement Local

Si vous voulez un MongoDB local avec replica set :

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:7
    command: --replSet rs0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: echo "try { rs.status() } catch (err) { rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]}) }" | mongosh --port 27017 --quiet
      interval: 5s
      timeout: 30s
      retries: 30
volumes:
  mongo_data:
```

Puis mettez à jour votre `.env` :
```env
DATABASE_URL=mongodb://localhost:27017/muzo?replicaSet=rs0&retryWrites=true
```
