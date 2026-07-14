# Mode: pdf — ATS-Optimized PDF Generation

## Full pipeline

1. Read `cv.md` as the source of truth
2. Ask the user for the JD if it is not in context (text or URL)
3. Extract 15-20 keywords from the JD
4. Run the zero-LLM skill-gap check before drafting anything: write the JD to a scratch file (e.g. `jds/{slug}.md`) if it isn't already one, then `node jd-skill-gap.mjs jds/{slug}.md --summary`. This classifies the JD's explicit requirements against `cv.md` into three buckets — never surface `result.gap` items as if the candidate has them:
   - `existing` — already a named skill in cv.md's Skills section, safe to lead with
   - `supportedByResume` — not a named skill yet, but cv.md's prose already demonstrates it; legitimate candidates for the Skills section in the user's own words (Step 12's competency grid draws from here first)
   - `gap` — cv.md has no trace of it at all. **Tell the user explicitly which skills are gaps before generating the CV.** Never paper over a gap by inventing a claim, and never silently drop it from the conversation — the user decides whether to proceed, address it in the cover letter/interview, or skip the role
5. Detect JD language → CV language (EN default)
6. Detect company location → paper format:
   - US/Canada → `letter`
   - Rest of the world → `a4`
7. Detect role archetype → adapt framing
8. Build an internal recruiter-side risk map from the JD using `modes/heuristics/recruiter-side.md`: likely doubts, matching evidence, and which document section should address each doubt
9. Rewrite the Professional Summary from verified `cv.md` evidence, leading with the target role, years of experience, strongest relevant value, and supported JD keywords
10. Omit the Projects section and reserve the space for Work Experience
11. Rewrite and reorder experience bullets by JD relevance and by the risk map. Keep 3-5 distinct bullets for every role that has at least 3 verified source bullets. Choose the structure from verified evidence: Impact/Outcome, Scope/Scale, Action/Problem, and How/Mechanism. Lead with a measured outcome when one exists; otherwise lead naturally with the problem, action, scope, or enabled capability. Scale may be traffic, users, engineers, APIs, clients, records, duration, system breadth, operational criticality, or team leverage. Each bullet needs one main claim and concrete proof, but does not need all four components. Never invent abstract value.
12. Build competency grid from JD requirements (6-8 keyword phrases)
13. Inject keywords naturally into existing achievements (NEVER invent)
14. Apply the six-second clarity gate from `modes/heuristics/recruiter-side.md`: top third must make target role, strongest fit, and proof obvious
15. Run a human-voice gate before rendering. Reject the draft if an eligible role has fewer than 3 bullets, its strongest relevant outcome or scale was dropped, bullets repeat the same sentence pattern, implementation inventories bury the claim, wording is stiff or abstract, or the candidate could not say it naturally in an interview. Prefer ordinary verbs and mix metric-first, problem-first, scope-first, action-first, and short technical bullets.
16. Use `templates/cv-template.typ` for every resume PDF. HTML remains a dashboard artifact only.
17. Read `candidate.full_name` from `config/profile.yml` and choose a concise role label that preserves the advertised level and core role, such as `Senior Backend Engineer`.
18. Reserve the output pair by running `node reserve-cv-output.mjs --company="{company}" --role="{short role}" --candidate="{candidate}" --date="{YYYY-MM-DD}"`. Use the returned `html`, `pdf`, and `reservation` paths exactly.
19. Read `modes/_custom.md` if it exists and apply its formatting/content house rules to the tailored CV.
20. Build a Typst payload JSON using the same tailored content (summary, competencies, strengthened experience, education, certifications, skills); set `projects` to an empty array.
21. Write the payload to `/tmp/{reserved basename}.json`.
22. Build the dashboard HTML at the reserved `html` path using `build-cv-html.mjs`.
23. Execute `node generate-typst-pdf.mjs /tmp/{reserved basename}.json "{reserved pdf path}" --format={letter|a4} --report={NNN}` and require an exactly one-page result. The report number remains internal metadata and never appears in the filename.
24. Delete the temporary payload and release the filename reservation with `node reserve-cv-output.mjs --release="{reservation path}"` after both artifacts exist. Release the reservation on failure as well.
25. If Typst is unavailable, stop and report the missing dependency without generating a PDF.
26. Report: PDF path, number of pages, keyword coverage %.

## ATS Rules (clean parsing)

- Single-column layout (no sidebars, no parallel columns)
- Standard headers: "Professional Summary", "Work Experience", "Education & Certifications", "Skills"
- No text in images/SVGs
- No critical info in PDF headers/footers (ATS ignores them)
- UTF-8, selectable text (not rasterized)
- No nested tables
- Distributed JD keywords: Summary (top 5), first bullet of each role, Skills section
- No hidden text, keyword stuffing, or white-font tricks. Optimize for parseability plus human review.

## Recruiter Review Gates

- The summary should answer: "What role is this person targeting, and why this one?"
- The first screen should show 1-2 proof points that map to the JD's highest-risk requirements.
- Bullets should emphasize outcomes, systems, users, or business effects rather than task history.
- Logistics such as location, work authorization, salary, and availability belong in the CV only when appropriate for the market and profile; otherwise handle them in form answers or recruiter scripts.

## PDF Design

- **Fonts**: Helvetica Neue, with Liberation Sans as the compatible fallback
- **Header**: 18pt bold name, dark cyan-to-dark-blue divider, compact contact row
- **Section headers**: uppercase, dark cyan, compact divider
- **Body**: 8.75pt with compact single-page spacing
- **Company names**: dark blue
- **Margins**: 0.6in
- **Background**: pure white

## Template Typst (required in this repo)

Use `templates/cv-template.typ` for every resume PDF in this repository.

### Typst payload

Write a JSON payload to `/tmp/{reserved basename}.json`:

```json
{
  "meta": {
    "candidate_name": "...",
    "company": "...",
    "role": "...",
    "language": "en",
    "paper_size": "letter",
    "source_jd": "URL or path to JD",
    "source_report": "path/to/report.md"
  },
  "identity": {
    "full_name": "...",
    "location": "...",
    "contacts": [
      {"href": "mailto:...", "display": "..."},
      {"href": "https://linkedin.com/in/...", "display": "linkedin.com/in/..."},
      {"href": "https://github.com/...", "display": "github.com/..."},
      {"href": "https://portfolio-url", "display": "portfolio-url"}
    ]
  },
  "summary": "...",
  "core_competencies": ["...", "..."],
  "experience": [{ "company": "...", "location": "...", "role": "...", "period": "...", "bullets": ["..."] }],
  "projects": [{ "title": "...", "badge": "...", "description": "...", "tech": "..." }],
  "education": [{ "title": "...", "institution": "...", "year": "...", "description": "..." }],
  "certifications": [{ "title": "...", "issuer": "...", "year": "..." }],
  "skills": [{ "category": "...", "items": ["..."] }]
}
```

### Typst compile

Reserve matching application and dashboard filenames first:

```bash
node reserve-cv-output.mjs --company="{company}" --role="{short role}" --candidate="{candidate}" --date="{YYYY-MM-DD}"
node build-cv-html.mjs /tmp/{reserved basename}.json "{reserved html path}"
node generate-typst-pdf.mjs /tmp/{reserved basename}.json "{reserved pdf path}" --format={letter|a4} --report={NNN}
node reserve-cv-output.mjs --release="{reservation path}"
```

The first filename is `cv-{company}-{short-role}-{candidate}-{YYYY-MM-DD}`. If either matching artifact already exists or another worker holds the name, the resolver appends `-v2`, then `-v3`, without overwriting files. PDF and HTML must share the resolved basename.

### Typst rules

- Use the same content generation rules as this mode — do not invent a separate summary style, section order, or keyword strategy
- Pull `candidate_name`, contacts, and location from `config/profile.yml`
- Keep `projects` empty
- Display completed education with graduation year only
- Render education and certifications under one `Education & Certifications` heading
- Delete the payload JSON from `/tmp` after successful compile
- If `typst` is missing from PATH, stop without generating a PDF

## Section order (optimized "6-second recruiter scan")

1. Header (large name, gradient, contact, portfolio link)
2. Professional Summary (3-4 lines, keyword-dense)
3. Core Competencies (6-8 keyword phrases in flex-grid)
4. Work Experience (reverse chronological)
5. Education & Certifications
6. Skills (languages + technical)

## Keyword injection strategy (ethical, truth-based)

Examples of legitimate reformulation:
- JD says "RAG pipelines" and CV says "LLM workflows with retrieval" → change to "RAG pipeline design and LLM orchestration workflows"
- JD says "MLOps" and CV says "observability, evals, error handling" → change to "MLOps and observability: evals, error handling, cost monitoring"
- JD says "stakeholder management" and CV says "collaborated with team" → change to "stakeholder management across engineering, operations, and business"

**NEVER add skills that the candidate does not have. Only reword real experience using the exact JD vocabulary.**

## Template HTML

Build this HTML only as the retained web-dashboard artifact. Before generating, read `modes/_custom.md` if it exists and apply its formatting/content house rules to every CV in this session, including every item of a batch. The HTML must embed the structured payload through `build-cv-html.mjs`; never pass it to `generate-pdf.mjs`.

**Before generating: read `modes/_custom.md` (if it exists) and apply its formatting/content house rules to every CV in this session — including every item of a batch.** Rules recorded there (date formats, section-order preferences, content to always/never include) are persistent user instructions, not suggestions; if the user corrects the same thing twice in conversation, write it into `modes/_custom.md` so it stops drifting.

### Selecting the template

Resolve which template to fill with the shared resolver (do not hardcode `cv-template.html`):

- If the user named a template this turn (e.g. "use the *modern* template"), run:
  `node cv-templates.mjs resolve cv "<name>"`
- Otherwise run: `node cv-templates.mjs resolve cv`
  (this returns the `cv.template` default from `config/profile.yml`, or the base `cv-template.html` when unset).

The command prints the absolute path of the template to fill; a non-zero exit means the named template is missing or invalid — surface that message to the user instead of silently falling back.

To show the user their options (e.g. "what CV templates do I have?"), run `node cv-templates.mjs list cv` and present each `displayName`.

`build-cv-html.mjs` fills that resolved template from the JSON payload you build — it owns every tag, CSS class, and the HTML escaping, so you **never emit full HTML markup** and do **not** escape `&`/`<`/`>`/quotes yourself. Pass the resolved path as the third argument (`node build-cv-html.mjs <input.json> <output.html> <template.html>`); omit it to fall back to the base `cv-template.html`. This is the HTML twin of `build-cv-latex.mjs` (see `modes/latex.md`) and cuts the PDF step's output tokens from full markup down to the compact payload below (#557).

### JSON Input Schema

Write a JSON file with this structure, then run `node build-cv-html.mjs <input.json> <output.html> [template.html]` (the optional third argument is the template path from **Selecting the template**; omit it for the base `cv-template.html`).

```json
{
  "lang": "en",
  "page_format": "letter",
  "candidate": {
    "name": "Jane Smith",
    "email": "jane@example.com",
    "linkedin": { "url": "https://linkedin.com/in/janesmith", "display": "linkedin.com/in/janesmith" },
    "portfolio": { "url": "https://janesmith.dev", "display": "janesmith.dev" },
    "location": "San Francisco, CA",
    "photo": ""
  },
  "sections": {
    "summary": "Professional Summary",
    "competencies": "Core Competencies",
    "experience": "Work Experience",
    "education": "Education & Certifications",
    "skills": "Skills"
  },
  "summary": "Personalized summary with JD keywords injected (honest vs cv.md).",
  "competencies": ["RAG Pipelines", "LLMOps", "Kubernetes & Docker"],
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "location": "Remote",
      "dates": "June 2022 - Present",
      "bullets": ["Strongest quantified outcome", "Relevant system-scale achievement", "Business-value achievement"]
    }
  ],
  "projects": [],
  "education": [
    { "title": "B.S. Computer Science", "org": "University Name", "year": "2022", "description": "Optional line." }
  ],
  "certifications": [
    { "title": "Certified Kubernetes Administrator", "org": "CNCF", "year": "2024" }
  ],
  "skills": [
    { "category": "Languages", "items": "Python, JavaScript, C++" },
    { "category": "Frameworks", "items": ["FastAPI", "React", "PyTorch"] }
  ]
}
```

### Field reference

| Field | Type | Notes |
|-------|------|-------|
| `lang` | string | CV language code (`en`, `es`, `ja`, `ar`). Drives language-specific CSS: `ja` enables a CJK font fallback so Japanese renders instead of tofu (□); `ar` enables RTL + Arabic fonts. Defaults to `en`. |
| `page_format` | string | `letter` → `8.5in` page width, `a4` → `210mm`. Defaults to `letter`. Pass the same value to `generate-typst-pdf.mjs --format`. |
| `candidate.name` | string | From `profile.yml`. |
| `candidate.email` | string | From `profile.yml`. |
| `candidate.linkedin` | `{url, display}` | Optional — omit to drop the item and its separator. |
| `candidate.portfolio` | `{url, display}` | Optional — omit to drop the item and its separator. |
| `candidate.location` | string | From `profile.yml`. |
| `candidate.photo` | string | Opt-in profile photo (#264): a local path or `data:` URL. Empty/absent emits **no `<img>`**, rendering pixel-for-pixel identical to the photoless layout (US/UK/many-market ATS penalize photos; opt in for DACH/European markets). |
| `sections` | object | Optional localized section titles; any omitted key falls back to the English default shown above. |
| `summary` | string | Personalized summary with keywords. |
| `competencies` | string[] | 6-8 keyword phrases → competency tags. |
| `experience[]` | object | `company`, `role`, `location` (optional), `dates`, `bullets` (reordered, keyword-injected). |
| `education[]` | object | `title` (degree), `org` (institution), `year`, `description` (optional). |
| `certifications[]` | object | `title`, `org`, `year`. |
| `skills[]` | object | `category` + `items` (comma-separated string or string array). |

`build-cv-html.mjs` errors out (non-zero exit) if any template placeholder is left unresolved, so a malformed payload fails loudly instead of shipping a broken CV. Run `node build-cv-html.mjs --test` for a self-test render.

### Profile photo (opt-in, market-specific)

The `{{PHOTO}}` slot is **off by default** and intentionally market-specific:

- **DACH / much of continental Europe** (Germany, Austria, Switzerland): a professional photo is standard and often expected. Opt in by setting `candidate.photo` in `config/profile.yml` (a local file path or a `data:` URL).
- **US / UK / Canada / Australia and many ATS-first markets**: photos are discouraged and can trip bias-avoidance filters. Leave `candidate.photo` empty — the `{{PHOTO}}` line is dropped entirely, no `<img>` is emitted, and the CV renders **pixel-for-pixel identical** to today's photoless layout.

When set, the photo floats into the top corner (mirrored for RTL/Arabic) and the header/summary text wraps beside it; `.cv-photo` in `cv-template.html` controls its size and framing.

## Cover Letter Sub-flow

After generating the CV PDF, offer to generate a cover letter:

```text
CV PDF generated: output/{path}

Want a cover letter for this role too?
- Say "yes" or "cover letter" to generate one now
- Or run `/career-ops cover {slug}` later
```

Apply `voice-dna.md` (if present) to the cover letter — full guardrail, conversational voice included (Tier 1 + Tier 2). The CV PDF itself stays Tier 1 only (formal ATS register). See `_shared.md` → Voice DNA.

If the user says yes, run the full cover letter flow from `modes/cover.md` in slug mode:
1. Load the existing `## Cover Letter Draft` from the evaluation report as a starting point
2. Run company research (Step 3 of cover.md)
3. Present keyword list for confirmation (Step 4)
4. Surface any gaps (Step 5)
5. Ask the four prompts: why / problems / approach / tone (Step 6)
6. Draft in chat, wait for approval (Steps 7-8)
7. Generate the cover letter PDF through the Typst path in `modes/cover.md` (Step 9)
8. Report both PDF paths

Do not auto-generate the cover letter PDF without going through the interactive steps above.

## Post-generation

Update tracker if the job is already registered: change PDF from ❌ to ✅.
