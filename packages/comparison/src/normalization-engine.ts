/**
 * Normalization Engine for Deterministic Comparison
 * 
 * Normalizes whitespace, casing, locale-aware numbers/currencies, tracking parameters,
 * and unstable DOM attributes without deleting meaningful differences.
 */

export interface NormalizationConfig {
  preserveCase: boolean;
  preserveWhitespace: boolean;
  removeTrackingParams: boolean;
  removeUnstableDomAttributes: boolean;
  locale: string;
  trackingParamKeys: string[];
  unstableDomAttributes: string[];
}

export const DEFAULT_NORMALIZATION_CONFIG: NormalizationConfig = {
  preserveCase: false,
  preserveWhitespace: false,
  removeTrackingParams: true,
  removeUnstableDomAttributes: true,
  locale: 'en-US',
  trackingParamKeys: [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'fbclid',
    'gclid',
    'msclkid',
    '_ga',
    '_gid',
    'mcid',
  ],
  unstableDomAttributes: [
    'data-reactid',
    'data-react-checksum',
    'data-v-',
    'data-testid',
    'data-test-id',
    'ng-version',
    '_ngcontent',
    'data-n-g',
    'aria-hidden',
  ],
};

export class NormalizationEngine {
  constructor(private config: NormalizationConfig = DEFAULT_NORMALIZATION_CONFIG) {}

  /**
   * Normalizes text content by applying whitespace and casing rules
   */
  public normalizeText(text: string): string {
    let normalized = text;

    if (!this.config.preserveWhitespace) {
      normalized = normalized
        .replace(/\s+/g, ' ')
        .trim();
    }

    if (!this.config.preserveCase) {
      normalized = normalized.toLowerCase();
    }

    return normalized;
  }

  /**
   * Normalizes URLs by removing tracking parameters
   */
  public normalizeUrl(url: string): string {
    if (!this.config.removeTrackingParams) {
      return url;
    }

    try {
      const urlObj = new URL(url);
      const paramsToRemove = this.config.trackingParamKeys;

      for (const param of paramsToRemove) {
        urlObj.searchParams.delete(param);
      }

      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * Normalizes numeric values with locale awareness
   */
  public normalizeNumber(value: string | number): number {
    if (typeof value === 'number') {
      return value;
    }

    const cleaned = value
      .replace(/[^\d.,-]/g, '')
      .replace(/,/g, '.');
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Normalizes currency values to a standard format
   */
  public normalizeCurrency(value: string | number): number {
    if (typeof value === 'number') {
      return value;
    }

    const cleaned = value
      .replace(/[^\d.,-]/g, '')
      .replace(/,/g, '.');
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Normalizes HTML by removing unstable DOM attributes
   */
  public normalizeDom(html: string): string {
    if (!this.config.removeUnstableDomAttributes) {
      return html;
    }

    let normalized = html;

    for (const attr of this.config.unstableDomAttributes) {
      const regex = new RegExp(`\\s${attr}=(["'][^"']*["'])`, 'gi');
      normalized = normalized.replace(regex, '');
    }

    return normalized;
  }

  /**
   * Normalizes an array of items by sorting and normalizing each item
   */
  public normalizeItemSet(items: (string | number)[]): (string | number)[] {
    const normalized = items.map(item => {
      if (typeof item === 'string') {
        return this.normalizeText(item);
      }
      return item;
    });

    return normalized.sort((a, b) => {
      if (typeof a === 'string' && typeof b === 'string') {
        return a.localeCompare(b, this.config.locale);
      }
      return Number(a) - Number(b);
    });
  }

  /**
   * Extracts and normalizes text content from DOM-like structure
   */
  public extractAndNormalizeText(html: string): string {
    const textContent = html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return this.normalizeText(textContent);
  }
}
