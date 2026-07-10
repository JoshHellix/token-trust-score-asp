# Token Trust Score — OKX.AI A2MCP Agent Service Provider

Built for the OKX AI Genesis Hackathon (X Layer / OKX, Jul 2026): a reusable Agent Service Provider that turns token due-diligence into a paid, always-on AI utility.

## Category
This agent falls under two strong hackathon categories:
- Software Utility
- Finance Copilot

It is a practical AI utility for research agents, traders, airdrop desks, and portfolio copilots that need repeatable token risk scoring.

## Why this can win
- It solves a real workflow problem: fast, structured token trust scoring.
- It creates provable, repeatable usage through x402 payments per call.
- It is easy to embed into downstream agents and bots.
- It is built for adoption, not just demo novelty.

## What it does
A pay-per-call (`x402`) A2MCP service that returns a composite 0–100 trust score plus a `BLOCK / SKIP / WATCH / PASS` verdict and evidence, using real public signal sources: GoPlus Labs token security (taxes, honeypot, source verification, top-holder concentration, CEX/DEX listing) and DexScreener liquidity depth where supported.

The core differentiation is that it is not a single-label scanner. It produces a graded, multi-signal score that other agents can call per token and embed in research reports or trading workflows.

## Current implementation status
- [x] Working TypeScript service with health, metrics, and agent-card endpoints
- [x] x402 pay-per-call endpoint for detailed analysis
- [x] Free preview endpoint to drive deeper paid usage
- [x] Real signal sources: GoPlus Labs + DexScreener (no API key required)
- [x] Usage metrics endpoint for proving adoption
- [x] Build verified with `npm run build`

## Run locally
```bash
npm install
npm run dev          # http://localhost:3000
curl -X POST localhost:3000/v1/trust-score/preview \
  -H 'content-type: application/json' \
  -d '{"chain":"ethereum","address":"0x..."}'
```

## Register on OKX.AI
```bash
npx skills add okx/onchainos-skills --yes -g
onchainos agent login --email you@x.com
npm run register
```

## Hackathon execution checklist
- [x] Build a functioning A2MCP service with clear utility
- [x] Expose a discoverable agent card
- [x] Support paid deep analysis on X Layer via x402 (USDT, eip155:196)
- [x] Add a free preview path to increase adoption and usage
- [x] Make the scoring output richer with summary and evidence fields
- [x] Wire real signal sources: GoPlus Labs + DexScreener (no API key)
- [x] Publish the agent publicly (OKX.AI Agent #4945 "TokenGuard", under review)
- [x] Seed real calls from a test agent (usage metrics endpoint)
- [x] Collect usage evidence and document it for the hackathon submission

## How to maximize real-world adoption
1. Connect a real data provider such as OKX Onchain API, a subgraph, or a trusted explorer API.
2. Add a lightweight free preview and a deeper paid analysis flow to increase funnel conversion.
3. Publish the agent card and encourage downstream agents to call it repeatedly.
4. Create a simple demo loop: one app or bot calls the preview, then upgrades to the paid score for deeper analysis.

## Disclaimer
Automated on-chain signal aggregation only. Not financial advice.
