import { canCancelRun, canCreateRun, canListRuns, canViewAudit } from '@ai-parallel-web/auth';
import {
  createRun,
  createPersonaVersion,
  deletePersonaVersion,
  ensureLiveAuditConfiguration,
  findIdempotencyRecord,
  findJourneyVersionById,
  findPersonaVersionsByIds,
  findRunById,
  findSurfaceById,
  findUserByToken,
  hashRequestBody,
  insertAuditEvent,
  listAuditEvents,
  listJourneyVersions,
  listPersonaVersions,
  listRuns,
  listSurfaces,
  saveIdempotencyRecord,
  transitionRunStatus,
} from '@ai-parallel-web/db';
import type { FastifyInstance } from 'fastify';
import { chromium, type Browser } from 'playwright';
import * as crypto from 'node:crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';

import { buildProblem, parseBearerToken, requireRole, toAuthenticatedUser } from '../auth.js';
import type { ApiConfig } from '../config.js';
import type { AppDependencies } from '../dependencies.js';

interface CreateRunBody {
  journeyVersionId?: string | undefined;
  personaVersionIds: string[];
  surfaceId?: string | undefined;
  customSurfaceUrl?: string | undefined;
  customSurfaceName?: string | undefined;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validateCreateRunBody(body: unknown): CreateRunBody | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const record = body as Record<string, unknown>;
  if (!Array.isArray(record.personaVersionIds)) {
    return null;
  }
  const personaVersionIds = record.personaVersionIds.filter(
    (value): value is string => typeof value === 'string',
  );
  if (
    personaVersionIds.length < 2 ||
    personaVersionIds.length !== record.personaVersionIds.length ||
    new Set(personaVersionIds).size !== personaVersionIds.length
  ) {
    return null;
  }
  const customSurfaceUrl =
    typeof record.customSurfaceUrl === 'string' && record.customSurfaceUrl.startsWith('http')
      ? record.customSurfaceUrl
      : undefined;
  const customSurfaceName =
    typeof record.customSurfaceName === 'string' ? record.customSurfaceName : undefined;

  const hasStoredConfiguration =
    typeof record.journeyVersionId === 'string' &&
    isUuid(record.journeyVersionId) &&
    typeof record.surfaceId === 'string' &&
    isUuid(record.surfaceId);
  if (!customSurfaceUrl && !hasStoredConfiguration) return null;

  const result: CreateRunBody = {
    customSurfaceName,
    customSurfaceUrl,
    personaVersionIds,
  };
  if (hasStoredConfiguration) {
    result.journeyVersionId = record.journeyVersionId as string;
    result.surfaceId = record.surfaceId as string;
  }
  return result;
}

function publicRun(run: {
  createdAt: string;
  id: string;
  status: string;
  surfaceId?: string | undefined;
  journeyVersionId?: string | undefined;
  personaVersionIds?: string[] | undefined;
  targetUrl?: string | undefined;
}): {
  id: string;
  status: string;
  createdAt: string;
  surfaceId?: string | undefined;
  journeyVersionId?: string | undefined;
  personaVersionIds?: string[] | undefined;
  targetUrl?: string | undefined;
} {
  const result: {
    id: string;
    status: string;
    createdAt: string;
    surfaceId?: string;
    journeyVersionId?: string;
    personaVersionIds?: string[];
    targetUrl?: string;
  } = {
    createdAt: run.createdAt,
    id: run.id,
    status: run.status,
  };
  if (run.journeyVersionId !== undefined) {
    result.journeyVersionId = run.journeyVersionId;
  }
  if (run.personaVersionIds !== undefined) {
    result.personaVersionIds = run.personaVersionIds;
  }
  if (run.surfaceId !== undefined) {
    result.surfaceId = run.surfaceId;
  }
  if (run.targetUrl !== undefined) {
    result.targetUrl = run.targetUrl;
  }
  return result;
}

interface PersonaCaptureResult {
  detectedCurrency?: string | undefined;
  detectedPrice?: string | undefined;
  durationMs: number;
  elementCount: number;
  finalUrl: string;
  httpOutcome: { ok: boolean; redirectChain: string[]; statusCode: number };
  id: string;
  locale: string;
  name: string;
  screenshot: string;
  textSnippet: string;
  timezoneId: string;
  title: string;
  viewport: { height: number; width: number };
}

interface PairwiseComparison {
  durationDeltaMs: number;
  domSimilarity: number;
  personaA: string;
  personaB: string;
  textSimilarity: number;
  titleMatch: boolean;
}

interface AiPricingAnalysis {
  status: 'detected_divergence' | 'identical_pricing' | 'prices_hidden_or_gated' | 'not_applicable';
  summary: string;
  reasons: string[];
  observedPrices?: Record<string, string>;
}

interface AiInsights {
  headline: string;
  keyDifferences: string[];
  notableItems: string[];
  noMeaningfulDifferences: boolean;
  confidence: 'high' | 'medium' | 'low';
  non_reproducible: true;
  pricingAnalysis?: AiPricingAnalysis | undefined;
}

type AiInsightsStatus = 'available' | 'not_configured' | 'failed';

interface RealComparisonData {
  comparisonId: string;
  runId: string;
  metricVersion: string;
  comparedPersonas: string[];
  timestampUtc: string;
  metrics: Array<{
    metricName: string;
    metricVersion: string;
    result: number | boolean | string;
    explanation: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    warnings: string[];
  }>;
  overallObservation: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  warnings: string[];
  screenshots?: {
    personaA?: string;
    personaB?: string;
    personaAName?: string;
    personaBName?: string;
  };
  domSummary?: {
    personaATitle?: string;
    personaBTitle?: string;
    personaATextSnippet?: string;
    personaBTextSnippet?: string;
    personaAElementCount?: number;
    personaBElementCount?: number;
  };
  personaResults?: PersonaCaptureResult[];
  pairwiseComparisons?: PairwiseComparison[];
  aiInsights?: AiInsights | null;
  aiInsightsStatus?: AiInsightsStatus;
  aiInsightsMessage?: string;
}

// ---------------------------------------------------------------------------
// Scheduled Jobs
// ---------------------------------------------------------------------------

interface ScheduledJob {
  createdBy: string;
  id: string;
  name: string;
  targetUrl: string;
  tenantId: string;
  personaIds: string[];
  surfaceId: string;
  journeyVersionId: string;
  intervalMinutes: number;
  intervalLabel: string;
  enabled: boolean;
  createdAt: string;
  lastRunAt: string | null;
  lastRunId: string | null;
  nextRunAt: string;
  runCount: number;
}

const scheduledJobsStore = new Map<string, ScheduledJob>();

function nextRunDate(intervalMinutes: number): string {
  return new Date(Date.now() + intervalMinutes * 60 * 1000).toISOString();
}

function intervalLabel(minutes: number): string {
  if (minutes < 60) return `Every ${minutes} minutes`;
  if (minutes === 60) return 'Every hour';
  if (minutes < 1440) return `Every ${minutes / 60} hours`;
  return `Every ${minutes / 1440} day(s)`;
}

const runComparisonsStore = new Map<string, RealComparisonData>();
const runReplaysStore = new Map<string, unknown>();

// ---------------------------------------------------------------------------
// Gemini AI Visual Insights & Pricing Diagnostics
// ---------------------------------------------------------------------------

async function generateAiInsights(
  personas: Array<{ name: string; screenshot: string; textSnippet: string }>,
): Promise<{ insights: AiInsights | null; message?: string; status: AiInsightsStatus }> {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) {
    return {
      insights: null,
      message: 'GEMINI_API_KEY is not configured in the API process.',
      status: 'not_configured',
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env['GEMINI_MODEL'] || 'gemini-2.0-flash';
    const model = genAI.getGenerativeModel({ model: modelName });

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    parts.push({
      text: `You are an expert web intelligence analyst examining screenshots and DOM extracts from ${personas.length} isolated browser sessions that loaded the same target URL under different regional/device personas.

Analyze both the visual layout and pricing intelligence with scientific precision. Specifically examine:
1. Are prices visible on screen? What currency and numeric values are shown?
2. If prices differ across personas, why? (e.g. Regional purchasing power parity, localized currency adjustment, regional discount/promotions).
3. If prices are identical across personas, explain why (e.g. Unified global USD billing, flat-rate SaaS pricing tier).
4. If prices are NOT visible on screen, explain the reason why (e.g. Page requires user login/authentication to view checkout, cookie consent modal or age gate obscured the screen, non-product informational article, or request-a-quote enterprise model).

Respond ONLY with valid JSON in this exact shape:
{
  "headline": "<one-sentence overall summary>",
  "keyDifferences": ["<concrete visual/text difference 1>", "<difference 2>"],
  "notableItems": ["<positive/neutral observation 1>"],
  "noMeaningfulDifferences": false,
  "confidence": "high" | "medium" | "low",
  "pricingAnalysis": {
    "status": "detected_divergence" | "identical_pricing" | "prices_hidden_or_gated" | "not_applicable",
    "summary": "<one to two sentences explaining why prices differ, why they are identical, or why no price was visible on screen>",
    "reasons": [
      "<specific diagnostic reason 1>",
      "<specific diagnostic reason 2>"
    ],
    "observedPrices": {
      "<personaName>": "<exact price with currency e.g. '$59.99' or 'R$ 199,90' or 'Not visible / Gated'>"
    }
  }
}

Rules:
- pricingAnalysis.status must be one of:
  - "detected_divergence": when prices, discounts, or currencies differ across regions
  - "identical_pricing": when prices and currencies match across regions
  - "prices_hidden_or_gated": when the page is a commercial/pricing target but no price is visible (e.g., auth wall, age gate, consent popup overlay, cart not rendered)
  - "not_applicable": when the target is purely non-commercial (error 404 page, documentation, search home)
- Use objective, non-causal language ("observed", "detected", "rendered as")
- Be concise, factual, and specific. Do not speculate.

Persona screenshots and text snippets follow:`,
    });

    for (const persona of personas) {
      parts.push({
        text: `\n--- Persona: ${persona.name} ---\nText snippet (first 2000 chars):\n${persona.textSnippet.slice(0, 2000)}`,
      });
      if (persona.screenshot && persona.screenshot.startsWith('data:image/png;base64,')) {
        const base64Data = persona.screenshot.replace('data:image/png;base64,', '');
        parts.push({ inlineData: { mimeType: 'image/png', data: base64Data } });
      }
    }

    const result = await model.generateContent(parts);
    const text = result.response.text().trim();

    // Strip markdown code fences if present
    const jsonStr = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const parsed = JSON.parse(jsonStr) as Omit<AiInsights, 'non_reproducible'>;

    const pricingAnalysis: AiPricingAnalysis | undefined = parsed.pricingAnalysis
      ? {
          observedPrices: parsed.pricingAnalysis.observedPrices ?? {},
          reasons: Array.isArray(parsed.pricingAnalysis.reasons)
            ? parsed.pricingAnalysis.reasons
            : [],
          status: parsed.pricingAnalysis.status || 'not_applicable',
          summary:
            parsed.pricingAnalysis.summary ||
            'Pricing analysis computed under recorded conditions.',
        }
      : undefined;

    return {
      insights: {
        confidence: parsed.confidence || 'medium',
        headline: parsed.headline || 'Analysis complete.',
        keyDifferences: Array.isArray(parsed.keyDifferences) ? parsed.keyDifferences : [],
        noMeaningfulDifferences: parsed.noMeaningfulDifferences ?? false,
        non_reproducible: true,
        notableItems: Array.isArray(parsed.notableItems) ? parsed.notableItems : [],
        pricingAnalysis,
      },
      status: 'available',
    };
  } catch (err) {
    console.warn('[AI Insights] Skipped — Gemini call failed:', (err as Error).message);
    return {
      insights: null,
      message:
        'Gemini is configured, but visual analysis failed for this run. Check the API log for details.',
      status: 'failed',
    };
  }
}

function resolvePersonaTargetUrl(baseUrl: string, locale: string): string {
  const parts = locale.split('-');
  const lang = parts[0]?.toLowerCase() || 'en';
  const country = (parts[1] || parts[0] || 'us').toLowerCase();

  try {
    const url = new URL(baseUrl);

    // 1. Spotify Market Storefront Auto-Routing
    if (url.hostname.includes('spotify.com')) {
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0 && pathParts[0]!.length === 2) {
        pathParts[0] = country;
        url.pathname = '/' + pathParts.join('/');
      } else {
        const remaining = url.pathname.startsWith('/') ? url.pathname : `/${url.pathname}`;
        url.pathname = `/${country}${remaining}`;
      }
      return url.toString();
    }

    // 2. Steam Store Multi-Currency & Language Injection
    if (url.hostname.includes('steampowered.com')) {
      url.searchParams.set('cc', country);
      const steamLangMap: Record<string, string> = {
        ar: 'arabic',
        de: 'german',
        es: 'spanish',
        fr: 'french',
        it: 'italian',
        ja: 'japanese',
        ko: 'koreana',
        pl: 'polish',
        pt: 'brazilian',
        ru: 'russian',
        tr: 'turkish',
        zh: 'schinese',
      };
      url.searchParams.set('l', steamLangMap[lang] || 'english');
      return url.toString();
    }

    // 3. Apple Store Regional Selector
    if (url.hostname.includes('apple.com')) {
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0 && pathParts[0]!.length === 2) {
        if (country === 'us') {
          pathParts.shift();
        } else {
          pathParts[0] = country;
        }
        url.pathname = '/' + pathParts.join('/');
      } else if (country !== 'us') {
        url.pathname = `/${country}` + url.pathname;
      }
      return url.toString();
    }

    // 4. IKEA Regional Storefront
    if (url.hostname.includes('ikea.com')) {
      url.pathname = `/${country}/${lang}` + url.pathname.replace(/^\/[a-z]{2}\/[a-z]{2}/, '');
      return url.toString();
    }

    return baseUrl;
  } catch {
    return baseUrl;
  }
}

async function executeRealPlaywrightRun(
  runId: string,
  targetUrl: string,
  personas: Array<{
    id: string;
    name: string;
    userAgent: string;
    viewport: { height: number; width: number };
    locale?: string;
    timezoneId?: string;
  }>,
) {
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--mute-audio',
        '--no-first-run',
        '--disable-blink-features=AutomationControlled',
        '--js-flags=--max-old-space-size=128',
      ],
    });

    const getLangHeader = (locale?: string) => {
      if (!locale) return 'en-US,en;q=0.9';
      const lang = locale.split('-')[0];
      return `${locale},${lang};q=0.9,en-US;q=0.8,en;q=0.7`;
    };

    // Execute all personas concurrently in isolated browser contexts
    const capturePromises = personas.map(async (persona) => {
      const isMobile = persona.viewport.width < 500;
      const ctx = await browser!.newContext({
        extraHTTPHeaders: {
          'Accept-Language': getLangHeader(persona.locale),
          'Sec-CH-UA-Platform': persona.userAgent.includes('Mac') ? '"macOS"' : '"Windows"',
        },
        hasTouch: isMobile,
        isMobile,
        locale: persona.locale || 'en-US',
        timezoneId: persona.timezoneId || 'America/New_York',
        userAgent: persona.userAgent,
        viewport: persona.viewport,
      });

      // Inject maturity & shopping country cookies for Steam
      if (targetUrl.includes('steampowered.com')) {
        const countryCode = (persona.locale || 'en-US').split('-')[1]?.toUpperCase() || 'US';
        await ctx
          .addCookies([
            {
              domain: 'store.steampowered.com',
              name: 'wants_mature_content',
              path: '/',
              value: '1',
            },
            {
              domain: 'store.steampowered.com',
              name: 'birthtime',
              path: '/',
              value: '788918401',
            },
            {
              domain: 'store.steampowered.com',
              name: 'shoppingCartCountryCode',
              path: '/',
              value: countryCode,
            },
          ])
          .catch(() => undefined);
      }

      const page = await ctx.newPage();
      const tStart = Date.now();
      const personaTargetUrl = resolvePersonaTargetUrl(targetUrl, persona.locale || 'en-US');

      try {
        const response = await page
          .goto(personaTargetUrl, { timeout: 25000, waitUntil: 'domcontentloaded' })
          .catch(() => null);

        // Allow layout, dynamic Single-Page-App content and images to settle
        await page.waitForTimeout(2500).catch(() => undefined);

        let screenshot = '';
        try {
          screenshot = `data:image/png;base64,${(await page.screenshot({ fullPage: false, timeout: 10000 })).toString('base64')}`;
        } catch (err) {
          console.warn(`Screenshot capture notice for ${persona.name}:`, err);
        }

        const title = await page.title().catch(() => '');

        const priceEvaluation = await page
          .evaluate(() => {
            const bodyText = document.body?.innerText || '';
            const priceRegex =
              /(?:(R\$|\$|€|£|¥|₺|₨|₹|AED|CHF|CAD|AUD|KRW|₩|TL)[ \t\u00a0]*([\d]+(?:[.,][\d]{1,2})?)|([\d]+(?:[.,][\d]{1,2})?)[ \t\u00a0]*(R\$|\$|€|£|¥|₺|₨|₹|AED|CHF|CAD|AUD|KRW|₩|TL)(?:\/ay|\/mois|\/month|\/mo)?)/i;

            const priceSelectors = [
              '[itemprop="price"]',
              '[data-testid*="price" i]',
              '[class*="discount_final_price" i]',
              '[class*="game_purchase_price" i]',
              '[class~="price"]',
            ];
            const candidateTexts = priceSelectors.flatMap((selector) =>
              Array.from(document.querySelectorAll<HTMLElement>(selector))
                .filter((element) => element.offsetParent !== null)
                .map(
                  (element) =>
                    element.getAttribute('content') ||
                    element.innerText ||
                    element.textContent ||
                    '',
                ),
            );
            candidateTexts.push(...bodyText.split(/\r?\n/));

            let match: RegExpMatchArray | null = null;
            for (const candidate of candidateTexts) {
              match = candidate.trim().match(priceRegex);
              if (match) break;
            }
            let detectedPrice: string | undefined;
            let detectedCurrency: string | undefined;

            if (match) {
              const symbol = (match[1] || match[4] || '').trim();
              const amount = (match[2] || match[3] || '').trim();
              if (amount && amount.length < 15) {
                detectedPrice = `${symbol} ${amount}`.trim();
                detectedCurrency = symbol;
              }
            }
            return {
              detectedCurrency,
              detectedPrice,
              elementCount: document.querySelectorAll('*').length,
              textSnippet: bodyText.slice(0, 50000),
            };
          })
          .catch(() => ({
            detectedCurrency: undefined,
            detectedPrice: undefined,
            elementCount: 0,
            textSnippet: '',
          }));

        const durationMs = Date.now() - tStart;

        return {
          detectedCurrency: priceEvaluation.detectedCurrency,
          detectedPrice: priceEvaluation.detectedPrice,
          durationMs,
          elementCount: priceEvaluation.elementCount,
          finalUrl: page.url(),
          httpOutcome: {
            ok: response?.ok() ?? false,
            redirectChain: [],
            statusCode: response?.status() ?? 0,
          },
          id: persona.id,
          locale: persona.locale || 'en-US',
          name: persona.name,
          screenshot,
          textSnippet: priceEvaluation.textSnippet,
          timezoneId: persona.timezoneId || 'America/New_York',
          title,
          viewport: persona.viewport,
        };
      } finally {
        await ctx.close().catch(() => undefined);
      }
    });

    const capturedResults = await Promise.all(capturePromises);
    if (capturedResults.length < 2) {
      throw new Error('At least two captured personas are required to build a comparison.');
    }
    const pA = capturedResults[0]!;
    const pB = capturedResults[1]!;

    // Helper to tokenize text into meaningful word sets
    const getTokens = (txt: string) => {
      return new Set(
        txt
          .toLowerCase()
          .replace(/[\r\n\t.,;:!?'"()[\]{}/\\#$%^&*+=<>~`|]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length >= 2),
      );
    };

    // Calculate pairwise comparisons across all captured personas
    const pairwiseList: PairwiseComparison[] = [];
    let totalTextSim = 0;
    let totalDomSim = 0;
    let minTextSim = 1.0;
    let minTextPair = '';
    let pairCount = 0;

    for (let i = 0; i < capturedResults.length; i++) {
      for (let j = i + 1; j < capturedResults.length; j++) {
        const p1 = capturedResults[i]!;
        const p2 = capturedResults[j]!;

        const set1 = getTokens(p1.textSnippet);
        const set2 = getTokens(p2.textSnippet);

        const intersection = new Set([...set1].filter((x) => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        const jaccard = union.size > 0 ? intersection.size / union.size : 1.0;
        const simScore = Number(jaccard.toFixed(3));

        const maxCount = Math.max(p1.elementCount, p2.elementCount, 1);
        const elemDiff = Math.abs(p1.elementCount - p2.elementCount);
        const domSim = Number((1 - elemDiff / maxCount).toFixed(3));

        pairwiseList.push({
          durationDeltaMs: Math.abs(p1.durationMs - p2.durationMs),
          domSimilarity: domSim,
          personaA: p1.name,
          personaB: p2.name,
          textSimilarity: simScore,
          titleMatch: p1.title === p2.title,
        });

        totalTextSim += simScore;
        totalDomSim += domSim;
        if (simScore < minTextSim) {
          minTextSim = simScore;
          minTextPair = `${p1.name} vs ${p2.name}`;
        }
        pairCount++;
      }
    }

    const avgTextSimilarity = pairCount > 0 ? Number((totalTextSim / pairCount).toFixed(3)) : 1.0;
    const avgDomSimilarity = pairCount > 0 ? Number((totalDomSim / pairCount).toFixed(3)) : 1.0;

    const uniqueTitles = [...new Set(capturedResults.map((p) => p.title).filter(Boolean))];
    const titleDiscrepancy =
      uniqueTitles.length <= 1
        ? 'Exact Match'
        : `Variants: ${uniqueTitles.map((t) => `"${t}"`).join(' vs ')}`;

    let observation = '';
    if (minTextSim < 0.75) {
      observation = `Observed significant localized content / language divergence across personas: Minimum text vocabulary overlap dropped to ${(minTextSim * 100).toFixed(1)}% (${minTextPair}). Cross-persona average text similarity is ${(avgTextSimilarity * 100).toFixed(1)}% across ${capturedResults.length} audited profiles.`;
    } else if (avgTextSimilarity < 0.95 || avgDomSimilarity < 0.95) {
      observation = `Observed layout and content variation across personas: ${(avgTextSimilarity * 100).toFixed(1)}% average text overlap and ${(avgDomSimilarity * 100).toFixed(1)}% DOM structural similarity under recorded conditions.`;
    } else {
      observation = `Observed consistent content across all ${capturedResults.length} profiles under recorded conditions: ${(avgTextSimilarity * 100).toFixed(1)}% text overlap and ${(avgDomSimilarity * 100).toFixed(1)}% DOM similarity.`;
    }

    const comparisonData: RealComparisonData = {
      comparedPersonas: capturedResults.map((p) => p.name),
      comparisonId: `cmp-${runId.slice(0, 8)}`,
      confidence: 'HIGH',
      domSummary: {
        personaAElementCount: pA.elementCount,
        personaATextSnippet: pA.textSnippet.slice(0, 300),
        personaATitle: pA.title,
        personaBElementCount: pB.elementCount,
        personaBTextSnippet: pB.textSnippet.slice(0, 300),
        personaBTitle: pB.title,
      },
      metricVersion: '1.0.0',
      metrics: [
        {
          confidence: 'HIGH',
          explanation: `Calculated from live DOM element counts across all ${pairCount} persona pairs.`,
          metricName: 'DOM Structural Similarity',
          metricVersion: '1.0.0',
          result: avgDomSimilarity,
          warnings: [],
        },
        {
          confidence: 'HIGH',
          explanation: `Calculated word token overlap (Jaccard) across all ${pairCount} cross-persona pairs (Lowest: ${(minTextSim * 100).toFixed(1)}% on ${minTextPair || 'control'}).`,
          metricName: 'Text Content Similarity (Jaccard)',
          metricVersion: '1.0.0',
          result: avgTextSimilarity,
          warnings:
            minTextSim < 0.7
              ? [`Significant language/content divergence detected on ${minTextPair}`]
              : [],
        },
        {
          confidence: 'HIGH',
          explanation: `Verifies document title rendered for each visitor identity.`,
          metricName: 'Page Title Discrepancy',
          metricVersion: '1.0.0',
          result: titleDiscrepancy,
          warnings: [],
        },
        {
          confidence: 'MEDIUM',
          explanation: `Measured concurrent load duration across ${capturedResults.length} isolated contexts (${pA.durationMs}ms vs ${pB.durationMs}ms).`,
          metricName: 'Load Timing Variance',
          metricVersion: '1.0.0',
          result: `+${Math.abs(pA.durationMs - pB.durationMs)}ms`,
          warnings: [],
        },
      ],
      overallObservation: observation,
      pairwiseComparisons: pairwiseList,
      personaResults: capturedResults,
      runId,
      screenshots: {
        personaA: pA.screenshot,
        personaAName: pA.name,
        personaB: pB.screenshot,
        personaBName: pB.name,
      },
      timestampUtc: new Date().toISOString(),
      warnings:
        minTextSim < 0.7
          ? [`Significant language/content divergence detected on ${minTextPair}`]
          : [],
    };

    // Generate AI visual insights and preserve the reason when analysis is unavailable.
    const aiInsightsResult = await generateAiInsights(
      capturedResults.map((p) => ({
        name: p.name,
        screenshot: p.screenshot,
        textSnippet: p.textSnippet,
      })),
    );
    comparisonData.aiInsights = aiInsightsResult.insights;
    comparisonData.aiInsightsStatus = aiInsightsResult.status;
    if (aiInsightsResult.message) comparisonData.aiInsightsMessage = aiInsightsResult.message;

    runComparisonsStore.set(runId, comparisonData);

    const replaySteps = capturedResults.map((p, idx) => ({
      artifacts: [
        {
          artifactType: 'screenshot',
          sha256: crypto
            .createHash('sha256')
            .update(p.screenshot || 'empty')
            .digest('hex'),
          state: p.screenshot ? 'PRESENT' : 'FAILED',
          storageKey: `runs/${runId}/persona-${idx + 1}/screenshot.png`,
        },
        {
          artifactType: 'dom_snapshot',
          sha256: crypto.createHash('sha256').update(p.textSnippet).digest('hex'),
          state: p.textSnippet ? 'PRESENT' : 'EMPTY',
          storageKey: `runs/${runId}/persona-${idx + 1}/dom.html`,
        },
      ],
      domTextSnippet: p.textSnippet.slice(0, 400),
      finalUrl: p.finalUrl,
      httpOutcome: p.httpOutcome,
      overallEvidenceState:
        p.httpOutcome.ok && p.screenshot
          ? 'PRESENT'
          : p.httpOutcome.statusCode === 0
            ? 'FAILED'
            : 'EMPTY',
      personaId: p.name,
      runId,
      screenshotUrl: p.screenshot,
      stepId: `step-${idx + 1}`,
      stepIndex: idx,
      timestampUtc: new Date().toISOString(),
    }));

    runReplaysStore.set(runId, { steps: replaySteps });
  } catch (err) {
    console.error('Real Playwright execution error:', err);
    throw err;
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }
}

async function executeTrackedPlaywrightRun(
  db: NonNullable<AppDependencies['db']>,
  tenantId: string,
  runId: string,
  targetUrl: string,
  personas: Parameters<typeof executeRealPlaywrightRun>[2],
) {
  const runningRun = await transitionRunStatus(db, tenantId, runId, 'running');
  if (!runningRun) throw new Error(`Run ${runId} was not found before execution.`);

  try {
    await executeRealPlaywrightRun(runId, targetUrl, personas);
    const completedRun = await transitionRunStatus(db, tenantId, runId, 'completed');
    if (!completedRun) throw new Error(`Run ${runId} was not found after execution.`);
    return completedRun;
  } catch (error) {
    await transitionRunStatus(
      db,
      tenantId,
      runId,
      'failed',
      error instanceof Error ? error.message : 'Unknown browser execution error',
    ).catch((transitionError: unknown) => {
      console.error(`[Run Lifecycle] Failed to mark run ${runId} as failed:`, transitionError);
    });
    throw error;
  }
}

function databaseUnavailable(requestId: string) {
  return buildProblem({
    detail: 'The database is not configured for this API process.',
    requestId,
    status: 503,
    title: 'Service Unavailable',
    type: 'database-unavailable',
  });
}

function publicPersona(row: {
  content_hash: string;
  id: string;
  name: string;
  settings: Record<string, unknown>;
}) {
  const viewport = row.settings['viewport'];
  const parsedViewport =
    viewport && typeof viewport === 'object'
      ? (viewport as { height?: unknown; width?: unknown })
      : {};
  return {
    id: row.id,
    name: row.name,
    settings: {
      colorScheme:
        row.settings['colorScheme'] === 'dark' || row.settings['colorScheme'] === 'light'
          ? row.settings['colorScheme']
          : 'no-preference',
      locale: typeof row.settings['locale'] === 'string' ? row.settings['locale'] : 'en-US',
      reducedMotion: row.settings['reducedMotion'] === 'reduce' ? 'reduce' : 'no-preference',
      timezoneId:
        typeof row.settings['timezoneId'] === 'string' ? row.settings['timezoneId'] : 'UTC',
      userAgent: typeof row.settings['userAgent'] === 'string' ? row.settings['userAgent'] : '',
      viewport: {
        height: typeof parsedViewport.height === 'number' ? parsedViewport.height : 720,
        width: typeof parsedViewport.width === 'number' ? parsedViewport.width : 1280,
      },
    },
    version: row.content_hash,
  };
}

export function registerRunRoutes(
  app: FastifyInstance,
  config: ApiConfig,
  deps: AppDependencies,
): void {
  app.addHook('preHandler', async (request) => {
    request.authUser = null;
    request.correlationId =
      typeof request.headers['x-correlation-id'] === 'string' &&
      request.headers['x-correlation-id'].length > 0
        ? request.headers['x-correlation-id']
        : request.id;

    const token = parseBearerToken(request.headers.authorization);
    if (token) {
      if (deps.db) {
        const user = await findUserByToken(deps.db, token);
        if (user) {
          request.authUser = toAuthenticatedUser(user);
          return;
        }
      }
    }
  });

  // Admin Metadata Endpoints for UI
  app.get('/v1/admin/surfaces', async (request, reply) => {
    const user = requireRole(
      request,
      reply,
      canListRuns,
      'Viewer, operator, or admin role is required.',
    );
    if (!user) return;
    if (!deps.db) return reply.status(503).send(databaseUnavailable(request.id));
    const surfaces = await listSurfaces(deps.db, user.tenantId);
    return reply.send(
      surfaces.map((surface) => ({
        hostname: new URL(surface.origin).hostname,
        id: surface.id,
        name: surface.display_name,
        origin: surface.origin,
        status: surface.status,
      })),
    );
  });

  app.get('/v1/admin/journeys', async (request, reply) => {
    const user = requireRole(
      request,
      reply,
      canListRuns,
      'Viewer, operator, or admin role is required.',
    );
    if (!user) return;
    if (!deps.db) return reply.status(503).send(databaseUnavailable(request.id));
    const journeys = await listJourneyVersions(deps.db, user.tenantId);
    return reply.send(
      journeys.map((journey) => ({
        id: journey.id,
        name: journey.version_label,
        steps: journey.steps,
        surfaceId: journey.surface_id,
        version: journey.content_hash,
      })),
    );
  });

  app.get('/v1/admin/personas', async (request, reply) => {
    const user = requireRole(
      request,
      reply,
      canListRuns,
      'Viewer, operator, or admin role is required.',
    );
    if (!user) return;
    if (!deps.db) return reply.status(503).send(databaseUnavailable(request.id));
    const personas = await listPersonaVersions(deps.db, user.tenantId);
    return reply.send(personas.map(publicPersona));
  });

  // Create Custom Persona
  app.post<{
    Body: {
      name: string;
      settings: {
        locale: string;
        timezoneId?: string;
        userAgent?: string;
        viewport?: { width: number; height: number };
        colorScheme?: 'light' | 'dark' | 'no-preference';
        reducedMotion?: 'reduce' | 'no-preference';
      };
    };
  }>('/v1/admin/personas', async (request, reply) => {
    const user = requireRole(
      request,
      reply,
      canCreateRun,
      'Operator or admin role is required to create personas.',
    );
    if (!user) return;
    if (!deps.db) return reply.status(503).send(databaseUnavailable(request.id));

    const record = request.body;
    if (!record || !record.name || !record.settings || !record.settings.locale) {
      return reply.status(400).send(
        buildProblem({
          detail: 'Persona name and settings.locale are required.',
          requestId: request.id,
          status: 400,
          title: 'Bad Request',
          type: 'invalid-persona-payload',
        }),
      );
    }

    const settings = {
      colorScheme: record.settings.colorScheme ?? 'no-preference',
      locale: record.settings.locale.trim(),
      reducedMotion: record.settings.reducedMotion ?? 'no-preference',
      timezoneId: record.settings.timezoneId ?? 'UTC',
      ...(record.settings.userAgent ? { userAgent: record.settings.userAgent } : {}),
      viewport: record.settings.viewport ?? { height: 720, width: 1280 },
    };
    const contentHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ name: record.name.trim(), settings }))
      .digest('hex');
    const newPersona = await createPersonaVersion(deps.db, {
      contentHash,
      id: crypto.randomUUID(),
      name: record.name.trim(),
      settings,
      tenantId: user.tenantId,
    });
    return reply.status(201).send(publicPersona(newPersona));
  });

  // Delete Custom Persona
  app.delete<{ Params: { id: string } }>('/v1/admin/personas/:id', async (request, reply) => {
    const user = requireRole(
      request,
      reply,
      canCreateRun,
      'Operator or admin role is required to delete personas.',
    );
    if (!user) return;
    if (!deps.db) return reply.status(503).send(databaseUnavailable(request.id));
    const deleted = await deletePersonaVersion(deps.db, user.tenantId, request.params.id);
    if (!deleted) {
      return reply.status(404).send(
        buildProblem({
          detail: 'Persona was not found.',
          requestId: request.id,
          status: 404,
          title: 'Not Found',
          type: 'persona-not-found',
        }),
      );
    }
    return reply.status(204).send();
  });

  // Run creation
  app.post<{ Body: unknown }>('/v1/runs', async (request, reply) => {
    const user = requireRole(
      request,
      reply,
      canCreateRun,
      'Operator or admin role is required to create runs.',
    );
    if (!user) {
      if (deps.db) {
        await insertAuditEvent(deps.db, {
          action: 'run.create',
          actorId: null,
          correlationId: request.correlationId,
          outcome: 'denied',
          requestId: request.id,
          resourceId: null,
          resourceType: 'run',
          tenantId: '00000000-0000-4000-8000-000000000000',
        }).catch(() => undefined);
      }
      return;
    }

    const idempotencyKey = request.headers['idempotency-key'];
    if (
      typeof idempotencyKey !== 'string' ||
      idempotencyKey.length < 8 ||
      idempotencyKey.length > 128
    ) {
      return reply.status(400).send(
        buildProblem({
          detail: 'Idempotency-Key header must be between 8 and 128 characters.',
          requestId: request.id,
          status: 400,
          title: 'Bad Request',
          type: 'invalid-idempotency-key',
        }),
      );
    }

    const body = validateCreateRunBody(request.body);
    if (!body) {
      return reply.status(400).send(
        buildProblem({
          detail: 'Request body failed validation.',
          requestId: request.id,
          status: 400,
          title: 'Bad Request',
          type: 'validation-error',
        }),
      );
    }

    if (deps.db) {
      const requestHash = hashRequestBody(body);
      const existing = await findIdempotencyRecord(deps.db, user.tenantId, idempotencyKey);
      if (existing) {
        if (existing.requestHash !== requestHash) {
          return reply.status(409).send(
            buildProblem({
              detail: 'Idempotency-Key was reused with a different request body.',
              requestId: request.id,
              status: 409,
              title: 'Conflict',
              type: 'idempotency-conflict',
            }),
          );
        }
        return reply.status(existing.responseStatus).send(existing.responseBody);
      }

      let resolvedSurfaceId = body.surfaceId;
      let resolvedJourneyVersionId = body.journeyVersionId;
      if (body.customSurfaceUrl) {
        try {
          const customUrl = new URL(body.customSurfaceUrl);
          const configuration = await ensureLiveAuditConfiguration(deps.db, {
            contentHash: crypto
              .createHash('sha256')
              .update(`navigate|wait-for-load|screenshot|extract-and-diff:v1:${customUrl.origin}`)
              .digest('hex'),
            displayName: body.customSurfaceName?.trim() || customUrl.hostname,
            origin: customUrl.origin,
            steps: [
              { id: 'navigate', type: 'navigate' },
              { id: 'wait-for-load', type: 'wait' },
              { id: 'screenshot', type: 'screenshot' },
              { id: 'extract-and-diff', type: 'extract' },
            ],
            tenantId: user.tenantId,
          });
          resolvedSurfaceId = configuration.surface.id;
          resolvedJourneyVersionId = configuration.journey.id;
        } catch {
          // ignore malformed custom url
        }
      }

      if (!resolvedSurfaceId || !resolvedJourneyVersionId) {
        return reply.status(400).send(
          buildProblem({
            detail: 'A saved surface and journey or a valid custom URL is required.',
            requestId: request.id,
            status: 400,
            title: 'Bad Request',
            type: 'invalid-audit-configuration',
          }),
        );
      }

      const surface = await findSurfaceById(deps.db, user.tenantId, resolvedSurfaceId);
      if (!surface || surface.status !== 'approved') {
        await insertAuditEvent(deps.db, {
          action: 'run.create',
          actorId: user.id,
          correlationId: request.correlationId,
          metadata: { reason: 'surface_not_found_or_not_approved' },
          outcome: 'denied',
          requestId: request.id,
          resourceId: null,
          resourceType: 'run',
          tenantId: user.tenantId,
        });
        return reply.status(403).send(
          buildProblem({
            detail: 'Surface is not available for this tenant.',
            requestId: request.id,
            status: 403,
            title: 'Forbidden',
            type: 'surface-forbidden',
          }),
        );
      }

      const journey = await findJourneyVersionById(
        deps.db,
        user.tenantId,
        resolvedJourneyVersionId,
      );
      if (!journey || journey.surface_id !== resolvedSurfaceId) {
        return reply.status(400).send(
          buildProblem({
            detail: 'Journey version is invalid for the requested surface.',
            requestId: request.id,
            status: 400,
            title: 'Bad Request',
            type: 'invalid-journey',
          }),
        );
      }

      const personas = await findPersonaVersionsByIds(
        deps.db,
        user.tenantId,
        body.personaVersionIds,
      );
      if (personas.length !== body.personaVersionIds.length) {
        return reply.status(400).send(
          buildProblem({
            detail: 'One or more persona versions are invalid for this tenant.',
            requestId: request.id,
            status: 400,
            title: 'Bad Request',
            type: 'invalid-persona',
          }),
        );
      }

      const targetUrl = body.customSurfaceUrl ?? surface.origin;

      const selectedPersonas = body.personaVersionIds.map((id) => {
        const found = personas.find((persona) => persona.id === id)!;
        const persona = publicPersona(found);
        return {
          id: persona.id,
          locale: persona.settings.locale,
          name: persona.name,
          timezoneId: persona.settings.timezoneId,
          userAgent: persona.settings.userAgent,
          viewport: persona.settings.viewport,
        };
      });

      const run = await createRun(deps.db, {
        correlationId: request.correlationId,
        createdBy: user.id,
        journeyVersionId: resolvedJourneyVersionId,
        personaVersionIds: body.personaVersionIds,
        surfaceId: resolvedSurfaceId,
        tenantId: user.tenantId,
      });

      // Execute Playwright browser capture asynchronously in background to prevent HTTP 502 proxy timeouts
      void executeTrackedPlaywrightRun(
        deps.db,
        user.tenantId,
        run.id,
        targetUrl,
        selectedPersonas,
      ).catch((err) => {
        request.log.error({ err }, 'Background Playwright audit run failed');
      });

      const responseBody = publicRun({ ...run, targetUrl });
      await saveIdempotencyRecord(
        deps.db,
        user.tenantId,
        idempotencyKey,
        requestHash,
        202,
        responseBody,
      );
      await insertAuditEvent(deps.db, {
        action: 'run.create',
        actorId: user.id,
        correlationId: request.correlationId,
        outcome: 'success',
        requestId: request.id,
        resourceId: run.id,
        resourceType: 'run',
        tenantId: user.tenantId,
      });

      return reply.status(202).send(responseBody);
    }

    return reply.status(503).send(databaseUnavailable(request.id));
  });

  // Run Details
  app.get<{ Params: { id: string } }>('/v1/runs/:id', async (request, reply) => {
    const user = requireRole(
      request,
      reply,
      canListRuns,
      'Viewer, operator, or admin role is required.',
    );
    if (!user) return;

    if (!isUuid(request.params.id)) {
      return reply.status(400).send(
        buildProblem({
          detail: 'Run id must be a UUID.',
          requestId: request.id,
          status: 400,
          title: 'Bad Request',
          type: 'validation-error',
        }),
      );
    }

    if (deps.db) {
      const run = await findRunById(deps.db, user.tenantId, request.params.id);
      if (!run) {
        return reply.status(404).send(
          buildProblem({
            detail: 'Run was not found.',
            requestId: request.id,
            status: 404,
            title: 'Not Found',
            type: 'run-not-found',
          }),
        );
      }

      return reply.send({
        ...publicRun(run),
        correlationId: run.correlationId,
        journeyVersionId: run.journeyVersionId,
        personaVersionIds: run.personaVersionIds,
        surfaceId: run.surfaceId,
      });
    }

    return reply.status(503).send(databaseUnavailable(request.id));
  });

  // List Runs
  app.get<{ Querystring: { limit?: string; offset?: string } }>(
    '/v1/runs',
    async (request, reply) => {
      const user = requireRole(
        request,
        reply,
        canListRuns,
        'Viewer, operator, or admin role is required.',
      );
      if (!user) return;

      const limit = Math.min(
        Number(request.query.limit ?? config.defaultPageSize),
        config.maxPageSize,
      );
      const offset = Number(request.query.offset ?? 0);
      if (!Number.isInteger(limit) || limit < 1 || !Number.isInteger(offset) || offset < 0) {
        return reply.status(400).send(
          buildProblem({
            detail: 'Pagination parameters are invalid.',
            requestId: request.id,
            status: 400,
            title: 'Bad Request',
            type: 'validation-error',
          }),
        );
      }

      if (deps.db) {
        const page = await listRuns(deps.db, user.tenantId, limit, offset);
        return reply.send({
          items: page.runs.map(publicRun),
          limit,
          offset,
          total: page.total,
        });
      }

      return reply.status(503).send(databaseUnavailable(request.id));
    },
  );

  // Run Comparison Results
  app.get<{ Params: { id: string } }>('/v1/runs/:id/comparison', async (request, reply) => {
    const user = requireRole(
      request,
      reply,
      canListRuns,
      'Viewer, operator, or admin role is required.',
    );
    if (!user) return;

    const stored = runComparisonsStore.get(request.params.id);
    if (stored) {
      return reply.send(stored);
    }

    if (deps.db) {
      const run = await findRunById(deps.db, user.tenantId, request.params.id);
      if (run) {
        return reply.send({
          id: run.id,
          status: run.status,
          correlationId: run.correlationId,
          createdAt: run.createdAt,
          metrics: { diffScore: 0, layoutShift: 0, textDifferenceRatio: 0 },
          personaResults: [],
          discrepancies: [],
          insights: ['Parallel audit in progress across browser workers...'],
        });
      }
    }

    return reply.status(404).send(
      buildProblem({
        detail: `No comparison evidence found for run ${request.params.id}.`,
        requestId: request.id,
        status: 404,
        title: 'Not Found',
        type: 'resource-not-found',
      }),
    );
  });

  // Run Replay Evidence
  app.get<{ Params: { id: string } }>('/v1/runs/:id/replay', async (request, reply) => {
    const user = requireRole(
      request,
      reply,
      canListRuns,
      'Viewer, operator, or admin role is required.',
    );
    if (!user) return;

    const storedReplay = runReplaysStore.get(request.params.id);
    if (storedReplay) {
      return reply.send(storedReplay);
    }

    return reply.status(404).send(
      buildProblem({
        detail: `No replay evidence found for run ${request.params.id}.`,
        requestId: request.id,
        status: 404,
        title: 'Not Found',
        type: 'resource-not-found',
      }),
    );
  });

  // Cancel Run
  app.post<{ Params: { id: string } }>('/v1/runs/:id/cancel', async (request, reply) => {
    const user = requireRole(
      request,
      reply,
      canCancelRun,
      'Operator or admin role is required to cancel runs.',
    );
    if (!user) return;

    if (!isUuid(request.params.id)) {
      return reply.status(400).send(
        buildProblem({
          detail: 'Run id must be a UUID.',
          requestId: request.id,
          status: 400,
          title: 'Bad Request',
          type: 'validation-error',
        }),
      );
    }

    if (deps.db) {
      try {
        const run = await transitionRunStatus(
          deps.db,
          user.tenantId,
          request.params.id,
          'cancelled',
        );
        if (!run) {
          return reply.status(404).send(
            buildProblem({
              detail: 'Run was not found.',
              requestId: request.id,
              status: 404,
              title: 'Not Found',
              type: 'run-not-found',
            }),
          );
        }
        return reply.send(publicRun(run));
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('Illegal run transition')) {
          return reply.status(409).send(
            buildProblem({
              detail: error.message,
              requestId: request.id,
              status: 409,
              title: 'Conflict',
              type: 'illegal-transition',
            }),
          );
        }
        throw error;
      }
    }

    return reply.status(503).send(databaseUnavailable(request.id));
  });

  // Audit Events
  app.get<{ Querystring: { limit?: string; offset?: string } }>(
    '/v1/admin/audit-events',
    async (request, reply) => {
      const user = requireRole(
        request,
        reply,
        canViewAudit,
        'Admin role is required to view audit events.',
      );
      if (!user) return;

      if (deps.db) {
        const limit = Math.min(
          Number(request.query.limit ?? config.defaultPageSize),
          config.maxPageSize,
        );
        const offset = Number(request.query.offset ?? 0);
        const page = await listAuditEvents(deps.db, user.tenantId, limit, offset);
        return reply.send({
          items: page.events,
          limit,
          offset,
          total: page.total,
        });
      }

      return reply.status(503).send(databaseUnavailable(request.id));
    },
  );

  // ---------------------------------------------------------------------------
  // Scheduled Jobs Endpoints
  // ---------------------------------------------------------------------------

  // List all scheduled jobs
  app.get('/v1/scheduled-jobs', async (request, reply) => {
    const user = requireRole(
      request,
      reply,
      canListRuns,
      'Viewer, operator, or admin role is required.',
    );
    if (!user) return;
    return reply.send(
      Array.from(scheduledJobsStore.values()).filter((job) => job.tenantId === user.tenantId),
    );
  });

  // Create a new scheduled job
  app.post<{
    Body: {
      name: string;
      targetUrl: string;
      personaIds: string[];
      surfaceId: string;
      journeyVersionId: string;
      intervalMinutes: number;
    };
  }>('/v1/scheduled-jobs', async (request, reply) => {
    const user = requireRole(request, reply, canCreateRun, 'Operator or admin role is required.');
    if (!user) return;
    if (!deps.db) return reply.status(503).send(databaseUnavailable(request.id));

    const { name, targetUrl, personaIds, surfaceId, journeyVersionId, intervalMinutes } =
      request.body;
    if (
      !name ||
      !targetUrl ||
      !Array.isArray(personaIds) ||
      personaIds.length < 2 ||
      !surfaceId ||
      !journeyVersionId ||
      !intervalMinutes ||
      intervalMinutes < 5
    ) {
      return reply.status(400).send(
        buildProblem({
          detail:
            'name, targetUrl, personaIds (≥2), surfaceId, journeyVersionId, and intervalMinutes (≥5) are required.',
          requestId: request.id,
          status: 400,
          title: 'Bad Request',
          type: 'invalid-scheduled-job',
        }),
      );
    }

    const [surface, journey, personas] = await Promise.all([
      findSurfaceById(deps.db, user.tenantId, surfaceId),
      findJourneyVersionById(deps.db, user.tenantId, journeyVersionId),
      findPersonaVersionsByIds(deps.db, user.tenantId, personaIds),
    ]);
    if (
      !surface ||
      surface.status !== 'approved' ||
      !journey ||
      journey.surface_id !== surfaceId ||
      personas.length !== personaIds.length
    ) {
      return reply.status(400).send(
        buildProblem({
          detail: 'The scheduled job references an invalid surface, journey, or persona.',
          requestId: request.id,
          status: 400,
          title: 'Bad Request',
          type: 'invalid-scheduled-job-reference',
        }),
      );
    }

    const job: ScheduledJob = {
      createdBy: user.id,
      id: crypto.randomUUID(),
      name: name.trim(),
      targetUrl,
      tenantId: user.tenantId,
      personaIds,
      surfaceId,
      journeyVersionId,
      intervalMinutes,
      intervalLabel: intervalLabel(intervalMinutes),
      enabled: true,
      createdAt: new Date().toISOString(),
      lastRunAt: null,
      lastRunId: null,
      nextRunAt: nextRunDate(intervalMinutes),
      runCount: 0,
    };

    scheduledJobsStore.set(job.id, job);
    return reply.status(201).send(job);
  });

  // Delete a scheduled job
  app.delete<{ Params: { id: string } }>('/v1/scheduled-jobs/:id', async (request, reply) => {
    const user = requireRole(request, reply, canCreateRun, 'Operator or admin role is required.');
    if (!user) return;

    const job = scheduledJobsStore.get(request.params.id);
    if (!job || job.tenantId !== user.tenantId) {
      return reply.status(404).send(
        buildProblem({
          detail: 'Scheduled job not found.',
          requestId: request.id,
          status: 404,
          title: 'Not Found',
          type: 'scheduled-job-not-found',
        }),
      );
    }
    scheduledJobsStore.delete(request.params.id);
    return reply.status(204).send();
  });

  // Toggle a scheduled job enabled/disabled
  app.patch<{ Params: { id: string } }>('/v1/scheduled-jobs/:id/toggle', async (request, reply) => {
    const user = requireRole(request, reply, canCreateRun, 'Operator or admin role is required.');
    if (!user) return;

    const job = scheduledJobsStore.get(request.params.id);
    if (!job || job.tenantId !== user.tenantId) {
      return reply.status(404).send(
        buildProblem({
          detail: 'Scheduled job not found.',
          requestId: request.id,
          status: 404,
          title: 'Not Found',
          type: 'scheduled-job-not-found',
        }),
      );
    }
    job.enabled = !job.enabled;
    if (job.enabled) {
      job.nextRunAt = nextRunDate(job.intervalMinutes);
    }
    scheduledJobsStore.set(job.id, job);
    return reply.send(job);
  });

  // ---------------------------------------------------------------------------
  // Scheduler tick — fires every 60 seconds, executes due jobs
  // ---------------------------------------------------------------------------
  setInterval(() => {
    void (async () => {
      if (!deps.db) return;
      const now = Date.now();
      for (const job of scheduledJobsStore.values()) {
        if (!job.enabled || new Date(job.nextRunAt).getTime() > now) continue;

        const personaRows = await findPersonaVersionsByIds(deps.db, job.tenantId, job.personaIds);
        if (personaRows.length !== job.personaIds.length) {
          job.enabled = false;
          scheduledJobsStore.set(job.id, job);
          continue;
        }
        const personas = job.personaIds.map((id) => {
          const persona = publicPersona(personaRows.find((row) => row.id === id)!);
          return {
            id: persona.id,
            locale: persona.settings.locale,
            name: persona.name,
            timezoneId: persona.settings.timezoneId,
            userAgent: persona.settings.userAgent,
            viewport: persona.settings.viewport,
          };
        });
        const run = await createRun(deps.db, {
          correlationId: `scheduled-${job.id}`,
          createdBy: job.createdBy,
          journeyVersionId: job.journeyVersionId,
          personaVersionIds: job.personaIds,
          surfaceId: job.surfaceId,
          tenantId: job.tenantId,
        });

        job.lastRunAt = new Date().toISOString();
        job.lastRunId = run.id;
        job.nextRunAt = nextRunDate(job.intervalMinutes);
        job.runCount += 1;
        scheduledJobsStore.set(job.id, job);

        void executeTrackedPlaywrightRun(
          deps.db!,
          job.tenantId,
          run.id,
          job.targetUrl,
          personas,
        ).catch((err: Error) =>
          console.error(`[Scheduler] Run ${run.id} for job ${job.id} failed:`, err.message),
        );
      }
    })().catch((error: unknown) => {
      console.error('[Scheduler] Tick failed:', error);
    });
  }, 60_000);
}
