import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { releaseCvOutput, reserveCvOutput, slugifyCvPart } from '../reserve-cv-output.mjs';

test('slugifyCvPart creates lowercase ASCII filename parts', () => {
  assert.equal(slugifyCvPart('Senior Backend Engineer'), 'senior-backend-engineer');
  assert.equal(slugifyCvPart('  DNAstack Inc.  '), 'dnastack-inc');
});

test('reserveCvOutput uses the application-facing filename order', () => {
  const outputDir = mkdtempSync(join(tmpdir(), 'career-ops-cv-output-'));
  const result = reserveCvOutput({
    company: 'DNAstack',
    role: 'Backend Engineer',
    candidate: 'Lou Chang',
    date: '2026-07-13',
    outputDir,
  });

  assert.equal(result.basename, 'cv-dnastack-backend-engineer-lou-chang-2026-07-13');
  assert.equal(basename(result.pdf), `${result.basename}.pdf`);
  assert.equal(basename(result.html), `${result.basename}.html`);
  assert.equal(basename(result.tex), `${result.basename}.tex`);
  assert.ok(existsSync(result.reservation));
  releaseCvOutput(result.reservation, outputDir);
  assert.equal(existsSync(result.reservation), false);
});

test('reserveCvOutput increments versions without overwriting either artifact', () => {
  const outputDir = mkdtempSync(join(tmpdir(), 'career-ops-cv-output-'));
  const first = reserveCvOutput({
    company: 'DNAstack',
    role: 'Backend Engineer',
    candidate: 'Lou Chang',
    date: '2026-07-13',
    outputDir,
  });
  releaseCvOutput(first.reservation, outputDir);
  writeFileSync(first.html, 'existing');

  const second = reserveCvOutput({
    company: 'DNAstack',
    role: 'Backend Engineer',
    candidate: 'Lou Chang',
    date: '2026-07-13',
    outputDir,
  });

  assert.equal(second.basename, `${first.basename}-v2`);
  assert.equal(existsSync(first.html), true);
  releaseCvOutput(second.reservation, outputDir);
});

test('reserveCvOutput treats a LaTeX artifact as a filename collision', () => {
  const outputDir = mkdtempSync(join(tmpdir(), 'career-ops-cv-output-'));
  const first = reserveCvOutput({
    company: 'DNAstack',
    role: 'Backend Engineer',
    candidate: 'Lou Chang',
    date: '2026-07-13',
    outputDir,
  });
  releaseCvOutput(first.reservation, outputDir);
  writeFileSync(first.tex, 'existing');

  const second = reserveCvOutput({
    company: 'DNAstack',
    role: 'Backend Engineer',
    candidate: 'Lou Chang',
    date: '2026-07-13',
    outputDir,
  });

  assert.equal(second.basename, `${first.basename}-v2`);
  releaseCvOutput(second.reservation, outputDir);
});

test('reserveCvOutput rejects invalid calendar dates', () => {
  assert.throws(() => reserveCvOutput({
    company: 'DNAstack',
    role: 'Backend Engineer',
    candidate: 'Lou Chang',
    date: '2026-02-30',
    outputDir: mkdtempSync(join(tmpdir(), 'career-ops-cv-output-')),
  }), /valid calendar date/);
});
