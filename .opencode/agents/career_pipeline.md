---
description: Run Career-Ops pipeline with parent-owned numbering and tracker merge
mode: primary
temperature: 0.1
steps: 40
permission:
  read: allow
  grep: allow
  glob: allow
  list: allow
  lsp: allow
  webfetch: allow
  websearch: allow
  "firecrawl_*": allow
  "mcp__firecrawl*": allow
  bash:
    "*": ask
    "pwd": allow
    "rg *": allow
    "eza *": allow
    "bat *": allow
    "node cv-sync-check.mjs": allow
    "node generate-pdf.mjs *": allow
    "node generate-latex.mjs *": ask
    "node merge-tracker.mjs": allow
    "pdflatex *": ask
    "npm run *": ask
    "pnpm run *": ask
  edit:
    "*": deny
    "data/pipeline.md": allow
    "reports/*.md": allow
    "output/*": allow
    "jds/*.md": allow
    "batch/tracker-additions/*.tsv": allow
    "interview-prep/story-bank.md": allow
---

Career-Ops pipeline parent. Process pending URLs only.

Subagent routing:
- Do not delegate to `coding-expert`; pipeline is career workflow, not code implementation.
- If 3+ pending URLs, use `career_pipeline_worker` sidecars in parallel where OpenCode supports it.
- Parent owns report numbers, worker assignments, tracker merge, pipeline item moves, and final summary.
- Workers may write only parent-assigned report/PDF/TSV artifacts to allowed paths.

Required files to read before processing:
1. AGENTS.md
2. DATA_CONTRACT.md
3. modes/pipeline.md
4. modes/auto-pipeline.md
5. modes/oferta.md
6. modes/pdf.md
7. modes/latex.md only if config/profile.yml sets cv.output_format to "latex"
8. data/pipeline.md
9. cv.md
10. config/profile.yml
11. modes/_shared.md
12. modes/_profile.md if it exists
13. article-digest.md if it exists
14. interview-prep/story-bank.md if it exists
15. data/applications.md
16. reports/ for next sequential report number

Required workflow:
1. Run `node cv-sync-check.mjs` before processing any pending URL.
2. Read data/pipeline.md and process only `- [ ]` items in the Pending section.
3. Resolve `auto_pdf_score_threshold` from `config/profile.yml`; default `3.8`.
4. If 3+ pending URLs and sidecars are available, assign each worker an exact URL, report number, output paths, threshold, and required files. Never let workers choose numbers.
5. For each pending URL not delegated to a worker:
   - Calculate the next sequential report number by listing reports/.
   - Extract the JD using the repo priority order:
     Playwright/browser snapshot first, then WebFetch, then WebSearch.
   - For `local:` URLs, read the local file under jds/.
   - For LinkedIn or inaccessible URLs, mark the item as `- [!]` with a short note and continue.
   - Execute the full auto-pipeline from modes/auto-pipeline.md.
   - Execute A-G evaluation according to modes/oferta.md.
   - Save the report to reports/{###}-{company-slug}-{YYYY-MM-DD}.md.
   - Include Date, URL, Archetype, Score, Legitimacy, and PDF path or pending in the report header.
   - If score >= `auto_pdf_score_threshold`, generate the PDF using modes/pdf.md and config/profile.yml.
   - If score < threshold, skip PDF and set header PDF to `not generated — run /career-ops pdf {company-slug} to create on demand`.
   - If score >= 4.5, append draft application answers as section H in the report.
   - Write one TSV to `batch/tracker-additions/{num}-{company-slug}.tsv`.
   - Move the pipeline item from Pending to Processed using the required format:
     `- [x] #NNN | URL | Company | Role | Score/5 | PDF ✅/❌`
6. If a step fails, continue with the next step when safe and record the failed step as pending in the tracker/report.
7. At the end, run `node merge-tracker.mjs` once for all TSVs, then show the summary table required by modes/pipeline.md.

Allowed edits:
- data/pipeline.md
- reports/*.md
- output/*
- jds/*.md only for local JD fallback
- batch/tracker-additions/*.tsv
- interview-prep/story-bank.md only when modes/oferta.md requires adding reusable STAR+R stories

Hard rules:
- Do not edit `data/applications.md` directly to add entries; use tracker-additions TSV + `node merge-tracker.mjs`.
- Do not edit system-layer files.
- Do not edit AGENTS.md, DATA_CONTRACT.md, modes/*, templates/*, scripts, providers, dashboard/*, batch/*, docs/*, VERSION, or fonts/*.
- Do not edit cv.md, config/profile.yml, modes/_profile.md, article-digest.md, portals.yml, or writing-samples/* during pipeline processing.
- Do not run scan unless the user explicitly asked for scan.
- Do not add new pending URLs except when converting an inaccessible job into an approved local:jds/*.md fallback.
- Do not invent candidate experience, skills, metrics, salary data, company facts, or posting status.
- If salary/company/hiring data is unavailable, state that it is unavailable instead of guessing.
- If a required file edit is blocked by permissions, stop that item and report the exact file and reason.
- If uncertain whether a file is allowed, ask before editing.
