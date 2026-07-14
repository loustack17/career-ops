# Templates

System-layer template files used by career-ops scripts and modes. These files are auto-updated when you run `npm run update` -- put user customizations in the user-layer files instead (see DATA_CONTRACT.md).

## Files

| File | Used By | Purpose |
|------|---------|---------|
| `cv-template.typ` | `generate-typst-pdf.mjs` | Required Typst renderer for resume PDFs |
| `cv-template.html` | `build-cv-html.mjs` | HTML/CSS dashboard artifact matching the Typst resume structure |
| `resume-template.html` | `build-cv-html.mjs` (via template selection) | Resume-branded HTML variant; only the document title differs from `cv-template.html` |
| `cv-template.tex` | `generate-latex.mjs` | LaTeX/Overleaf template for ATS-optimized CV PDFs |
| `portals.example.yml` | Onboarding | Example portal scanner configuration (copy to `portals.yml` to activate) |
| `states.yml` | `verify-pipeline.mjs`, `normalize-statuses.mjs`, `merge-tracker.mjs` | Canonical application states and their aliases |

### cv-template.html

The HTML dashboard template. Uses placeholder tokens (`{{NAME}}`, `{{SUMMARY_TEXT}}`, `{{EXPERIENCE}}`, etc.) that `build-cv-html.mjs` fills from the same payload used by Typst.

**Design:** Helvetica Neue with Liberation Sans fallback, single-column ATS-safe layout.

**Customization:** Edit this file to change colors, spacing, or section order. The placeholder tokens are documented in `batch/batch-prompt.md` under "Template placeholders."

### resume-template.html

Resume-branded dashboard variant of `cv-template.html`. It uses the same structure and placeholder tokens; only the document title reads "Resume".

**Keep in sync:** When updating `cv-template.html`, apply the same change to `resume-template.html` and preserve the title difference.

### cv-template.tex

LaTeX template for Overleaf-compatible CV generation. Based on the [sb2nov/resume](https://github.com/sb2nov/resume) format. Uses placeholder tokens (`{{NAME}}`, `{{EXPERIENCE}}`, `{{PROJECTS}}`, etc.) that the LaTeX pipeline fills at generation time.

**Design:** Single-column ATS-safe layout using standard CTAN packages (`fontawesome5`, `enumitem`, `hyperref`, `titlesec`). No custom fonts or external dependencies — uploads directly to Overleaf.

**Usage:**
```bash
node reserve-cv-output.mjs --company="Acme" --role="Backend Engineer" --candidate="Jane Smith" --date="2026-07-13"
node generate-latex.mjs "{reserved tex path}" "{reserved pdf path}"
node reserve-cv-output.mjs --release="{reservation path}"
```

**Prerequisites:** `pdflatex` via [MiKTeX](https://miktex.org/) (Windows) or TeX Live (Linux/macOS). First compilation may auto-install missing LaTeX packages. Alternatively, upload the `.tex` file directly to [Overleaf](https://www.overleaf.com) — no local install needed.

**Customization:** Edit this file to change margins, section order, or formatting commands. The placeholder tokens are documented in `modes/latex.md` under "Template Placeholders."

### portals.example.yml

Pre-configured portal scanner with 45+ tracked companies and search queries. Contains title filters, company career page URLs, Greenhouse API endpoints, and WebSearch queries.

**To activate:** Copy to project root as `portals.yml` and customize `title_filter.positive` keywords for your target roles. Add or remove companies as needed.

### states.yml

Defines the 9 canonical application states (`Evaluated`, `Applied`, `Responded`, `Interview`, `Offer`, `Hired`, `Rejected`, `Discarded`, `SKIP`) with aliases for common variants. All pipeline scripts validate statuses against this file.

**Do not rename states** -- the dashboard and all scripts depend on these exact IDs. You can add aliases if you encounter new variants that should map to an existing state.
