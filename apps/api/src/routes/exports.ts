import {
  createExportRecord,
  findRunById,
  getExportById,
  getStepEvidenceByRun,
  insertAuditEvent,
  updateExportStatus,
} from '@ai-parallel-web/db';
import { ExportBuilder } from '@ai-parallel-web/domain';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { buildProblem, requireAuth } from '../auth.js';
import type { AppDependencies } from '../dependencies.js';

export function registerExportRoutes(app: FastifyInstance, deps: AppDependencies): void {
  const exportBuilder = new ExportBuilder();

  // POST /api/v1/runs/:id/exports
  app.post(
    '/api/v1/runs/:id/exports',
    async (request: FastifyRequest<{ Params: { id: string }; Body: { format?: 'json' | 'csv' } }>, reply: FastifyReply) => {
      const user = requireAuth(request, reply);
      if (!user) return;
      if (!deps.db) {
        return reply.status(503).send(
          buildProblem({
            title: 'Service Unavailable',
            detail: 'Database is not connected.',
            requestId: request.id,
            status: 503,
            type: 'service_unavailable',
          })
        );
      }

      const runId = request.params.id;
      const format = request.body?.format ?? 'json';

      const run = await findRunById(deps.db, user.tenantId, runId);
      if (!run) {
        return reply.status(404).send(
          buildProblem({
            title: 'Not Found',
            detail: `Run with ID ${runId} was not found.`,
            requestId: request.id,
            status: 404,
            type: 'not_found',
          })
        );
      }

      // Create Export Record in DB
      const exportRecord = await createExportRecord(deps.db, {
        runId,
        tenantId: user.tenantId,
        format,
        schemaVersion: ExportBuilder.SCHEMA_VERSION,
      });

      // Gather evidence and build export content
      const stepEvidences = await getStepEvidenceByRun(deps.db, runId);
      const steps = stepEvidences.map((e) => ({
        stepIndex: e.stepIndex,
        stepId: e.stepId,
        actionType: 'navigate',
        status: e.overallEvidenceState,
        finalUrl: e.finalUrl,
        durationMs: Number(e.monotonicDurationNs) / 1000000,
        diffScore: 0,
        payload: e.extractionPayload ?? {},
      }));

      const exportBundle = exportBuilder.buildExportBundle(
        {
          id: run.id,
          tenantId: user.tenantId,
          status: run.status,
          createdAt: run.createdAt,
          completedAt: run.completedAt ?? null,
          ...(run.surfaceId ? { surfaceId: run.surfaceId } : {}),
          ...(run.journeyVersionId ? { journeyVersionId: run.journeyVersionId } : {}),
        },
        steps,
        []
      );

      const storageKey = `exports/${user.tenantId}/${exportRecord.id}/run_export.${format}`;
      const content = format === 'csv' ? exportBundle.csvContent : exportBundle.jsonContent;

      if (deps.storage) {
        await deps.storage.putObject({
          key: storageKey,
          body: content,
          contentType: format === 'csv' ? 'text/csv' : 'application/json',
          checksumSha256: format === 'csv' ? exportBundle.manifest.files[1]!.sha256 : exportBundle.manifest.files[0]!.sha256,
        });
      }

      const updated = await updateExportStatus(
        deps.db,
        exportRecord.id,
        'ready',
        storageKey,
        exportBundle.manifestHash,
        new Date(Date.now() + 7 * 86400 * 1000)
      );

      await insertAuditEvent(deps.db, {
        tenantId: user.tenantId,
        actorId: user.id,
        action: 'EXPORT_CREATED',
        resourceType: 'export',
        resourceId: exportRecord.id,
        requestId: request.id,
        correlationId: run.correlationId,
        outcome: 'success',
        metadata: { format, schemaVersion: ExportBuilder.SCHEMA_VERSION },
      });

      return reply.status(201).send({
        id: updated?.id ?? exportRecord.id,
        runId,
        format,
        schemaVersion: ExportBuilder.SCHEMA_VERSION,
        status: updated?.status ?? 'ready',
        manifestHash: exportBundle.manifestHash,
        createdAt: updated?.createdAt ?? exportRecord.createdAt,
      });
    }
  );

  // GET /api/v1/exports/:id/download
  app.get(
    '/api/v1/exports/:id/download',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = requireAuth(request, reply);
      if (!user) return;
      if (!deps.db) {
        return reply.status(503).send(
          buildProblem({
            title: 'Service Unavailable',
            detail: 'Database is not connected.',
            requestId: request.id,
            status: 503,
            type: 'service_unavailable',
          })
        );
      }

      const exportId = request.params.id;
      const exportRecord = await getExportById(deps.db, user.tenantId, exportId);

      if (!exportRecord) {
        return reply.status(404).send(
          buildProblem({
            title: 'Not Found',
            detail: `Export with ID ${exportId} was not found.`,
            requestId: request.id,
            status: 404,
            type: 'not_found',
          })
        );
      }

      if (exportRecord.status !== 'ready' || !exportRecord.storageKey) {
        return reply.status(400).send(
          buildProblem({
            title: 'Bad Request',
            detail: `Export with ID ${exportId} is not ready for download (status: ${exportRecord.status}).`,
            requestId: request.id,
            status: 400,
            type: 'bad_request',
          })
        );
      }

      let downloadUrl = `/api/v1/exports/${exportId}/raw`;
      if (deps.storage) {
        downloadUrl = await deps.storage.getSignedUrl(exportRecord.storageKey, {
          expiresInSeconds: 900,
        });
      }

      await insertAuditEvent(deps.db, {
        tenantId: user.tenantId,
        actorId: user.id,
        action: 'EXPORT_DOWNLOAD_LINK_GENERATED',
        resourceType: 'export',
        resourceId: exportRecord.id,
        requestId: request.id,
        correlationId: null,
        outcome: 'success',
        metadata: { format: exportRecord.format, storageKey: exportRecord.storageKey },
      });

      return reply.status(200).send({
        exportId: exportRecord.id,
        runId: exportRecord.runId,
        format: exportRecord.format,
        downloadUrl,
        expiresInSeconds: 900,
      });
    }
  );
}
