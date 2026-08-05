import type { RedactionAuditRecord } from '@ai-parallel-web/contracts';

export interface RedactionConfig {
  sensitiveQueryParamKeys: string[];
  sensitiveHeaderKeys: string[];
  sensitiveCssSelectors: string[];
  customRegexPatterns: RegExp[];
}

export const DEFAULT_REDACTION_CONFIG: RedactionConfig = {
  sensitiveQueryParamKeys: [
    'token',
    'access_token',
    'auth',
    'api_key',
    'apikey',
    'secret',
    'session',
    'password',
    'pwd',
    'ssn',
    'cvv',
    'credit_card',
  ],
  sensitiveHeaderKeys: [
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'proxy-authorization',
  ],
  sensitiveCssSelectors: [
    'input[type="password"]',
    'input[name*="password" i]',
    'input[name*="card" i]',
    'input[name*="ssn" i]',
    '.sensitive-data',
    '[data-sensitive="true"]',
  ],
  customRegexPatterns: [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, // Email regex
    /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/g, // Credit Card regex
    /\b\d{3}-\d{2}-\d{4}\b/g, // US SSN regex
  ],
};

export class RedactionEngine {
  constructor(private config: RedactionConfig = DEFAULT_REDACTION_CONFIG) {}

  /**
   * Redacts sensitive query parameters from URLs
   */
  public redactUrl(rawUrl: string): { sanitizedUrl: string; audits: RedactionAuditRecord[] } {
    const audits: RedactionAuditRecord[] = [];
    try {
      const urlObj = new URL(rawUrl);
      let matches = 0;

      for (const paramKey of Array.from(urlObj.searchParams.keys())) {
        const lowerKey = paramKey.toLowerCase();
        if (this.config.sensitiveQueryParamKeys.includes(lowerKey)) {
          urlObj.searchParams.set(paramKey, '[REDACTED_QUERY_PARAM]');
          matches++;
        }
      }

      if (matches > 0) {
        audits.push({
          target: 'url_param',
          identifier: 'sensitive_query_params',
          matchesFound: matches,
          actionTaken: 'MASKED_QUERY_PARAM',
        });
      }

      return { sanitizedUrl: urlObj.toString(), audits };
    } catch {
      return { sanitizedUrl: rawUrl, audits };
    }
  }

  /**
   * Redacts headers
   */
  public redactHeaders(headers: Record<string, string>): {
    sanitizedHeaders: Record<string, string>;
    audits: RedactionAuditRecord[];
  } {
    const sanitized: Record<string, string> = {};
    const audits: RedactionAuditRecord[] = [];
    let count = 0;

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (this.config.sensitiveHeaderKeys.includes(lowerKey)) {
        sanitized[key] = '[REDACTED_HEADER]';
        count++;
      } else {
        sanitized[key] = value;
      }
    }

    if (count > 0) {
      audits.push({
        target: 'header',
        identifier: 'sensitive_http_headers',
        matchesFound: count,
        actionTaken: 'REDACTED_TEXT',
      });
    }

    return { sanitizedHeaders: sanitized, audits };
  }

  /**
   * Sanitizes DOM text / HTML content before storing
   */
  public sanitizeDomContent(htmlContent: string): {
    sanitizedHtml: string;
    audits: RedactionAuditRecord[];
  } {
    let content = htmlContent;
    const audits: RedactionAuditRecord[] = [];

    // 1. Redact Regex Patterns
    for (const pattern of this.config.customRegexPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        content = content.replace(pattern, '[REDACTED_PATTERN]');
        audits.push({
          target: 'regex_pattern',
          identifier: pattern.source,
          matchesFound: matches.length,
          actionTaken: 'REDACTED_TEXT',
        });
      }
    }

    // 2. Redact sensitive input values / text based on sensitive attributes
    const inputValRegex = /<input[^>]*value=["']([^"']+)["'][^>]*>/gi;
    let inputMatch: RegExpExecArray | null;
    let inputCount = 0;
    while ((inputMatch = inputValRegex.exec(htmlContent)) !== null) {
      const fullInputTag = inputMatch[0];
      const val = inputMatch[1];
      if (
        val &&
        (fullInputTag.toLowerCase().includes('password') ||
          fullInputTag.toLowerCase().includes('card') ||
          fullInputTag.toLowerCase().includes('ssn'))
      ) {
        const redactedTag = fullInputTag.replace(val, '[REDACTED_SENSITIVE_INPUT]');
        content = content.replace(fullInputTag, redactedTag);
        inputCount++;
      }
    }

    if (inputCount > 0) {
      audits.push({
        target: 'dom_selector',
        identifier: 'sensitive_input_fields',
        matchesFound: inputCount,
        actionTaken: 'REMOVED_ATTRIBUTE',
      });
    }

    return { sanitizedHtml: content, audits };
  }
}
