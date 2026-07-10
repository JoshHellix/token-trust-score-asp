/**
 * Token Trust Score engine.
 *
 * Differentiator vs existing CA X-Ray: instead of a single initial risk label,
 * we compute a composite 0-100 trust score from multiple public on-chain
 * signals and emit structured, evidence-backed verdicts that downstream
 * research / airdrop / trading agents can call per-token and embed in reports.
 *
 * All inputs are public, read-only on-chain data. No private keys, no trades.
 */

export type Verdict = "PASS" | "WATCH" | "SKIP" | "BLOCK";

export interface TrustSignal {
    name: string;
    weight: number; // contribution to 100
    score: number; // 0..1
    detail: string;
}

export interface TrustScoreResult {
    chain: string;
    address: string;
    trustScore: number; // 0..100
    verdict: Verdict;
    signals: TrustSignal[];
    summary: string;
    evidence: string[];
    dataSources: string[];
    generatedAt: string;
    disclaimer: string;
}

const DISCLAIMER =
    "Automated on-chain signal aggregation only. Not financial advice. " +
    "Scores reflect public data at call time and may change. Verify independently.";

/**
 * Pure scoring function. Kept separate from I/O so it is trivially testable
 * and can be reused by an A2A variant later.
 */
export function computeTrustScore(input: {
    chain: string;
    address: string;
    // Normalized 0..1 signals gathered by the data layer.
    holderConcentration: number; // 1 = perfectly distributed, 0 = one wallet owns all
    top10Share: number; // 1 = top10 hold everything
    liquidityLockedRatio: number; // 1 = fully locked
    buyTax: number; // fraction, e.g. 0.05 = 5%
    sellTax: number;
    priceImpact1pct: number; // 1 = negligible slippage, 0 = huge
    contractVerified: boolean;
    honeypotRisk: number; // 0 = safe, 1 = likely honeypot
    holderCount?: number;
    liquidityUsd?: number;
    source?: string;
}): TrustScoreResult {
    const signals: TrustSignal[] = [
        {
            name: "Holder distribution",
            weight: 22,
            score: input.holderConcentration,
            detail: `Top-10 wallets hold ${(input.top10Share * 100).toFixed(1)}% of supply; ${input.holderCount ?? 0} holders tracked.`,
        },
        {
            name: "Liquidity lock",
            weight: 20,
            score: input.liquidityLockedRatio,
            detail: `Liquidity lock ratio ${(input.liquidityLockedRatio * 100).toFixed(0)}%; $${Math.round(input.liquidityUsd ?? 0).toLocaleString()} on-chain liquidity.`,
        },
        {
            name: "Tax fairness",
            weight: 16,
            score: clamp01(1 - (input.buyTax + input.sellTax) / 0.3),
            detail: `Buy tax ${(input.buyTax * 100).toFixed(1)}%, sell tax ${(input.sellTax * 100).toFixed(1)}%.`,
        },
        {
            name: "Tradeability (slippage)",
            weight: 16,
            score: input.priceImpact1pct,
            detail: `1% order price impact ${(input.priceImpact1pct * 100).toFixed(0)}% (higher = deeper book).`,
        },
        {
            name: "Contract transparency",
            weight: 14,
            score: input.contractVerified ? 1 : 0,
            detail: input.contractVerified ? "Source verified on explorer." : "Source not verified.",
        },
        {
            name: "Honeypot / sell-block risk",
            weight: 12,
            score: clamp01(1 - input.honeypotRisk),
            detail: `Honeypot risk index ${(input.honeypotRisk * 100).toFixed(0)}%.`,
        },
    ];

    const trustScore = Math.round(
        signals.reduce((acc, s) => acc + s.weight * s.score, 0)
    );

    const verdict: Verdict =
        input.honeypotRisk > 0.6 || input.sellTax > 0.4
            ? "BLOCK"
            : trustScore >= 75
                ? "PASS"
                : trustScore >= 50
                    ? "WATCH"
                    : "SKIP";

    const positiveSignals = signals.filter((signal) => signal.score >= 0.7).length;
    const summary =
        verdict === "BLOCK"
            ? "High-risk profile with material concerns; treat as unsafe until reviewed manually."
            : verdict === "PASS"
                ? `Strong profile with ${positiveSignals}/${signals.length} signals above a healthy threshold.`
                : `Mixed profile that needs a closer look before use or investment.`;

    const evidence = signals.map((signal) => `${signal.name}: ${signal.detail}`);

    return {
        chain: input.chain,
        address: input.address,
        trustScore,
        verdict,
        signals,
        summary,
        evidence,
        dataSources: sourceLabels(input.source),
        generatedAt: new Date().toISOString(),
        disclaimer: DISCLAIMER,
    };
}

function clamp01(n: number): number {
    return Math.max(0, Math.min(1, n));
}

// Map the internal source key to human-readable provider names for evidence.
function sourceLabels(source?: string): string[] {
    if (!source) return [];
    const map: Record<string, string> = {
        goplus: "GoPlus Labs token security",
        dexscreener: "DexScreener liquidity depth",
        fallback: "Neutral fallback (indexers unavailable)",
    };
    return source
        .split("+")
        .map((k) => map[k] ?? k)
        .filter(Boolean);
}
