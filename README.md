# Tender Package Builder — Competition Edition

Name: Nura ALom Tafim 
Website Link: https://tenderpackagebuilder.vercel.app/
Frontend-only implementation for the AI DevFest "Tender Document Package Builder".

## Core requirements covered

- `requirements.json` loading and ordered requirement display
- Multi-PDF upload with 30-file / 50 MB guardrails
- Non-PDF rejection
- PDF page counting and damaged/password-protected file handling
- One-to-one matching
- Exact duplicate detection with SHA-256
- Required status rules: Missing / Expiry date needed / Expired / Not provided / OK
- Immediate status updates
- Generate button disabled while blocking issues remain
- English cover page
- Optional index page
- Ordered document merge
- Footer on every page: `<tender_id> | Page X of Y`
- Output filename: `<tender_id>_Package.pdf`
- English/Bangla interface
- Browser-only processing

## Competition-focused bonus features

- Filename-based auto-match suggestions with confidence
- One-click Auto-match all
- IndexedDB Save / Reopen in the browser
- CSV checklist export
- First-page PDF preview with page navigation
- Optional PNG seal/signature placement on selected pages of matched source documents
- Searchable uploaded-file list
- Progress / issue dashboard
- Exact duplicate grouping and conflict prevention
- Responsive UI for desktop and smaller screens

## Run

Open `index.html` in the latest Google Chrome.

No backend, database, or document upload API is used for tender documents. The only persistence feature is local browser IndexedDB.

External browser-loaded libraries:
- pdf-lib 1.17.1
- PDF.js 3.11.174
- Inter font
