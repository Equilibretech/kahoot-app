# Pour les futurs push Git sécurisés :
source .env
git remote set-url origin https://Equilibretech:$GITHUB_TOKEN@github.com/Equilibretech/kahoot-app.git
git push
git remote set-url origin https://github.com/Equilibretech/kahoot-app.git
