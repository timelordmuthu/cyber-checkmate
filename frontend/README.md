# CyberCheckmate Frontend

Mobile-first web application for CyberCheckmate — an AI-powered scam and fraud detection assistant tailored for Indian messages (SMS, WhatsApp, UPI, KYC, links, and screenshots).

Built with **React + Vite (JavaScript)** and styled using **Tailwind CSS**.

---

## 🚀 Running (Windows PowerShell)

Follow these steps to run the frontend application:

1. **Install clean dependencies:**
   ```powershell
   npm ci
   ```

2. **Configure environment:**
   ```powershell
   Copy-Item .env.example .env.local
   ```

3. **Start development server:**
   ```powershell
   npm run dev
   ```
   The application runs at `http://localhost:5173`.

4. **Mock mode (no backend required):**
   In `.env.local`, set:
   ```env
   VITE_USE_MOCK=true
   ```
   Every API call will return contract fixtures without needing a backend server running.

5. **Connecting to another laptop (two-laptop setup):**
   Point to the teammate's backend IP in `.env.local`:
   ```env
   VITE_BACKEND_URL=http://<their-ip>:8000
   VITE_USE_MOCK=false
   ```
   Because the browser only ever talks to Vite's own origin (`http://localhost:5173`), Vite proxies requests behind the scenes and there is no CORS setup required.

For complete integration instructions and the two-laptop workflow, see [INTEGRATION.md](../INTEGRATION.md).

---

## 📋 Contract Check

To machine-check the live backend against `contracts/API-CONTRACT.md` and schema definitions:

```powershell
cd frontend; $env:BACKEND_URL="http://127.0.0.1:8000"; npm run contract:check
```

With admin endpoints enabled:
```powershell
cd frontend; $env:BACKEND_URL="http://127.0.0.1:8000"; $env:ADMIN_TOKEN="<token>"; npm run contract:check
```

To record raw responses for team review (saved to `contracts/recorded/`):
```powershell
cd frontend; node scripts/contract-check.mjs --record
```

Every row in the printed table must report `PASS`. A failing row names the endpoint and the field to fix. Recorded files are for manual review and must never replace fixtures automatically.

---

## 🧪 Available Scripts

```powershell
npm run dev             # Start dev server on port 5173
npm run build           # Build production bundle to dist/
npm run preview         # Preview production build on port 4173
npm test                # Run Vitest test suite
npm run lint            # Run Oxlint
npm run check:routes    # Verify no page routes use reserved API prefixes
npm run contract:check  # Validate backend API against contract schemas
npm run parity          # Check parity between Python and on-device models
npm run e2e             # Run Playwright end-to-end tests
```

---

## 🎨 Design Tokens & Palette

Strict adherence to PRD Section 16.14:
- Deep forest greens: `#051F20`, `#0B2B26`, `#163832`, `#235347`
- Mint accents: `#8EB698`, `#DAF1DE`
- Risk markers: Red (Checkmate), Amber (Check), Green (Safe)
- Plum / Cream secondary surfaces

---

## ✨ Credits & Component Libraries

Interactive micro-interactions and animations powered by **[React Bits](https://reactbits.dev)**:
- `DotGrid.jsx`: Spring-physics interactive background grid (Check page only)
- `DecryptedText.jsx`: Hacker-style glyph title reveal effect
- `CountUp.jsx`: Smooth risk-score numerical counter
- `SpotlightCard.jsx`: Radial cursor spotlight card presentation for results

---

## 🛡️ Privacy & Guardrails

- Summaries only are stored in client-side storage (`localStorage` key `cc_history_v1`).
- Never stores message texts, extracted texts, URLs, evidence snippets, or uploaded images.
- Admin token is kept exclusively in `sessionStorage` and never persisted to URLs or `localStorage`.
- All text rendered cleanly as React JSX (no `dangerouslySetInnerHTML`).
- All animations respect `prefers-reduced-motion`.
