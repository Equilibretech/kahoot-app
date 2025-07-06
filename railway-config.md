# 🚀 Configuration Railway pour helosens.fr

## 📋 Actions à faire dans Railway Dashboard

### 1. **Exposer le service (Domaine Railway)**
- Service "kahoot-app" → **"Settings"** → **"Networking"**
- Cliquer **"Generate Domain"** pour obtenir une URL Railway temporaire
- Cela activera l'accès public

### 2. **Ajouter le domaine personnalisé**
- Dans **"Settings"** → **"Custom Domain"**
- Ajouter : `app.helosens.fr`
- Railway fournira un CNAME (ex: `appealing-vibrancy.up.railway.app`)

### 3. **Variables d'environnement (optionnel)**
Les variables sont déjà dans nixpacks.toml, mais vous pouvez les ajouter manuellement :
- `NODE_ENV` = `production` 
- `DOMAIN` = `app.helosens.fr`

## 🌐 Configuration DNS OVH

### Dans l'interface OVH (Zone DNS de helosens.fr) :

**Enregistrement CNAME :**
- **Type** : CNAME
- **Nom** : `app`  
- **Cible** : `[CNAME fourni par Railway]`
- **TTL** : 300 (5 minutes)

**Alternative - Sous-domaine www :**
- **Type** : CNAME
- **Nom** : `www`
- **Cible** : `app.helosens.fr`

## ✅ **Résultat final**

Une fois configuré :
- **Admin** : `https://app.helosens.fr/admin`
- **Quiz Builder** : `https://app.helosens.fr/quiz-builder`  
- **Joueurs** : `https://app.helosens.fr`

## 🔧 **Test de fonctionnement**

1. **HTTPS automatique** (Railway gère SSL)
2. **WebSockets** fonctionnels
3. **CORS** configuré pour helosens.fr
4. **Responsive mobile** optimisé

## 📝 **Note**
Le code est maintenant configuré pour `app.helosens.fr`. Il ne reste que la configuration Railway + DNS OVH à faire.