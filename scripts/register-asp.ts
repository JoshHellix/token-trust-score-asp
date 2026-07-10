/**
 * Registration helper for the OKX.AI A2MCP ASP.
 *
 * The documented onboarding flow uses the Onchain OS CLI (installed via
 * `npx skills add okx/onchainos-skills --yes -g`). This script shells out to
 * that CLI so registration is reproducible and version-controlled.
 *
 * Prereqs (run once, interactively):
 *   1. npx skills add okx/onchainos-skills --yes -g
 *   2. Log in to Agentic Wallet:  onchainos agent login --email Josh25white@gmail.com
 *
 * Then:  npm run register
 *
 * NOTE: PAY_TO_ADDRESS in .env must be the 0x... EVM form of your X Layer
 * Agentic Wallet, NOT the XKO... branded format. x402 cannot use XKO prefixes.
 * Verified X Layer native USDC: 0x74b7f16337b8972027f6196a17a631ac6de26d22
 */
import { execSync } from "node:child_process";

const SERVICE_NAME = "Token Trust Score";
const SERVICE_DESC =
    "Pay-per-call composite on-chain trust score (0-100) with BLOCK/SKIP/WATCH verdict and evidence. " +
    "Differentiated from single-label scanners by multi-signal scoring other agents embed per-token.";
const PUBLIC_URL = process.env.PUBLIC_URL ?? "http://localhost:3000";

function run(cmd: string) {
    console.log(`$ ${cmd}`);
    execSync(cmd, { stdio: "inherit" });
}

// Register as A2MCP ASP. The CLI reads service metadata from the agent card.
run(
    `onchainos agent register-a2mcp ` +
    `--name "${SERVICE_NAME}" ` +
    `--description "${SERVICE_DESC}" ` +
    `--endpoint "${PUBLIC_URL}/v1/trust-score" ` +
    `--agent-card "${PUBLIC_URL}/.well-known/agent.json" ` +
    `--price-usdc 0.01`
);

// Submit for marketplace listing (24h review per docs).
run(`onchainos agent list-asp --public`);
