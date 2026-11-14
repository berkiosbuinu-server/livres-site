param(
  [string]$Tag = "bibliotheque-2026",
  [string]$Assets = "..\livres-release-assets",
  [string]$Repo = "berkiosbuinu-server/livres"
)

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw "GitHub CLI (gh) n'est pas installé. https://cli.github.com/" }

# gh écrit sur stderr : on vérifie le code de sortie, pas le texte.
$ErrorActionPreference = "Continue"
gh auth status *> $null
if ($LASTEXITCODE -ne 0) { throw "Connectez-vous d'abord avec : gh auth login" }

if (-not (Test-Path $Assets)) { throw "Dossier d'assets introuvable : $Assets" }
$files = Get-ChildItem $Assets -File | Where-Object { $_.Extension -in ".pdf", ".png", ".jpg", ".jpeg", ".webp" } | ForEach-Object { $_.FullName }
if ($files.Count -eq 0) { throw "Aucun fichier à publier dans $Assets" }

# La Release existe-t-elle déjà ?
gh release view $Tag --repo $Repo *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Création de la Release $Tag..." -ForegroundColor Cyan
  gh release create $Tag --repo $Repo --title "Bibliothèque BERKIOS — première collection" --notes "Livres BERKIOS gratuits. Chaque PDF est accompagné de sa couverture de première page."
  if ($LASTEXITCODE -ne 0) { throw "Échec de la création de la Release." }
}

Write-Host "Envoi de $($files.Count) fichiers (cela peut prendre quelques minutes)..." -ForegroundColor Cyan
gh release upload $Tag $files --repo $Repo --clobber
if ($LASTEXITCODE -ne 0) { throw "Échec de l'envoi des fichiers." }

Write-Host "Release publiée : https://github.com/$Repo/releases/tag/$Tag" -ForegroundColor Green
