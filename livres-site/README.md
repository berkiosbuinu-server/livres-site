# Bibliothèque BERKIOS

Site Next.js destiné à `https://livres.berkios.online`, déployable sur Vercel. Le catalogue est alimenté automatiquement par les **assets PDF des GitHub Releases** du dépôt `berkiosbuinu-server/livres`.

## Fonctionnement

- Le site interroge l'API publique GitHub et récupère les PDF publiés dans les Releases.
- Une Release peut contenir plusieurs livres.
- Chaque PDF doit avoir une image de couverture de première page, en PNG/JPG/WebP, portant exactement le même nom de base.
  - `Mon_Livre.pdf`
  - `Mon_Livre.png`
- Les livres sont triés par date de publication de la Release.
- 25 livres sont affichés par page. Le bouton **Suivant** charge la page suivante.
- L'**aperçu** passe par une route serveur qui relaie le PDF GitHub ; sur téléphone, il s'ouvre dans un nouvel onglet.
- Le **téléchargement** se fait directement depuis GitHub (aucune bande passante Vercel consommée).
- Le catalogue est mis en cache pendant 5 minutes.

## 1. Publier les premiers livres sur GitHub

Le dossier `livres-release-assets` (fourni dans `livres-release-assets.zip`) contient les 15 PDF extraits de `docs.zip` et leurs 15 couvertures PNG générées depuis la première page de chaque PDF.

**Méthode la plus simple** : décompresser `livres-release-assets.zip`, puis lancer le script fourni (il crée la Release si besoin et envoie les 30 fichiers ; on peut le relancer sans risque) :
```powershell
cd D:\BERKIOS\livres-site
.\scripts\publish-release.ps1 -Assets "D:\BERKIOS\livres-release-assets"
```
Si PowerShell refuse d'exécuter le script : `Set-ExecutionPolicy -Scope Process Bypass`, puis relancer. La méthode manuelle est détaillée ci-dessous.

### Pré-requis Windows 11

Installer :
1. Git : https://git-scm.com/download/win
2. GitHub CLI : https://cli.github.com/
3. Node.js LTS : https://nodejs.org/

Ouvrir PowerShell puis vérifier :
```powershell
git --version
gh --version
node --version
npm --version
```

Se connecter à GitHub :
```powershell
gh auth login
```
Choisir GitHub.com, HTTPS et terminer l'authentification dans le navigateur.

### Créer le dépôt s'il n'existe pas

Le dépôt cible doit être **public** pour que Vercel et les visiteurs puissent lire les Releases sans jeton GitHub.
```powershell
gh repo create berkiosbuinu-server/livres --public --description "Bibliothèque gratuite des livres et guides BERKIOS"
```
Si le dépôt existe déjà, ne relancez pas cette commande.

### Créer la première Release et téléverser les fichiers

Décompresser `livres-release-assets.zip` dans un dossier, par exemple :
`D:\BERKIOS\livres-release-assets`

Dans PowerShell :
```powershell
$repo = "berkiosbuinu-server/livres"
$tag = "bibliotheque-2026"
$assets = "D:\BERKIOS\livres-release-assets"

gh release create $tag --repo $repo --title "Bibliothèque BERKIOS — première collection" --notes "Première collection de livres BERKIOS. Les PDF et leurs couvertures de première page sont gratuits."
$files = Get-ChildItem $assets -File | ForEach-Object { $_.FullName }
gh release upload $tag $files --repo $repo
```
Si la Release `bibliotheque-2026` existe déjà, ne refaites pas `gh release create`. Utilisez seulement la commande `gh release upload`.

Vérifier :
```powershell
gh release view bibliotheque-2026 --repo berkiosbuinu-server/livres
```
Vous devez voir les PDF et les images PNG dans les assets.

## 2. Lancer le site en local

Dans le dossier du site :
```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```
Ouvrir `http://localhost:3000`.

Pour tester la version de production :
```powershell
npm run build
npm start
```

## 3. Déployer sur Vercel

1. Pousser le dossier du site dans un dépôt GitHub distinct, par exemple `berkiosbuinu-server/livres-site`.
2. Aller sur https://vercel.com et se connecter avec GitHub.
3. Cliquer sur **Add New → Project**, puis importer `livres-site`.
4. Framework : **Next.js** (détection automatique).
5. Build command : `npm run build`.
6. Ajouter la variable d'environnement :
   - `GITHUB_REPOSITORY` = `berkiosbuinu-server/livres`
7. Cliquer sur **Deploy**.

Aucune clé GitHub n'est nécessaire tant que le dépôt de livres reste public. Si vous voyez un jour l'erreur « Limite de l'API GitHub atteinte », ajoutez aussi une variable `GITHUB_TOKEN` (jeton GitHub en lecture seule) dans Vercel.

## 4. Relier le domaine livres.berkios.online

Dans Vercel → projet → **Settings → Domains**, ajouter :
`livres.berkios.online`

Vercel affichera la configuration DNS attendue. Chez Namecheap, dans **Advanced DNS**, ajouter l'enregistrement demandé par Vercel. Pour un sous-domaine, il s'agit généralement de :
- Type : `CNAME`
- Host : `livres`
- Value : `cname.vercel-dns.com`

Utiliser en priorité la valeur exacte affichée dans Vercel. Supprimer uniquement les anciens enregistrements qui entrent en conflit avec ce sous-domaine. Attendre la validation DNS et HTTPS par Vercel.

## 5. Ajouter de nouveaux livres

Pour chaque nouveau livre :
1. Préparer le PDF.
2. Créer une image PNG/JPG/WebP de sa **première page**.
3. Donner exactement le même nom de base aux deux fichiers.
4. Ajouter les deux fichiers comme assets d'une nouvelle GitHub Release.

Exemple :
- `Guide_BERKIOS_2027.pdf`
- `Guide_BERKIOS_2027.png`

Puis publier la Release. Le site récupérera automatiquement le nouveau livre après actualisation du cache (environ 5 minutes). Pas besoin de modifier ni redéployer le site.

Pour ajouter des informations éditoriales précises (description, auteur, nombre de pages), compléter `src/lib/catalogue.json` avec le nom de base du PDF dans le champ `slug`. Pour les livres futurs non répertoriés, le site utilise le nom du fichier et les informations de la Release.

## 6. Don

Le bouton de don ouvre WhatsApp au numéro fourni :
`+243 820 586 551`

Le site ne collecte et ne traite aucun paiement. Les modalités du don sont convenues directement avec le contact WhatsApp.

## Dépannage

- **Aucun livre affiché** : vérifier que le dépôt `berkiosbuinu-server/livres` est public et qu'au moins une Release publiée contient des assets `.pdf`.
- **Couverture absente** : vérifier que le PNG/JPG a le même nom de base que le PDF.
- **Erreur GitHub 404** : vérifier le nom du dépôt et son accès public.
- **Erreur GitHub 403** : limite de l'API publique GitHub ; attendre puis réessayer.
- **Domaine non validé** : vérifier le DNS demandé dans Vercel et attendre sa propagation.
