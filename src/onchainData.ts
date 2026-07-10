/**
 * Public on-chain data gathering for the Trust Score engine.
 *
 * Signal sources (all free, no API key required for the base path):
 *  - GoPlus Labs token security API: taxes, honeypot, source verification,
 *    top-holder concentration, CEX/DEX listing.
 *  - DexScreener API: on-chain liquidity depth (where supported).
 *  - Neutral fallback: when both indexers are unavailable, the endpoint stays up.
 *
 * Designed to degrade gracefully: if a signal can't be fetched, it returns a
 * neutral value rather than failing the whole call (keeps the A2MCP endpoint
 * reliable = more usage).
 */
import { ethers } from "ethers";

const RPCS: Record<string, string> = {
    ethereum: "https://eth.llamarpc.com",
    bsc: "https://bsc-dataseed.bnbchain.org",
    base: "https://mainnet.base.org",
    arbitrum: "https://arb1.arbitrum.io/rpc",
    polygon: "https://polygon-rpc.com",
    xlayer: "https://rpc.xlayer.tech",
};

// GoPlus Labs chain ids (https://api.gopluslabs.io/api/v1/supported_chains).
const GOPLUS_CHAIN: Record<string, string> = {
    ethereum: "1",
    bsc: "56",
    base: "8453",
    arbitrum: "42161",
    polygon: "137",
    xlayer: "196",
};

// DexScreener chain slugs (only chains DexScreener indexes are mapped).
const DEXSCREENER_CHAIN: Record<string, string> = {
    ethereum: "ethereum",
    bsc: "bsc",
    base: "base",
    arbitrum: "arbitrum",
    polygon: "polygon",
};

export interface RawSignals {
    holderConcentration: number;
    top10Share: number;
    liquidityLockedRatio: number;
    buyTax: number;
    sellTax: number;
    priceImpact1pct: number;
    contractVerified: boolean;
    honeypotRisk: number;
    holderCount: number;
    liquidityUsd: number;
    source: string;
}

export async function gatherSignals(
    chain: string,
    address: string
): Promise<RawSignals> {
    if (!ethers.isAddress(address)) {
        throw new Error(`Invalid token address: ${address}`);
    }
    if (!RPCS[chain]) {
        throw new Error(`Unsupported chain: ${chain}. Supported: ${Object.keys(RPCS).join(", ")}`);
    }

    const [goplus, dex] = await Promise.all([
        fetchGoPlus(chain, address),
        fetchDexScreener(chain, address),
    ]);

    if (!goplus && !dex) {
        // Both indexers failed: return neutral signals so the endpoint stays up.
        return {
            holderConcentration: 0.5,
            top10Share: 0.5,
            liquidityLockedRatio: 0.5,
            buyTax: 0,
            sellTax: 0,
            priceImpact1pct: 0.5,
            contractVerified: false,
            honeypotRisk: 0.1,
            holderCount: 0,
            liquidityUsd: 0,
            source: "fallback",
        };
    }

    const top10Share = goplus?.top10Share ?? 0.5;
    const holderConcentration = clamp01(1 - top10Share);
    const liquidityUsd = dex?.liquidityUsd ?? 0;
    const priceImpact1pct = liquidityScore(liquidityUsd);
    const liquidityLockedRatio = liquidityLockScore({
        inDex: goplus?.isInDex ?? false,
        inCex: goplus?.isInCex ?? false,
        liquidityUsd,
    });

    return {
        holderConcentration,
        top10Share,
        liquidityLockedRatio,
        buyTax: goplus?.buyTax ?? 0,
        sellTax: goplus?.sellTax ?? 0,
        priceImpact1pct,
        contractVerified: goplus?.isOpenSource ?? false,
        honeypotRisk: goplus?.isHoneypot ? 1 : 0.05,
        holderCount: goplus?.holderCount ?? 0,
        liquidityUsd,
        source: [goplus ? "goplus" : null, dex ? "dexscreener" : null]
            .filter(Boolean)
            .join("+") || "fallback",
    };
}

interface GoPlusResult {
    isOpenSource: boolean;
    buyTax: number;
    sellTax: number;
    isHoneypot: boolean;
    isInDex: boolean;
    isInCex: boolean;
    holderCount: number;
    top10Share: number;
}

async function fetchGoPlus(chain: string, address: string): Promise<GoPlusResult | null> {
    const gid = GOPLUS_CHAIN[chain];
    if (!gid) return null;
    try {
        const url = `https://api.gopluslabs.io/api/v1/token_security/${gid}?contract_addresses=${address}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const json = (await res.json()) as { result?: Record<string, any> };
        const t = json.result?.[address.toLowerCase()];
        if (!t) return null;
        const holders: any[] = Array.isArray(t.holders) ? t.holders : [];
        const top10Share = clamp01(
            holders.slice(0, 10).reduce((acc, h) => acc + (Number(h.percent) || 0), 0)
        );
        return {
            isOpenSource: String(t.is_open_source) === "1",
            buyTax: pctToFraction(t.buy_tax),
            sellTax: pctToFraction(t.sell_tax),
            isHoneypot: String(t.is_honeypot) === "1",
            isInDex: String(t.is_in_dex) === "1",
            isInCex: String(t.is_in_cex) === "1",
            holderCount: Number(t.holder_count) || 0,
            top10Share,
        };
    } catch {
        return null;
    }
}

interface DexResult {
    liquidityUsd: number;
}

async function fetchDexScreener(chain: string, address: string): Promise<DexResult | null> {
    const slug = DEXSCREENER_CHAIN[chain];
    if (!slug) return null;
    try {
        const url = `https://api.dexscreener.com/token-pairs/v1/${slug}/${address}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const pairs = (await res.json()) as any[];
        if (!Array.isArray(pairs) || pairs.length === 0) return null;
        const best = pairs.reduce(
            (max, p) => ((p?.liquidity?.usd || 0) > (max?.liquidity?.usd || 0) ? p : max),
            pairs[0]
        );
        return { liquidityUsd: Number(best?.liquidity?.usd) || 0 };
    } catch {
        return null;
    }
}

function pctToFraction(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? clamp01(n / 100) : 0;
}

function liquidityScore(usd: number): number {
    if (!usd || usd <= 0) return 0.3;
    // $5M+ liquidity => near-max tradeability; floor 0.3 when unknown.
    return clamp01(0.3 + (usd / 5_000_000) * 0.7);
}

function liquidityLockScore(s: { inDex: boolean; inCex: boolean; liquidityUsd: number }): number {
    let score = 0.4;
    if (s.inDex) score += 0.2;
    if (s.inCex) score += 0.2;
    if (s.liquidityUsd > 1_000_000) score += 0.2;
    return clamp01(score);
}

function clamp01(n: number): number {
    if (!Number.isFinite(n)) return 0.5;
    return Math.max(0, Math.min(1, n));
}
