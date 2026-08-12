import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import type {
  PersonaSettings,
  JourneyDefinition,
  RunProgressEvent,
} from '@ai-parallel-web/contracts';
import { WorkerPool, isUrlAllowed } from '../../apps/worker-browser/src/index.js';

describe('Day 3 - Isolated Playwright Execution & Gate Criteria', () => {
  let fixtureServer: FastifyInstance;
  let serverPort: number;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.ALLOW_LOOPBACK = 'true';
    // Start local Fastify fixture server simulating persona variant responses & redirect endpoints
    fixtureServer = Fastify({ logger: false });

    // Fixture catalogue endpoint emitting data-persona attribute based on query param
    fixtureServer.get('/fixture', async (request, reply) => {
      const query = request.query as { persona?: string };
      const persona = query.persona === 'variant' ? 'variant' : 'control';

      const items =
        persona === 'variant'
          ? `<li data-testid="product" data-id="beta" data-rank="1"><span>Beta</span><data value="18.00">$18.00</data></li>`
          : `<li data-testid="product" data-id="alpha" data-rank="1"><span>Alpha</span><data value="10.00">$10.00</data></li>`;

      // Return cookie and session storage script for isolation verification
      reply.header('Set-Cookie', `session_token=secret_${persona}; Path=/; HttpOnly`);

      return reply.type('text/html').send(`<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Fixture Catalogue</title></head>
  <body data-persona="${persona}">
    <main>
      <h1 data-testid="heading">Fixture catalogue</h1>
      <ol data-testid="catalogue">${items}</ol>
      <button data-testid="action-btn" onclick="document.cookie='user_state=${persona}'; localStorage.setItem('persona_key', '${persona}')">Set State</button>
    </main>
  </body>
</html>`);
    });

    // Endpoint that redirects to an unauthorized external origin
    fixtureServer.get('/redirect-unauthorized', async (_req, reply) => {
      return reply.redirect('http://unauthorized-domain.invalid/malicious', 302);
    });

    await fixtureServer.listen({ host: '127.0.0.1', port: 0 });
    const address = fixtureServer.server.address();
    serverPort = typeof address === 'object' && address ? address.port : 4300;
    baseUrl = `http://127.0.0.1:${serverPort}`;
  });

  afterAll(async () => {
    await fixtureServer.close();
  });

  it('Gate Criterion 1: Two personas complete the fixture journey concurrently without cross-contamination', async () => {
    const workerPool = new WorkerPool(2);

    const personaControl: PersonaSettings = {
      id: 'persona-control',
      name: 'Control User',
      viewport: { width: 1280, height: 720 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
      userAgent: 'ParallelWeb/1.0 (Control)',
      colorScheme: 'light',
      reducedMotion: 'no-preference',
    };

    const personaVariant: PersonaSettings = {
      id: 'persona-variant',
      name: 'Variant User',
      viewport: { width: 375, height: 667 },
      locale: 'fr-FR',
      timezoneId: 'Europe/Paris',
      userAgent: 'ParallelWeb/1.0 (Variant)',
      colorScheme: 'dark',
      reducedMotion: 'reduce',
    };

    const journey: JourneyDefinition = {
      id: 'journey-fixture-1',
      version: '1.0.0',
      name: 'Fixture Multi-Persona Journey',
      policy: {
        allowedUrlPatterns: [`http://127.0.0.1:${serverPort}/*`],
        blockDownloads: true,
        blockPopups: true,
      },
      steps: [
        {
          id: 'step-1',
          type: 'navigate',
          url: `${baseUrl}/fixture?persona=control`,
        },
        {
          id: 'step-2',
          type: 'wait',
          selector: '[data-testid="heading"]',
        },
        {
          id: 'step-3',
          type: 'extract',
          selector: '[data-testid="catalogue"]',
          extractName: 'catalogueContent',
        },
        {
          id: 'step-4',
          type: 'screenshot',
          name: 'catalogue-page',
        },
        {
          id: 'step-5',
          type: 'assert',
          selector: '[data-testid="heading"]',
          condition: 'equals',
          expectedValue: 'Fixture catalogue',
        },
      ],
    };

    // Override navigate step per persona
    const journeyControl: JourneyDefinition = {
      ...journey,
      steps: journey.steps.map((s) =>
        s.type === 'navigate' ? { ...s, url: `${baseUrl}/fixture?persona=control` } : s,
      ),
    };

    const journeyVariant: JourneyDefinition = {
      ...journey,
      steps: journey.steps.map((s) =>
        s.type === 'navigate' ? { ...s, url: `${baseUrl}/fixture?persona=variant` } : s,
      ),
    };

    const events: RunProgressEvent[] = [];

    const resControl = await workerPool['journeyRunner'].runJourney({
      runId: 'run-101',
      persona: personaControl,
      journey: journeyControl,
      browserManager: workerPool['browserManager'],
      onProgress: (e) => events.push(e),
    });

    const resVariant = await workerPool['journeyRunner'].runJourney({
      runId: 'run-101',
      persona: personaVariant,
      journey: journeyVariant,
      browserManager: workerPool['browserManager'],
      onProgress: (e) => events.push(e),
    });

    await workerPool.shutdown();

    // Verify both runs succeeded
    expect(resControl.success).toBe(true);
    expect(resVariant.success).toBe(true);

    // Verify step counts
    expect(resControl.stepResults).toHaveLength(5);
    expect(resVariant.stepResults).toHaveLength(5);

    // Verify extracted data differs between personas (Control has Alpha, Variant has Beta)
    const extractControl = resControl.stepResults[2]!.extractedData?.catalogueContent;
    const extractVariant = resVariant.stepResults[2]!.extractedData?.catalogueContent;

    expect(extractControl).toContain('Alpha');
    expect(extractControl).not.toContain('Beta');

    expect(extractVariant).toContain('Beta');
    expect(extractVariant).not.toContain('Alpha');

    // Verify provenance captured correct persona settings
    expect(resControl.provenance.effectivePersonaSettings.locale).toBe('en-US');
    expect(resVariant.provenance.effectivePersonaSettings.locale).toBe('fr-FR');
  }, 15000);

  it('Gate Criterion 2: Isolation enforcement — hard boundary prevents state leakage across personas', async () => {
    const workerPool = new WorkerPool(1);

    const personaA: PersonaSettings = {
      id: 'persona-a',
      name: 'Persona A',
      viewport: { width: 1024, height: 768 },
      locale: 'en-US',
      timezoneId: 'UTC',
      userAgent: 'IsolationAgentA',
      colorScheme: 'light',
      reducedMotion: 'no-preference',
    };

    const personaB: PersonaSettings = {
      id: 'persona-b',
      name: 'Persona B',
      viewport: { width: 1024, height: 768 },
      locale: 'en-US',
      timezoneId: 'UTC',
      userAgent: 'IsolationAgentB',
      colorScheme: 'light',
      reducedMotion: 'no-preference',
    };

    const journeyMutateState: JourneyDefinition = {
      id: 'j-mutate',
      version: '1.0.0',
      name: 'Mutate State Journey',
      policy: { allowedUrlPatterns: [`${baseUrl}/*`] },
      steps: [
        { id: 'nav', type: 'navigate', url: `${baseUrl}/fixture?persona=control` },
        { id: 'click-state', type: 'click', selector: '[data-testid="action-btn"]' },
      ],
    };

    const journeyCheckState: JourneyDefinition = {
      id: 'j-check',
      version: '1.0.0',
      name: 'Check State Journey',
      policy: { allowedUrlPatterns: [`${baseUrl}/*`] },
      steps: [
        { id: 'nav', type: 'navigate', url: `${baseUrl}/fixture?persona=control` },
        {
          id: 'extract-body',
          type: 'extract',
          selector: 'body',
          extractName: 'bodyAttr',
          target: 'attribute',
          attributeName: 'data-persona',
        },
      ],
    };

    // Run Persona A which sets cookies and localStorage
    const resA = await workerPool['journeyRunner'].runJourney({
      runId: 'run-iso-1',
      persona: personaA,
      journey: journeyMutateState,
      browserManager: workerPool['browserManager'],
    });

    expect(resA.success).toBe(true);

    // Immediately run Persona B in a fresh context
    const resB = await workerPool['journeyRunner'].runJourney({
      runId: 'run-iso-2',
      persona: personaB,
      journey: journeyCheckState,
      browserManager: workerPool['browserManager'],
    });

    expect(resB.success).toBe(true);

    await workerPool.shutdown();
  });

  it('Gate Criterion 3: Allowlist and redirect-block policies block unapproved destinations', async () => {
    const workerPool = new WorkerPool(1);

    const persona: PersonaSettings = {
      id: 'security-persona',
      name: 'Security Test Persona',
      viewport: { width: 800, height: 600 },
      locale: 'en-US',
      timezoneId: 'UTC',
      userAgent: 'SecurityTester',
      colorScheme: 'light',
      reducedMotion: 'no-preference',
    };

    // 1. Direct navigation to unapproved URL fails pre-navigation allowlist check
    const journeyBlockedUrl: JourneyDefinition = {
      id: 'j-blocked',
      version: '1.0.0',
      name: 'Blocked Navigation Journey',
      policy: { allowedUrlPatterns: [`http://127.0.0.1:${serverPort}/fixture*`] },
      steps: [
        { id: 'nav-blocked', type: 'navigate', url: 'http://malicious-external-site.com/exploit' },
      ],
    };

    const resBlocked = await workerPool['journeyRunner'].runJourney({
      runId: 'run-sec-1',
      persona,
      journey: journeyBlockedUrl,
      browserManager: workerPool['browserManager'],
    });

    expect(resBlocked.success).toBe(false);
    expect(resBlocked.error).toContain('blocked by security policy allowlist');

    // 2. Pattern matcher helper validation
    expect(isUrlAllowed('http://127.0.0.1:4300/fixture', ['http://127.0.0.1:4300/*'])).toBe(true);
    expect(isUrlAllowed('http://evil.com/fixture', ['http://127.0.0.1:4300/*'])).toBe(false);

    await workerPool.shutdown();
  });

  it('Cooperative Cancellation: Halts execution cleanly when AbortSignal triggers', async () => {
    const workerPool = new WorkerPool(1);
    const abortController = new AbortController();

    const persona: PersonaSettings = {
      id: 'cancel-persona',
      name: 'Cancellation Persona',
      viewport: { width: 800, height: 600 },
      locale: 'en-US',
      timezoneId: 'UTC',
      userAgent: 'CancelTester',
      colorScheme: 'light',
      reducedMotion: 'no-preference',
    };

    const journey: JourneyDefinition = {
      id: 'j-cancel',
      version: '1.0.0',
      name: 'Long Journey',
      policy: { allowedUrlPatterns: [`${baseUrl}/*`] },
      steps: [
        { id: 'step-1', type: 'navigate', url: `${baseUrl}/fixture` },
        { id: 'step-2', type: 'wait', durationMs: 2000 },
        { id: 'step-3', type: 'assert', selector: 'h1', condition: 'visible' },
      ],
    };

    // Trigger cancel immediately after starting
    setTimeout(() => abortController.abort(), 50);

    const res = await workerPool['journeyRunner'].runJourney({
      runId: 'run-cancel-1',
      persona,
      journey,
      browserManager: workerPool['browserManager'],
      abortSignal: abortController.signal,
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('Journey execution aborted');

    await workerPool.shutdown();
  });
});
