# La charte d'Indos

Ce dépôt tient la charte d'Indos, et l'outil qui rend un document Markdown en PDF à sa charte. Indos est un produit d'AVQN : un document à la charte est signé AVQN en pied de page.

Un dépôt qui s'en sert la clone dans son propre dossier, sous `charte/`, et l'ignore dans son `.gitignore`. Le dépôt est public : il ne contient ni prix, ni donnée d'une entreprise, ni secret.

## Ce qu'il contient

- `charte.css` : les couleurs, les polices et les formes, en variables.
- `logo/` : le signe d'Indos, sur fond clair et sur charbon. Le logo est le signe devant « Indos », en Archivo graisse 800, largeur 112 %.
- `pictogrammes/` : les pictogrammes, sur la grille de 14 unités du signe.
- `gabarits/` : les gabarits, chacun un HTML et sa feuille de style.
  - `document` : un document A4 dont le texte coule de page en page ; le premier titre s'affiche entre deux coins jaunes, chaque titre de section sous un trait charbon.
  - `devis` : un devis sur une page, avec ses lignes, son total et le bloc que signe l'entreprise.
  - `offre` : une offre en pages A4 paysage, une idée par page : l'objectif de l'entreprise, ses défis, ce qu'elle pourra faire, le schéma de son OS, pourquoi Indos, les phases, l'équipe, l'investissement, ce qu'elle y gagne, sans risque, la suite. Une page sans ses champs ne s'affiche pas, et les numéros des pages suivent.
- `outils/pdf.mjs` : l'outil qui rend un document en PDF.

Le canevas « Indos · Moodboard » est l'atelier où la charte s'essaie ; ce qui s'y arrête se reporte ici.

## Rendre un document en PDF

Il faut Node 24 et Google Chrome. Une fois, dans `charte/` : `npm install`.

```
node charte/outils/pdf.mjs <document.md> [--gabarit <nom>] [--sortie <fichier.pdf>] [--nom <nom>] [--emetteur <emetteur.json>] [--equipe <dossier>] [--signature <texte>]
```

- `--gabarit` : `document` par défaut.
- `--sortie` : le PDF, à côté du document et sous son nom par défaut.
- `--nom` : le nom du document en haut à droite ; son premier titre par défaut.
- `--emetteur` : un fichier JSON qui dit qui émet le document : `nom`, `adresse`, `ide`, et `tva`, la mention de la TVA. Il signe le pied de page.
- `--equipe` : le dossier de l'équipe, une fiche Markdown par personne, avec `nom` et `photo` dans son en-tête et son texte dessous. Le champ `equipe` d'un document donne la fiche de chaque rôle (`referent`, `developpeur`, `coach`) ; chaque personne s'affiche une fois, avec ses activités : Accompagnement, Développement, Formation.
- `--signature` : le pied de page, à la place de celui de l'émetteur ; « Indos · un produit d'AVQN » sans émetteur.
- `CHROME` : le chemin de Chrome, quand il n'est pas à sa place habituelle.

Les polices viennent de Google Fonts : le rendu demande une connexion.

## Les champs d'un document

L'en-tête YAML d'un document, entre deux lignes `---`, donne ses champs ; le gabarit les place par `{{champ}}` (Mustache), et le texte sous l'en-tête par `{{{contenu}}}`. L'outil y ajoute des champs calculés :

- `lignes` : chacune reçoit `montant_affiche`, en francs ; `total_affiche` est la somme des lignes, moins `remise.montant` ; `sous_total_affiche`, quand il y a une remise ;
- `phases` : chacune reçoit `numero`, `prix_affiche`, `statut` (prix ferme ou estimé), et ses options leur `prix_affiche` ; `total_affiche` est la somme des phases, moins la remise ;
- `gain` : à partir de `heures_par_semaine`, `cout_horaire` et `semaines_par_an` (46 par défaut), `heures_par_an`, `net_affiche`, la valeur par an moins douze mois de suivi mensuel, et `mois`, le nombre de mois pour que cette valeur paie le total des phases ;
- `suivi_mensuel.montant_affiche`, en francs ;
- `date_affiche` et `valable_jusqu_au_affiche`, en toutes lettres.

Les modèles d'un devis et d'une offre, avec leurs champs, sont dans le dépôt qui les emploie.

## La marque

La marque Indos, son logo et ses pictogrammes sont à AVQN.
