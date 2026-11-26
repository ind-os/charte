# La charte d'Indos

Ce dépôt tient la charte d'Indos, et l'outil qui rend un document Markdown en PDF à sa charte. Indos est un produit d'AVQN : un document à la charte est signé AVQN en pied de page.

Un dépôt qui s'en sert la clone dans son propre dossier, sous `charte/`, et l'ignore dans son `.gitignore`. Le dépôt est public : il ne contient ni prix, ni donnée d'une entreprise, ni secret.

## Ce qu'il contient

- `charte.css` : les couleurs, les polices et les formes, en variables.
- `logo/` : le signe d'Indos, sur fond clair et sur charbon. Le logo est le signe devant « Indos », en Archivo graisse 800, largeur 112 %.
- `pictogrammes/` : les pictogrammes, sur la grille de 14 unités du signe.
- `gabarits/` : le gabarit d'un document A4.
- `outils/pdf.mjs` : l'outil qui rend un document en PDF.

Le canevas « Indos · Moodboard » est l'atelier où la charte s'essaie ; ce qui s'y arrête se reporte ici.

## Rendre un document en PDF

Il faut Node 24 et Google Chrome. Une fois, dans `charte/` : `npm install`.

```
node charte/outils/pdf.mjs <document.md> [--sortie <fichier.pdf>] [--nom <nom>] [--signature <texte>]
```

- `--sortie` : le PDF, à côté du document et sous son nom par défaut.
- `--nom` : le nom du document en haut à droite de chaque première page ; son premier titre par défaut.
- `--signature` : le pied de page, « Indos · un produit d'AVQN » par défaut.
- `CHROME` : le chemin de Chrome, quand il n'est pas à sa place habituelle.

Le premier titre du document s'affiche entre deux coins jaunes ; chaque titre de section, sous un trait charbon. Les polices viennent de Google Fonts : le rendu demande une connexion.

## La marque

La marque Indos, son logo et ses pictogrammes sont à AVQN.
