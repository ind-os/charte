#!/usr/bin/env node
// Rend un document Markdown en PDF A4, à la charte d'Indos.
// node outils/pdf.mjs <document.md> [--gabarit <nom>] [--sortie <fichier.pdf>] [--nom <nom>] [--emetteur <emetteur.json>] [--signature <texte>]

import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { marked } from 'marked';
import Mustache from 'mustache';
import { parse as lireYaml } from 'yaml';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const executer = promisify(execFile);
const OPTIONS = ['--gabarit', '--sortie', '--nom', '--emetteur', '--signature'];
const USAGE = 'Usage : node outils/pdf.mjs <document.md> [--gabarit <nom>] [--sortie <fichier.pdf>] [--nom <nom>] [--emetteur <emetteur.json>] [--signature <texte>]';

function lireLesArguments(args) {
  const options = { gabarit: 'document' };
  const positions = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (OPTIONS.includes(arg)) {
      const valeur = args[i + 1];
      if (valeur === undefined) throw new Error(`${arg} attend une valeur.`);
      options[arg.slice(2)] = valeur;
      i += 1;
    } else {
      positions.push(arg);
    }
  }
  if (positions.length !== 1) throw new Error(USAGE);
  options.entree = resolve(positions[0]);
  options.sortie = resolve(options.sortie ?? join(dirname(options.entree), basename(options.entree, extname(options.entree)) + '.pdf'));
  return options;
}

function trouverChrome() {
  const candidats = [
    process.env.CHROME,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  const chrome = candidats.find((chemin) => existsSync(chemin));
  if (!chrome) throw new Error('Chrome est introuvable : installer Google Chrome, ou donner son chemin dans CHROME.');
  return chrome;
}

// L'en-tête YAML d'un document, entre deux lignes « --- », et son texte.
function separer(markdown) {
  const entete = /^---\n([\s\S]*?)\n---\n?/.exec(markdown);
  if (!entete) return { champs: {}, texte: markdown };
  return { champs: rogner(lireYaml(entete[1]) ?? {}), texte: markdown.slice(entete[0].length) };
}

// Les textes de l'en-tête, sans les blancs du début ni de la fin.
function rogner(valeur) {
  if (typeof valeur === 'string') return valeur.trim();
  if (Array.isArray(valeur)) return valeur.map(rogner);
  if (valeur && typeof valeur === 'object') return Object.fromEntries(Object.entries(valeur).map(([cle, v]) => [cle, rogner(v)]));
  return valeur;
}

function enFrancs(montant) {
  const nombre = new Intl.NumberFormat('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(montant);
  return `CHF ${nombre}`;
}

function enDate(date) {
  if (!date) return '';
  const jour = new Date(`${date}T12:00:00`);
  if (Number.isNaN(jour.getTime())) return String(date);
  return jour.toLocaleDateString('fr-CH', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Les champs calculés : les montants en francs, le total, les dates en toutes lettres.
function preparer(champs) {
  const prepares = { ...champs };
  if (Array.isArray(champs.lignes)) {
    prepares.lignes = champs.lignes.map((ligne) => ({ ...ligne, montant_affiche: enFrancs(Number(ligne.montant)) }));
    const sousTotal = champs.lignes.reduce((somme, ligne) => somme + Number(ligne.montant), 0);
    const remise = champs.remise ? Number(champs.remise.montant) : 0;
    if (champs.remise) {
      prepares.remise = { ...champs.remise, montant_affiche: `– ${enFrancs(remise)}` };
      prepares.sous_total_affiche = enFrancs(sousTotal);
    }
    prepares.total_affiche = enFrancs(sousTotal - remise);
  }
  if (champs.suivi_mensuel) {
    prepares.suivi_mensuel = { ...champs.suivi_mensuel, montant_affiche: enFrancs(Number(champs.suivi_mensuel.montant)) };
  }
  for (const cle of ['date', 'valable_jusqu_au']) {
    if (champs[cle]) prepares[`${cle}_affiche`] = enDate(champs[cle]);
  }
  return prepares;
}

function signer(options, emetteur) {
  if (options.signature) return options.signature;
  if (!emetteur) return 'Indos · un produit d\u2019AVQN';
  return [`Indos · un produit d\u2019${emetteur.nom}`, emetteur.adresse, emetteur.ide && `IDE ${emetteur.ide}`].filter(Boolean).join(' · ');
}

async function lire(chemin) {
  return existsSync(chemin) ? readFile(chemin, 'utf8') : '';
}

async function composer(options) {
  const { champs, texte } = separer(await readFile(options.entree, 'utf8'));
  const emetteur = options.emetteur ? JSON.parse(await readFile(resolve(options.emetteur), 'utf8')) : undefined;
  const gabarit = join(racine, 'gabarits', `${options.gabarit}.html`);
  if (!existsSync(gabarit)) throw new Error(`Le gabarit « ${options.gabarit} » n'existe pas dans gabarits/.`);
  const [page, charte, document, propre, signe] = await Promise.all([
    readFile(gabarit, 'utf8'),
    readFile(join(racine, 'charte.css'), 'utf8'),
    readFile(join(racine, 'gabarits/document.css'), 'utf8'),
    options.gabarit === 'document' ? '' : lire(join(racine, 'gabarits', `${options.gabarit}.css`)),
    readFile(join(racine, 'logo/signe.svg'), 'utf8'),
  ]);
  const signature = `"${signer(options, emetteur).replace(/["\\]/g, '\\$&')}"`;
  const premierTitre = /^#\s+(.+)$/m.exec(texte);
  const donnees = {
    ...preparer(champs),
    emetteur,
    style: `${charte}\n${document.replace('{{signature}}', signature)}\n${propre}`,
    signe: signe.trim(),
    contenu: texte.trim() ? marked.parse(texte) : '',
  };
  donnees.nom = options.nom ?? Mustache.render(champs.nom ?? (premierTitre ? premierTitre[1].trim() : ''), donnees);
  return Mustache.render(page, donnees);
}

async function rendre(options) {
  const html = await composer(options);
  const dossier = await mkdtemp(join(tmpdir(), 'charte-'));
  const page = join(dossier, 'document.html');
  try {
    await writeFile(page, html);
    await executer(trouverChrome(), [
      '--headless=new',
      '--disable-gpu',
      '--no-pdf-header-footer',
      '--run-all-compositor-stages-before-draw',
      '--virtual-time-budget=15000',
      `--print-to-pdf=${options.sortie}`,
      pathToFileURL(page).href,
    ]);
  } finally {
    await rm(dossier, { recursive: true, force: true });
  }
  if (!existsSync(options.sortie)) throw new Error('Chrome n\u2019a pas écrit le PDF.');
  return options.sortie;
}

try {
  const sortie = await rendre(lireLesArguments(process.argv.slice(2)));
  console.log(sortie);
} catch (erreur) {
  console.error(erreur.message);
  process.exit(1);
}
