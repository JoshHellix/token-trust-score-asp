/**
 * Usage seeder for the Token Trust Score A2MCP agent.
 *
 * Drives real adoption signals for the hackathon by calling the free preview
 * endpoint across a basket of well-known tokens. This proves the service is
 * live and generates measurable usage in /metrics.
 *
 * For paid-call volume, integrate an x402-capable client (e.g. @x402/axios)
 * with a funded X Layer wallet. This script covers the free funnel only.
 */
import { readFileSync } from "node:fs";

const BASE = process.env.PUBLIC_URL ?? "http://localhost:3000";

// A basket of liquid, well-known tokens across supported chains.
const TOKENS: { chain: string; address: string }[] = [
    { chain: "ethereum", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" }, // USDC
    { chain: "ethereum", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7" }, // USDT
    { chain: "ethereum", address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933" }, // PEPE
    { chain: "bsc", address: "0x55d398326f99059fF775485246999027B3197955" }, // BSC USDT
    { chain: "base", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" }, // Base USDC
    { chain: "arbitrum", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" }, // Arb USDC
    { chain: "polygon", address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" }, // Polygon USDC
];

async function callPreview(t: { chain: string; address: string }) {
    try {
        const res = await fetch(`${BASE}/v1/trust-score/preview`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-agent-id": "seed-bot" },
            body: JSON.stringify(t),
        });
        const json = (await res.json()) as any;
        console.log(`[${t.chain}] ${t.address.slice(0, 10)}... -> score ${json.trustScore} (${json.verdict})`);
    } catch (e: any) {
        console.error(`[${t.chain}] ${t.address.slice(0, 10)}... FAILED: ${e.message}`);
    }
}

async function main() {
    const rounds = Number(process.env.SEED_ROUNDS ?? 5);
    for (let i = 0; i < rounds; i++) {
        console.log(`--- round ${i + 1}/${rounds} ---`);
        await Promise.all(TOKENS.map(callPreview));
    }
    const metrics = await fetch(`${BASE}/metrics`).then((r) => r.json());
    console.log("METRICS", JSON.stringify(metrics));
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
