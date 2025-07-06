# 🎯 QuizApp - Clone Kahoot Avancé

Application de quiz en temps réel type Kahoot avec interface mobile-first, système d'administration et création de quiz personnalisés.

## 🚀 Nouvelles Fonctionnalités

### 🎨 Créateur de Quiz
- **Interface intuitive** pour créer des quiz personnalisés
- **Questions illimitées** avec 4 options de réponse
- **Temps limite configurable** par question (10-120 secondes)
- **Sauvegarde automatique** des quiz créés
- **Édition et suppression** des quiz existants

### 📚 Gestion des Quiz
- **Bibliothèque de quiz** avec quiz pré-créés (Général, Science)
- **Sélection de quiz** avant création d'un jeu
- **Aperçu des quiz** avec titre, description et nombre de questions
- **Stockage persistant** en JSON

### 🎮 Interface Admin Améliorée
- **Sélection de quiz** obligatoire avant création de jeu
- **Aperçu du quiz sélectionné** 
- **Accès direct au créateur** de quiz
- **Gestion de la bibliothèque** personnelle

## 📱 Utilisation

### 1. Créer un Quiz
```
http://localhost:3000/quiz-builder
```
- Ajouter titre et description
- Créer les questions avec options
- Sélectionner la bonne réponse
- Définir le temps limite
- Sauvegarder le quiz

### 2. Administrer un Jeu
```
http://localhost:3000/admin
```
- Sélectionner un quiz existant
- Créer le jeu avec code unique
- Gérer les joueurs connectés
- Contrôler le déroulement

### 3. Rejoindre un Jeu
```
http://localhost:3000
```
- Entrer le code à 6 chiffres
- Saisir son nom de joueur
- Répondre aux questions
- Voir son classement

## 🛠️ Structure Technique

```
kahoot-app/
├── server/
│   └── app.js              # Backend avec API quiz
├── data/
│   └── quiz-store.json     # Stockage des quiz
├── public/
│   ├── css/style.css       # Styles responsive
│   └── js/
│       ├── app.js          # Client joueur
│       ├── admin.js        # Interface admin
│       └── quiz-builder.js # Créateur de quiz
├── views/
│   ├── index.html          # Page joueur
│   ├── admin.html          # Page admin
│   └── quiz-builder.html   # Créateur de quiz
└── package.json
```

## 🎯 API Endpoints

- `GET /api/quizzes` - Liste des quiz
- `GET /api/quiz/:id` - Détails d'un quiz
- `POST /api/quiz` - Créer un nouveau quiz
- `DELETE /api/quiz/:id` - Supprimer un quiz
- `POST /api/create-game` - Créer un jeu avec quiz sélectionné

## 🔧 Installation et Démarrage

```bash
cd kahoot-app
npm install
npm start
```

Le serveur démarre sur `http://localhost:3000`

## 📊 Quiz Inclus

**Quiz Général** (3 questions)
- Géographie, mathématiques, sciences

**Quiz Science** (3 questions)
- Chimie, astronomie, physique

## 🎮 Améliorations Apportées

✅ **Personnalisation complète** des questions par l'admin
✅ **Sélection de quiz** avant création de jeu  
✅ **Interface de création** intuitive et responsive
✅ **Gestion de bibliothèque** avec édition/suppression
✅ **Validation** des données et gestion d'erreurs
✅ **Aperçus temps réel** des quiz sélectionnés
✅ **Stockage persistant** des quiz créés

L'application est maintenant entièrement personnalisable et prête pour une utilisation en production avec de vrais utilisateurs !