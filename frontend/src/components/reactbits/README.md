# React Bits Components

All components are sourced from **[React Bits](https://reactbits.dev/)** and are subject to the
**MIT + Commons Clause** licence. Do **not** sub-license or sell these files.

Components are installed by fetching `https://reactbits.dev/r/<Name>-JS-TW.json` and writing
`files[0].content` verbatim to `src/components/reactbits/<Name>.jsx` (sub-folder flattened).
Never hand-write a component in this directory and label it as React Bits.

---

## Component Inventory

| Name | Source URL | Installed on | npm deps added | Used in (page) | Local edits |
|---|---|---|---|---|---|
| AnimatedContent | https://reactbits.dev/r/AnimatedContent-JS-TW.json | 2026-10-22 | gsap@^3.13.0 | — | none |
| AnimatedList | https://reactbits.dev/r/AnimatedList-JS-TW.json | 2026-10-22 | @hugeicons/react, @hugeicons/core-free-icons (already installed) | DashboardPage, HistoryPage | none |
| BorderGlow | https://reactbits.dev/r/BorderGlow-JS-TW.json | 2026-10-22 | none | LoginPage, ResultPage | none |
| Counter | https://reactbits.dev/r/Counter-JS-TW.json | 2026-10-22 | none | DashboardPage | none |
| CountUp | (pre-existing) | pre-FE3-6 | none | DashboardPage (metrics) | none |
| DecryptedText | (pre-existing) | pre-FE3-6 | none | LoginPage (header), DashboardPage (greeting) | none |
| DepthText | https://reactbits.dev/r/DepthText-JS-TW.json | 2026-10-22 | none | LoginPage (title) | none |
| DotGrid | (pre-existing) | pre-FE3-6 | none | CheckPage (background) | none |
| ElectricBorder | https://reactbits.dev/r/ElectricBorder-JS-TW.json | 2026-10-22 | none | ResultPage (red verdict) | none |
| FadeContent | https://reactbits.dev/r/FadeContent-JS-TW.json | 2026-10-22 | gsap@^3.13.0 | LoginPage | none |
| HoldButton | https://reactbits.dev/r/HoldButton-JS-TW.json | 2026-10-22 | none | HistoryPage (clear), ConsoleModelsPage (force activate) | none |
| LatticeLoader | https://reactbits.dev/r/LatticeLoader-JS-TW.json | 2026-10-22 | none | CheckPage (overlay), ConsoleRetrainPage | none |
| MagicBento | https://reactbits.dev/r/MagicBento-JS-TW.json | 2026-10-22 | @hugeicons/react, @hugeicons/core-free-icons (already installed) | DashboardPage (action grid) | none |
| Radar | https://reactbits.dev/r/Radar-JS-TW.json | 2026-10-22 | none | LoginPage (background), ScamRadarPage | none |
| RubberSegment | https://reactbits.dev/r/RubberSegment-JS-TW.json | 2026-10-22 | motion@^12.23.12 (already installed as ^12.43.0) | CheckPage (modes), HistoryPage (filter), ConsoleReportsPage (filter) | added onClick fallback for pointerless click & test environments |
| ShinyText | https://reactbits.dev/r/ShinyText-JS-TW.json | 2026-10-22 | none | — | none |
| SloshGauge | https://reactbits.dev/r/SloshGauge-JS-TW.json | 2026-10-22 | none | ResultPage (score gauge) | none |
| SpotlightCard | (pre-existing) | pre-FE3-6 | none | ResultPage (verdict card) | none |
| SplitFlapText | https://reactbits.dev/r/SplitFlapText-JS-TW.json | 2026-10-22 | none | DashboardPage (cycling board) | none |
| StatusMark | https://reactbits.dev/r/StatusMark-JS-TW.json | 2026-10-22 | motion@^12.23.12 (already installed) | — | none |
| Stepper | https://reactbits.dev/r/Stepper-JS-TW.json | 2026-10-22 | @hugeicons/react, @hugeicons/core-free-icons (already installed) | ConsoleRetrainPage (status) | none |
| SwipeToast | https://reactbits.dev/r/SwipeToast-JS-TW.json | 2026-10-22 | motion@^12.23.12, @hugeicons/react, @hugeicons/core-free-icons (already installed) | ToastContext.jsx | none |

---

## Licence

**MIT + Commons Clause** — React Bits components may be used freely in open-source and
commercial projects but may **not** be sold as a standalone UI library or component kit.
See https://reactbits.dev for full terms.
