#!/usr/bin/env node
// Rend un document Markdown en PDF A4, à la charte d'Indos.
// node outils/pdf.mjs <document.md> [--sortie <fichier.pdf>] [--nom <nom du document>] [--signature <texte>]

import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { marked } from 'marked';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const executer = promisify(execFile);

function lireLesArguments(args) {
  const options = { signature: 'Indos · un produit d\u2019AVQN' };
  const positions = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--sortie' || arg === '--nom' || arg === '--signature') {
      const valeur = args[i + 1];
      if (valeur === undefined) throw new Error(`${arg} attend une valeur.`);
      options[arg.slice(2)] = valeur;
      i += 1;
    } else {
      positions.push(arg);
    }
  }
  if (positions.length !== 1) {
    throw new Error('Usage : node outils/pdf.mjs <document.md> [--sortie <fichier.pdf>] [--nom <nom>] [--signature <texte>]');
  }
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

function echapper(texte) {
  return texte.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

// Le nom du document : --nom, sinon son premier titre.
function nommer(markdown, nom) {
  if (nom) return nom;
  const titre = /^#\s+(.+)$/m.exec(markdown);
  return titre ? titre[1].trim() : '';
}

async function composer(options) {
  const markdown = await readFile(options.entree, 'utf8');
  const [gabarit, charte, style, signe] = await Promise.all([
    readFile(join(racine, 'gabarits/document.html'), 'utf8'),
    readFile(join(racine, 'charte.css'), 'utf8'),
    readFile(join(racine, 'gabarits/document.css'), 'utf8'),
    readFile(join(racine, 'logo/signe.svg'), 'utf8'),
  ]);
  const signature = `"${options.signature.replace(/["\\]/g, '\\$&')}"`;
  return gabarit
    .replace('{{style}}', `${charte}\n${style.replace('{{signature}}', signature)}`)
    .replace('{{signe}}', signe.trim())
    .replace('{{nom}}', echapper(nommer(markdown, options.nom)))
    .replace('{{contenu}}', marked.parse(markdown));
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
