import { createHash } from 'node:crypto';
import type { RunManifestPayload, StepEvidencePayload } from '@ai-parallel-web/contracts';

export class ManifestGenerator {
  public static generateManifest(runId: string, steps: StepEvidencePayload[]): RunManifestPayload {
    const sortedSteps = [...steps].sort((a, b) => a.stepIndex - b.stepIndex);
    const totalSteps = sortedSteps.length;
    const completedSteps = sortedSteps.filter(
      (s) => s.overallEvidenceState !== 'MISSING_FAILURE'
    ).length;
    const completenessPercentage =
      totalSteps > 0 ? Number(((completedSteps / totalSteps) * 100).toFixed(2)) : 0;

    const stepChecksums = sortedSteps.map((step) => {
      const stepContentString = JSON.stringify({
        stepIndex: step.stepIndex,
        stepId: step.stepId,
        personaId: step.personaId,
        finalUrl: step.finalUrl,
        httpStatus: step.httpOutcome.statusCode,
        artifacts: step.artifacts.map((a) => a.sha256).sort(),
      });

      const sha256 = createHash('sha256').update(stepContentString).digest('hex');

      return {
        stepIndex: step.stepIndex,
        stepId: step.stepId,
        personaId: step.personaId,
        overallState: step.overallEvidenceState,
        sha256,
      };
    });

    const manifestDataToHash = JSON.stringify({
      runId,
      totalSteps,
      completedSteps,
      completenessPercentage,
      stepChecksums,
    });

    const manifestSha256 = createHash('sha256').update(manifestDataToHash).digest('hex');

    return {
      schemaVersion: 'v1',
      runId,
      totalSteps,
      completedSteps,
      completenessPercentage,
      stepChecksums,
      manifestSha256,
      generatedAtUtc: new Date().toISOString(),
    };
  }
}
