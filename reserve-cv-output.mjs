#!/usr/bin/env node

import { closeSync, existsSync, mkdirSync, openSync, unlinkSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
export function slugifyCvPart(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function validateDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Date must use YYYY-MM-DD');
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) throw new Error('Date must be a valid calendar date');
}

export function reserveCvOutput({ company, role, candidate, date, outputDir }) {
  validateDate(date);
  const parts = [company, role, candidate].map(slugifyCvPart);
  if (parts.some(part => !part)) throw new Error('Company, role, and candidate must contain letters or numbers');
  const directory = resolve(outputDir || join(root, 'output', date));
  mkdirSync(directory, { recursive: true });
  const base = `cv-${parts[0]}-${parts[1]}-${parts[2]}-${date}`;

  for (let version = 1; version <= 999; version++) {
    const basename = version === 1 ? base : `${base}-v${version}`;
    const pdf = join(directory, `${basename}.pdf`);
    const html = join(directory, `${basename}.html`);
    const tex = join(directory, `${basename}.tex`);
    const reservation = join(directory, `.${basename}.reserved`);
    if (existsSync(pdf) || existsSync(html) || existsSync(tex)) continue;
    try {
      closeSync(openSync(reservation, 'wx'));
      return { basename, pdf, html, tex, reservation };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }

  throw new Error('Unable to reserve a CV output filename after 999 versions');
}

export function releaseCvOutput(reservation, outputDir) {
  const directory = resolve(outputDir);
  const path = resolve(reservation);
  const rel = relative(directory, path);
  if (!rel || rel.startsWith(`..${sep}`) || rel === '..' || !rel.endsWith('.reserved')) {
    throw new Error('Reservation path must be a .reserved file inside the output directory');
  }
  try {
    unlinkSync(path);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function option(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find(arg => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

function main() {
  const release = option('release');
  if (release) {
    const outputDir = option('dir') || dirname(resolve(release));
    releaseCvOutput(release, outputDir);
    return;
  }

  const now = new Date();
  const date = option('date') || [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  const result = reserveCvOutput({
    company: option('company'),
    role: option('role'),
    candidate: option('candidate'),
    date,
    outputDir: option('dir') || join(root, 'output', date),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
