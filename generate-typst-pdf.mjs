#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname, relative, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = dirname(fileURLToPath(import.meta.url));

function readPayload(inputPath) {
  const text = readFileSync(inputPath, 'utf8');
  if (extname(inputPath).toLowerCase() === '.json') return JSON.parse(text);
  const match = text.match(/<!-- career-ops-cv-payload:([A-Za-z0-9+/=]+) -->/);
  if (!match) throw new Error('Dashboard HTML has no embedded Typst payload; regenerate it with the current career-ops PDF flow');
  return JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
}

function contact(value, fallback = '') {
  if (!value) return null;
  if (typeof value === 'string') return { href: value, display: fallback || value };
  return { href: value.url || '', display: value.display || value.url || fallback };
}

function toTypstPayload(payload) {
  if (payload.identity && payload.core_competencies) {
    return {
      ...payload,
      identity: {
        ...payload.identity,
        contacts: (payload.identity.contacts || []).filter(item => !String(item?.href || '').toLowerCase().startsWith('tel:')),
      },
    };
  }
  const candidate = payload.candidate || {};
  const contacts = [
    candidate.email ? { href: `mailto:${candidate.email}`, display: candidate.email } : null,
    contact(candidate.portfolio),
    contact(candidate.github),
    contact(candidate.linkedin),
  ].filter(Boolean);
  return {
    meta: {
      candidate_name: candidate.name || '',
      company: payload.company || '',
      role: payload.role || '',
      language: payload.lang || 'en',
      paper_size: payload.page_format || 'letter',
      source_jd: payload.source_jd || '',
      source_report: payload.source_report || '',
    },
    identity: {
      full_name: candidate.name || '',
      location: candidate.location || '',
      contacts,
    },
    summary: payload.summary || '',
    core_competencies: payload.competencies || [],
    experience: (payload.experience || []).map(item => ({
      company: item.company || '',
      location: item.location || '',
      role: item.role || '',
      period: item.period || item.dates || '',
      bullets: item.bullets || [],
    })),
    projects: (payload.projects || []).map(item => ({
      title: item.title || item.name || '',
      badge: item.badge || '',
      description: item.description || '',
      tech: Array.isArray(item.tech) ? item.tech.join(', ') : item.tech || '',
    })),
    education: (payload.education || []).map(item => ({
      title: item.title || '',
      institution: item.institution || item.org || '',
      year: item.year || '',
      description: item.description || '',
    })),
    certifications: (payload.certifications || []).map(item => ({
      title: item.title || '',
      issuer: item.issuer || item.org || '',
      year: item.year || '',
    })),
    skills: payload.skills || [],
  };
}

function updateManifest(report, pdfPath, htmlPath, format) {
  const path = resolve(root, 'data', 'pdf-index.tsv');
  const rel = value => relative(root, value).split(sep).join('/');
  const pdf = rel(pdfPath);
  const html = htmlPath ? rel(htmlPath) : '';
  const key = value => String(value || '').replace(/^0+(?=\d)/, '');
  const rows = existsSync(path)
    ? readFileSync(path, 'utf8').split('\n').filter(line => {
      if (!line || line.startsWith('#')) return false;
      const fields = line.split('\t');
      return fields[1] !== pdf && (!report || key(fields[0]) !== key(report));
    })
    : [];
  rows.push([report || '', pdf, html, format, new Date().toISOString().slice(0, 10)].join('\t'));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, '# report\tpdf\thtml\tformat\tdate — written by generate-typst-pdf.mjs, do not edit\n' + rows.join('\n') + '\n');
}

function main() {
  const args = process.argv.slice(2);
  const input = args[0];
  const output = args[1];
  if (!input || !output) throw new Error('Usage: node generate-typst-pdf.mjs <input.json|dashboard.html> <output.pdf> [--format=letter|a4] [--report=NNN]');
  const inputPath = resolve(input);
  const outputPath = resolve(output);
  const format = args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'letter';
  const report = args.find(arg => arg.startsWith('--report='))?.split('=')[1] || '';
  const payload = toTypstPayload(readPayload(inputPath));
  const payloadText = JSON.stringify(payload);
  for (const phrase of ['SYSTEX', 'Software Engineering Intern', 'tailored for']) {
    if (payloadText.toLowerCase().includes(phrase.toLowerCase())) throw new Error(`Forbidden resume content: ${phrase}`);
  }
  payload.meta.paper_size = format;
  const runtimeDir = resolve(root, '.typst-runtime');
  mkdirSync(runtimeDir, { recursive: true });
  mkdirSync(dirname(outputPath), { recursive: true });
  const runtimeName = `${randomUUID()}.json`;
  const runtimePath = resolve(runtimeDir, runtimeName);
  writeFileSync(runtimePath, JSON.stringify(payload));
  try {
    const result = spawnSync('typst', ['compile', '--root', root, '--input', `payload=../.typst-runtime/${runtimeName}`, 'templates/cv-template.typ', outputPath], { cwd: root, encoding: 'utf8' });
    if (result.status !== 0) throw new Error((result.stderr || result.stdout || 'Typst compilation failed').trim());
    const info = spawnSync('pdfinfo', [outputPath], { encoding: 'utf8' });
    if (info.status !== 0) throw new Error('PDF generated, but pdfinfo page verification failed');
    const pages = Number(info.stdout.match(/^Pages:\s+(\d+)/m)?.[1] || 0);
    if (pages !== 1) {
      rmSync(outputPath, { force: true });
      throw new Error(`Typst CV must be exactly one page; generated ${pages}`);
    }
    updateManifest(report, outputPath, extname(inputPath).toLowerCase() === '.html' ? inputPath : '', format);
    process.stdout.write(JSON.stringify({ pdf: outputPath, pages, renderer: 'typst' }) + '\n');
  } finally {
    rmSync(runtimePath, { force: true });
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
