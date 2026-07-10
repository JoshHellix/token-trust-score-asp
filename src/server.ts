/**
 * Token Trust Score — A2MCP server for OKX.AI.
 *
 * Exposes a single pay-per-call endpoint protected by the x402 payment
 * standard (HTTP 402 + facilitator verify/settle), the same standard OKX
 * Onchain OS uses for A2MCP services. Each call is independently paid in
 * USDC on X Layer, giving judges clear, automatic "real usage" evidence.
 */
import express from "express";
import { config as loadEnv } from "dotenv";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { gatherSignals } from "./onchainData.js";
import { computeTrustScore } from "./trustScore.js";

loadEnv();

const PORT = Number(process.env.PORT ?? 3000);
const PAY_TO = process.env.PAY_TO_ADDRESS ?? "0x0000000000000000000000000000000000000000";
const PRICE_USD = process.env.PRICE_USD ?? "0.01"; // $0.01 per call
const PUBLIC_URL = process.env.PUBLIC_URL ?? `http://localhost:${PORT}`;

// X Layer mainnet = EVM chain id 196 -> CAIP-2 network id.
const XLAYER_NETWORK = "eip155:196";
// Settlement asset: native USDC on X Layer (verified from X Layer docs).
// https://www.okx.com/web3/developer/xlayer — mainnet address 0x74b7f16337b8972027f6196a17a631ac6de26d22
const USDC_XLAYER = "0x74b7f16337b8972027f6196a17a631ac6de26d22";
const FACILITATOR = process.env.X402_FACILITATOR ?? "https://facilitator.x402.org";

// Usage metrics — proves real adoption for the hackathon.
const usage = { previews: 0, paidCalls: 0, lastCaller: "" as string };

const app = express();
app.use(express.json());

// Free discovery endpoints (no payment) so the marketplace can index us.
app.get("/.well-known/agent.json", (_req, res) => res.json(agentCard()));
app.get("/health", (_req, res) => res.json({ ok: true, service: "token-trust-score" }));

// Build the x402 resource server: facilitator + EVM "exact" scheme.
const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR });
const resourceServer = new x402ResourceServer(facilitatorClient).register(
    XLAYER_NETWORK,
    new ExactEvmScheme()
);

// Require payment for the scoring endpoint.
// Setting the last argument to false avoids an immediate facilitator sync on startup,
// which makes local development more robust when the network facilitator is temporarily unreachable.
app.use(
    paymentMiddleware(
        {
            "POST /v1/trust-score": {
                accepts: {
                    scheme: "exact",
                    price: { asset: USDC_XLAYER, amount: (Number(PRICE_USD) * 1e6).toString() },
                    network: XLAYER_NETWORK,
                    payTo: PAY_TO,
                    maxTimeoutSeconds: 60,
                },
                description: "Token Trust Score — composite on-chain risk assessment",
            },
        },
        resourceServer,
        undefined,
        undefined,
        false
    )
);

app.post("/v1/trust-score", async (req, res) => {
    const { chain = "ethereum", address } = req.body ?? {};
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res
            .status(400)
            .json({ error: "Invalid or missing 'address' (expected 0x... 20 bytes)." });
    }
    try {
        const raw = await gatherSignals(chain, address);
        const result = computeTrustScore({ chain, address, ...raw });
        usage.paidCalls += 1;
        usage.lastCaller = req.header("x-agent-id") ?? req.ip ?? "unknown";
        return res.json(result);
    } catch (e: any) {
        return res.status(502).json({ error: e?.message ?? "Signal gathering failed." });
    }
});

app.post("/v1/trust-score/preview", async (req, res) => {
    const { chain = "ethereum", address } = req.body ?? {};
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res
            .status(400)
            .json({ error: "Invalid or missing 'address' (expected 0x... 20 bytes)." });
    }

    try {
        const raw = await gatherSignals(chain, address);
        const result = computeTrustScore({ chain, address, ...raw });
        usage.previews += 1;
        return res.json({
            chain,
            address,
            trustScore: result.trustScore,
            verdict: result.verdict,
            summary: result.summary,
            signalCount: result.signals.length,
            upgrade: {
                endpoint: "/v1/trust-score",
                price: `${PRICE_USD} USDC`,
                paymentStandard: "x402",
                note: "Paid analysis returns the full evidence + detailed multi-signal breakdown.",
            },
        });
    } catch (e: any) {
        return res.status(502).json({ error: e?.message ?? "Preview generation failed." });
    }
});

app.get("/metrics", (_req, res) => {
    res.json({
        previews: usage.previews,
        paidCalls: usage.paidCalls,
        lastCaller: usage.lastCaller,
        payTo: PAY_TO,
        priceUsd: PRICE_USD,
        network: XLAYER_NETWORK,
    });
});

function agentCard() {
    return {
        schema: "okx-a2mcp/v1",
        name: "Token Trust Score",
        description:
            "Composite 0-100 on-chain trust score with structured BLOCK/SKIP/WATCH/PASS verdict and evidence. " +
            "Differentiated from single-label scanners by multi-signal scoring other agents embed per-token.",
        version: "0.1.0",
        endpoints: [
            {
                method: "POST",
                path: "/v1/trust-score/preview",
                contentType: "application/json",
                price: { amount: "0", asset: "USDC", chain: "xlayer", scheme: "free" },
                params: { chain: "string (ethereum|bsc|base|arbitrum|polygon|xlayer)", address: "string (0x...)" },
                returns: "Preview result { trustScore, verdict, summary, signalCount, upgrade }",
            },
            {
                method: "POST",
                path: "/v1/trust-score",
                contentType: "application/json",
                price: { amount: PRICE_USD, asset: "USDC", chain: "xlayer", scheme: "x402" },
                params: { chain: "string (ethereum|bsc|base|arbitrum|polygon|xlayer)", address: "string (0x...)" },
                returns: "TrustScoreResult { trustScore, verdict, signals[], summary, evidence }",
            },
        ],
        payment: { standard: "x402", facilitator: FACILITATOR, network: XLAYER_NETWORK },
        resource: { url: `${PUBLIC_URL}/v1/trust-score`, description: "Pay-per-call token trust score service", mimeType: "application/json" },
    };
}

app.listen(PORT, () => {
    console.log(`[token-trust-score] A2MCP listening on :${PORT} @ $${PRICE_USD}/call on ${XLAYER_NETWORK}`);
});
