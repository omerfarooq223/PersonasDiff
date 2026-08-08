import { chromium, type Browser, type BrowserContext } from 'playwright';
import type { PersonaSettings, ProvenanceMetadata } from '@ai-parallel-web/contracts';

export class BrowserManager {
  private browserInstance: Browser | null = null;

  async getBrowser(): Promise<Browser> {
    if (!this.browserInstance || !this.browserInstance.isConnected()) {
      this.browserInstance = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-extensions',
          '--disable-sync',
          '--disable-translate',
        ],
      });
    }
    return this.browserInstance;
  }

  async createIsolatedContext(persona: PersonaSettings): Promise<BrowserContext> {
    const browser = await this.getBrowser();

    const options: Parameters<typeof browser.newContext>[0] = {
      viewport: persona.viewport,
      locale: persona.locale,
      timezoneId: persona.timezoneId,
      userAgent: persona.userAgent,
      colorScheme: persona.colorScheme,
      reducedMotion: persona.reducedMotion,
      ...(persona.geolocation && {
        geolocation: {
          latitude: persona.geolocation.latitude,
          longitude: persona.geolocation.longitude,
          ...(persona.geolocation.accuracy !== undefined && {
            accuracy: persona.geolocation.accuracy,
          }),
        },
      }),
      ...(persona.permissions && { permissions: persona.permissions }),
      ...(persona.extraHttpHeaders && { extraHTTPHeaders: persona.extraHttpHeaders }),
      acceptDownloads: false,
      ignoreHTTPSErrors: false,
    };

    const context = await browser.newContext(options);

    if (persona.geolocation) {
      await context.grantPermissions(persona.permissions ?? ['geolocation']);
    }

    return context;
  }

  async disposeContext(context: BrowserContext | null | undefined): Promise<void> {
    if (!context) return;
    try {
      await context.clearCookies();
      await context.close();
    } catch {
      // Ignore context close error
    }
  }

  async getProvenance(
    persona: PersonaSettings,
    workerId = 'worker-1',
  ): Promise<ProvenanceMetadata> {
    const browser = await this.getBrowser();
    return {
      browserName: 'chromium',
      browserVersion: browser.version(),
      playwrightVersion: '1.50.0',
      nodeVersion: process.version,
      workerId,
      effectivePersonaSettings: persona,
      timestampUtc: new Date().toISOString(),
    };
  }

  async closeBrowser(): Promise<void> {
    if (this.browserInstance) {
      try {
        await this.browserInstance.close();
      } catch {
        // Ignore close error
      } finally {
        this.browserInstance = null;
      }
    }
  }
}
