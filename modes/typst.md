# Mode: typst — Typst CV Export

Export a tailored, ATS-optimized CV as PDF via `typst compile`.

## Pipeline

### Content generation (same rules as `pdf` mode)

1. Read `cv.md` as source of truth
2. Read `config/profile.yml` for candidate identity and contact info
3. Ask the user for the JD if not already in context (text or URL)
4. Extract 15-20 keywords from the JD
5. Detect JD language → CV language (EN default)
6. Detect company location → paper format:
   - US/Canada → `letter`
   - Rest of world → `a4`
7. Detect role archetype → adapt framing
8. Rewrite the Professional Summary from verified `cv.md` evidence, leading with the target role, years of experience, strongest relevant value, and supported JD keywords
9. Omit the Projects section and set `projects` to an empty array
10. Rewrite and reorder experience bullets by JD relevance. Keep 3-5 distinct bullets for every role that has at least 3 verified source bullets. Choose the structure from verified evidence: Impact/Outcome, Scope/Scale, Action/Problem, and How/Mechanism. Lead with a measured outcome when one exists; otherwise lead naturally with the problem, action, scope, or enabled capability. Scale may be traffic, users, engineers, APIs, clients, records, duration, system breadth, operational criticality, or team leverage. Each bullet needs one main claim and concrete proof, but does not need all four components. Never invent abstract value.
11. Build competency grid from JD requirements (6-8 keyword phrases)
12. Inject keywords naturally into existing achievements (NEVER invent)
13. Run a human-voice gate before rendering. Reject the draft if an eligible role has fewer than 3 bullets, its strongest relevant outcome or scale was dropped, bullets repeat the same sentence pattern, implementation inventories bury the claim, wording is stiff or abstract, or the candidate could not say it naturally in an interview. Prefer ordinary verbs and mix metric-first, problem-first, scope-first, action-first, and short technical bullets.

### Payload and compile (Typst-specific)

14. Read `candidate.full_name` from `config/profile.yml` → normalize to kebab-case lowercase (e.g. "John Doe" → "john-doe") → `{candidate}`
15. Write one shared dashboard/Typst JSON payload with this structure:
    ```json
    {
      "lang": "en",
      "page_format": "letter",
      "company": "...",
      "role": "...",
      "source_jd": "URL or path to JD",
      "source_report": "path/to/report.md",
      "candidate": {
        "name": "...",
        "email": "...",
        "location": "...",
        "linkedin": {"url": "...", "display": "..."},
        "github": {"url": "...", "display": "..."},
        "portfolio": {"url": "...", "display": "..."}
      },
      "summary": "... (from cv.md, rewritten with JD keywords)",
      "competencies": ["...", "..."],
      "experience": [{ "company": "...", "location": "...", "role": "...", "period": "...", "bullets": ["..."] }],
      "projects": [],
      "education": [{ "title": "...", "org": "...", "year": "...", "description": "..." }],
      "certifications": [{ "title": "...", "org": "...", "year": "..." }],
      "skills": [{ "category": "...", "items": ["..."] }]
    }
    ```
    **CRITICAL:** Pull name, location, email, linkedin, github, and portfolio_url from `config/profile.yml`. Omit phone from every resume payload and rendered artifact. This is the same payload shape documented in `modes/pdf.md`; do not create a second Typst-only schema.
16. Choose a concise role label that preserves the advertised level and core role. Run `node reserve-cv-output.mjs --company="{company}" --role="{short role}" --candidate="{candidate}" --date="{YYYY-MM-DD}"` and use its returned paths exactly.
17. Build and retain the matching HTML dashboard artifact at the reserved `html` path with `build-cv-html.mjs`. It is a web/dashboard source artifact and must never be used as the PDF renderer.
18. Run `node generate-typst-pdf.mjs <payload.json|dashboard.html> "{reserved pdf path}" --format={letter|a4} --report={NNN}`. The report number is internal metadata and never appears in the filename.
19. Delete standalone temporary payload files after successful generation. Release the reservation with `node reserve-cv-output.mjs --release="{reservation path}"` after both artifacts exist, and release it on failure as well.
20. Verify the PDF is exactly one page and report: PDF path, file size, section count, keyword coverage %.

Filename rule: `cv-{company}-{short-role}-{candidate}-{YYYY-MM-DD}`. The first collision becomes `-v2`, followed by `-v3`. PDF and HTML always share the resolved basename; existing files are never overwritten.

**Requires:** `typst` on PATH (`brew install typst` or `cargo install typst-cli`).

## Section order (optimized "6-second recruiter scan")

1. Header (large name, gradient, contact, portfolio link)
2. Professional Summary (3-4 lines, keyword-dense)
3. Core Competencies (6-8 keyword phrases in chip grid)
4. Work Experience (reverse chronological)
5. Education & Certifications
6. Skills (languages + technical)

## Template

Single-file: `templates/cv-template.typ`
Fonts: Helvetica Neue, with Liberation Sans as the compatible fallback

### CV Data Injection

Populate the JSON payload with data from `cv.md` and `config/profile.yml`:

| Section | Source |
|---------|--------|
| Header (name, contact, links) | `profile.yml` → identity |
| Professional Summary | `cv.md` Summary, rewritten with JD keywords |
| Core Competencies | JD requirements → 6-8 phrases |
| Work Experience | `cv.md` Work Experience, bullets reordered by JD relevance |
| Projects | Always empty for resume output |
| Education | `cv.md` Education section; completed programs show graduation year only |
| Certifications | `cv.md` Certifications; render under Education & Certifications |
| Skills | `cv.md` Technical Skills, reorganized for JD |

## Keyword injection strategy (ethical, truth-based)

Same rules as `modes/pdf.md`:

Examples of legitimate rewording:
- JD says "RAG pipelines" and CV says "LLM workflows with retrieval" → change to "RAG pipeline design and LLM orchestration workflows"
- JD says "MLOps" and CV says "observability, evals, error handling" → change to "MLOps and observability: evals, error handling, cost monitoring"
- JD says "stakeholder management" and CV says "collaborated with team" → change to "stakeholder management across engineering, operations, and business"

**NEVER add skills the candidate does not have. Only rephrase real experience using the exact vocabulary from the JD.**

## ATS Rules (same as pdf mode)

- Single-column layout (enforced by template)
- Standard section headers: "Professional Summary", "Work Experience", "Education & Certifications", "Skills"
- No text in images/SVGs
- No critical info in PDF headers/footers (ATS ignores them)
- UTF-8, selectable text (not rasterized)
- No nested tables
- JD keywords distributed: Summary (top 5), first bullet of each role, Skills section

## Post-generation

Update tracker if the offer is already registered: change PDF from ❌ to ✅.

## Cover Letter

The cover letter template (`templates/cover-letter-template.typ`) is minimal — only the letter content:

```
Dear Hiring Team,

[body paragraph 1]

[body paragraph 2]

[body paragraph 3]

Sincerely,

Lou Chang
```

No header, no contacts row, no date, no recipient address block. The CV already has all contact info.

**Payload structure for cover letter:**
```json
{
  "meta": { "candidate_name": "...", "company": "...", "role": "...", "language": "en", "paper_size": "letter" },
  "identity": { "full_name": "..." },
  "letter": {
    "salutation": "Dear Hiring Team,",
    "body": ["paragraph 1", "paragraph 2", "paragraph 3"],
    "closing": "Sincerely,"
  }
}
```

**Key differences from CV template:**
- No header/contacts — CV already has them
- Helvetica Neue 11pt with Liberation Sans fallback, 1.25in margins, no gradient or color
- `identity` only needs `full_name` (for the signature)
- `letter` only needs `salutation`, `body`, `closing`
