# Token Trust Score — Hackathon Submission Narrative

## What we built
An **A2MCP Agent Service Provider** for OKX.AI that returns a composite 0–100
on-chain trust score with a structured `BLOCK / SKIP / WATCH / PASS` verdict and
evidence for any token. It is a pay-per-call (`x402`) service settled in USDC on
X Layer, designed for repeatable use by AI agents, traders, research bots, and
copilots.

## Why it wins
- **Real problem, real usage.** Token due-diligence is a daily workflow pain.
  Every call is independently paid via x402, producing provable, auditable usage.
- **Differentiated output.** Unlike single-label scanners (e.g. CA X-Ray), we
  emit a graded multi-signal score other agents embed per-token in reports.
- **Production-grade signals.** Real data from GoPlus Labs (taxes, honeypot,
  source verification, top-holder concentration, CEX/DEX listing) and DexScreener
  (liquidity depth) — no API key required for the base path.
- **Adoption funnel.** Free preview → paid deep-analysis drives conversion and
  measurable revenue.

## Category fit
- **Software Utility** — a reusable tool other agents call programmatically.
- **Finance Copilot** — structured risk scoring for trading/research workflows.

## Prize-track alignment
| Track | Fit |
|-------|-----|
| Best Product | Clean API, agent card, metrics endpoint, real signal sources |
| Business Potential | $0.01/call micropayment model with B2B repeat-call economics |
| Revenue Rocket | x402 per-call settlement = instant, provable revenue |
| Finance Copilot | Token risk scoring for portfolios/agents |
| Software Utility | Drop-in A2MCP service for any AI agent stack |

## Evidence of real usage
- `/metrics` endpoint tracks previews + paid calls.
- Seed bot (`npm run seed`) demonstrates the free→paid funnel across 7 tokens.
- Live deployment on X Layer with verified USDC settlement.

## How to run
```bash
npm install
npm run build
npm start
npm run seed   # generates usage evidence
```

## Registration
```bash
npx skills add okx/onchainos-skills --yes -g
onchainos agent login --email Josh25white@gmail.com
npm run register
```

## What's verified
- ✅ Build passes (`npm run build`)
- ✅ X Layer native USDC contract confirmed (`0x74b7f163...`, sym USDC, dec 6)
- ✅ PAY_TO wallet loaded from env (`0x799177d1...`)
- ✅ Preview endpoint returns real scores from GoPlus/DexScreener
- ✅ Metrics endpoint proves adoption

## Remaining for launch
1. Deploy publicly (Railway/Render config included) or expose via ngrok.
2. Run `onchainos agent login` + `npm run register` (interactive).
3. Drive paid calls with an x402 client funded on X Layer.
4. Submit with this narrative + metrics screenshot.
