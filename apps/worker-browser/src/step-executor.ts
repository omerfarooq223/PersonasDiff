import type { Page } from 'playwright';
import type {
  StepDSLAction,
  StepResult,
  PolicyConfig,
  AssertionResult,
} from '@ai-parallel-web/contracts';
import { validateUrlAgainstPolicy } from './policy-enforcer.js';

export class StepExecutor {
  async executeStep(
    page: Page,
    step: StepDSLAction,
    stepIndex: number,
    policy: PolicyConfig,
    defaultTimeoutMs = 15000,
  ): Promise<StepResult> {
    const startTime = Date.now();
    const timeout = step.timeoutMs ?? defaultTimeoutMs;

    try {
      let screenshotBuffer: Buffer | undefined;
      let extractedData: Record<string, string> | undefined;
      let assertionResult: AssertionResult | undefined;

      switch (step.type) {
        case 'navigate': {
          validateUrlAgainstPolicy(step.url, policy);
          const response = await page.goto(step.url, {
            timeout,
            waitUntil: step.waitUntil ?? 'domcontentloaded',
          });

          const finalUrl = page.url();
          validateUrlAgainstPolicy(finalUrl, policy);

          if (response && response.status() >= 400) {
            throw new Error(
              `HTTP navigation failed with status ${response.status()} for URL: ${finalUrl}`,
            );
          }
          break;
        }

        case 'wait': {
          if (step.selector) {
            await page.waitForSelector(step.selector, {
              state: step.state ?? 'visible',
              timeout,
            });
          } else if (step.durationMs) {
            await page.waitForTimeout(step.durationMs);
          }
          break;
        }

        case 'click': {
          await page.waitForSelector(step.selector, { state: 'visible', timeout });
          await page.click(step.selector, { timeout, force: step.force ?? false });
          break;
        }

        case 'type': {
          await page.waitForSelector(step.selector, { state: 'visible', timeout });
          if (step.clearFirst) {
            await page.fill(step.selector, '');
          }
          await page.type(step.selector, step.value, { delay: step.delayMs ?? 0 });
          break;
        }

        case 'extract': {
          await page.waitForSelector(step.selector, { state: 'attached', timeout });
          let extractedValue = '';

          if (step.target === 'attribute' && step.attributeName) {
            extractedValue = (await page.getAttribute(step.selector, step.attributeName)) ?? '';
          } else if (step.target === 'html') {
            extractedValue = await page.innerHTML(step.selector);
          } else {
            extractedValue = (await page.textContent(step.selector)) ?? '';
          }

          extractedData = {
            [step.extractName]: extractedValue.trim(),
          };
          break;
        }

        case 'screenshot': {
          screenshotBuffer = await page.screenshot({
            fullPage: step.fullPage ?? false,
            type: 'png',
          });
          break;
        }

        case 'assert': {
          await page.waitForSelector(step.selector, { state: 'attached', timeout });
          const actualText = (await page.textContent(step.selector))?.trim() ?? '';

          let passed = false;
          const expected = step.expectedValue ?? '';

          switch (step.condition) {
            case 'equals':
              passed = actualText === expected;
              break;
            case 'contains':
              passed = actualText.includes(expected);
              break;
            case 'visible':
              passed = await page.isVisible(step.selector);
              break;
            case 'matches':
              passed = new RegExp(expected).test(actualText);
              break;
          }

          const errMessage = passed
            ? undefined
            : `Assertion failed: expected '${expected}', got '${actualText}' (condition: ${step.condition})`;

          assertionResult = {
            passed,
            condition: step.condition,
            actualValue: actualText,
            expectedValue: expected,
            ...(errMessage !== undefined && { error: errMessage }),
          };

          if (!passed) {
            throw new Error(assertionResult.error);
          }
          break;
        }

        default:
          throw new Error(`Unsupported DSL step type: ${(step as StepDSLAction).type}`);
      }

      return {
        stepId: step.id,
        stepIndex,
        actionType: step.type,
        success: true,
        durationMs: Date.now() - startTime,
        finalUrl: page.url(),
        ...(screenshotBuffer !== undefined && { screenshotBuffer }),
        ...(extractedData !== undefined && { extractedData }),
        ...(assertionResult !== undefined && { assertionResult }),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        stepId: step.id,
        stepIndex,
        actionType: step.type,
        success: false,
        durationMs: Date.now() - startTime,
        finalUrl: page.url(),
        error: {
          message,
          code: (err as { code?: string })?.code ?? 'STEP_EXECUTION_ERROR',
          retryable: !message.includes('POLICY_VIOLATION') && !message.includes('Assertion failed'),
        },
      };
    }
  }
}
