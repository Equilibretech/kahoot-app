# 🚀 Guide de Déploiement Rapide

## Option 1: Railway (Recommandé)

1. **Créer un compte** sur [railway.app](https://railway.app)

2. **Préparer le projet**
```bash
git init
git add .
git commit -m "Initial commit"
```

3. **Déployer via Railway CLI**
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

4. **Configurer les variables**
Dans Railway Dashboard:
- PORT: 3000
- NODE_ENV: production

5. **Ajouter un volume** pour persister les quiz:
- Dashboard → Settings → Volumes
- Mount path: `/data`

## Option 2: Render

1. **Modifier package.json**
```json
"scripts": {
  "start": "node server/app.js",
  "build": "echo 'No build required'"
}
```

2. **Créer render.yaml**
```yaml
services:
  - type: web
    name: kahoot-app
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
```

3. **Déployer**
- Push sur GitHub
- Connecter Render à votre repo
- Deploy!

## Option 3: VPS (DigitalOcean/Linode)

1. **Créer un droplet Ubuntu**

2. **Installer Node.js et Nginx**
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs nginx
```

3. **Cloner et configurer**
```bash
git clone votre-repo
cd kahoot-app
npm install
npm install -g pm2
```

4. **Démarrer avec PM2**
```bash
pm2 start server/app.js --name kahoot
pm2 save
pm2 startup
```

5. **Configurer Nginx**
```nginx
server {
    listen 80;
    server_name votre-domaine.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔒 Important: Sécurité

1. **Activer HTTPS** (automatique sur Railway/Render)
2. **Limiter les origines CORS** dans le code
3. **Utiliser des variables d'environnement** pour les secrets
4. **Activer un firewall** sur VPS

## 📱 Test

Une fois déployé:
- Admin: `https://votre-app.com/admin`
- Joueurs: `https://votre-app.com`
- Créateur: `https://votre-app.com/quiz-builder`

Les WebSockets fonctionneront automatiquement!