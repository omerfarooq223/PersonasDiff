import type pg from 'pg';

import { hashApiToken } from './crypto.js';
import { seedIds, seedTokens } from './types.js';

const fixtureJourneySteps = [
  { action: 'navigate', url: '/fixture?persona={persona}' },
  { action: 'wait', state: 'networkidle' },
  { action: 'screenshot', name: 'catalogue' },
  { action: 'extract', selector: '[data-testid=product-list]', type: 'text' },
];

const personaSettings = {
  control: {
    locale: 'en-US',
    persona: 'control',
    timezoneId: 'UTC',
    viewport: { height: 720, width: 1280 },
  },
  variant: {
    locale: 'en-US',
    persona: 'variant',
    timezoneId: 'UTC',
    viewport: { height: 720, width: 1280 },
  },
};

export async function seedDevelopmentData(pool: pg.Pool): Promise<void> {
  const existing = await pool.query('SELECT id FROM tenants WHERE id = $1', [seedIds.tenant]);
  if (existing.rowCount && existing.rowCount > 0) {
    return;
  }

  await pool.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [
    seedIds.tenant,
    'Default development tenant',
  ]);

  const users = [
    {
      email: 'admin@parallelweb.local',
      id: seedIds.adminUser,
      role: 'admin',
      token: seedTokens.admin,
    },
    {
      email: 'operator@parallelweb.local',
      id: seedIds.operatorUser,
      role: 'operator',
      token: seedTokens.operator,
    },
    {
      email: 'viewer@parallelweb.local',
      id: seedIds.viewerUser,
      role: 'viewer',
      token: seedTokens.viewer,
    },
  ] as const;

  for (const user of users) {
    await pool.query(
      `INSERT INTO users (id, tenant_id, email, role, api_token_hash)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, seedIds.tenant, user.email, user.role, hashApiToken(user.token)],
    );
  }

  await pool.query(
    `INSERT INTO surfaces (
      id, tenant_id, display_name, origin, allowed_path_prefixes,
      requests_per_minute, max_concurrent_contexts, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      seedIds.surface,
      seedIds.tenant,
      'Local deterministic fixture surface',
      'http://localhost:4300',
      JSON.stringify(['/fixture', '/robots.txt', '/health']),
      12,
      2,
      'approved',
    ],
  );

  await pool.query(
    `INSERT INTO journey_versions (
      id, tenant_id, surface_id, version_label, steps, content_hash
    ) VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      seedIds.journey,
      seedIds.tenant,
      seedIds.surface,
      'fixture-control-v1',
      JSON.stringify(fixtureJourneySteps),
      'fixture-journey-v1-hash',
    ],
  );

  const personas = [
    {
      hash: 'persona-control-v1',
      id: seedIds.personaControl,
      name: 'control',
      settings: personaSettings.control,
    },
    {
      hash: 'persona-variant-v1',
      id: seedIds.personaVariant,
      name: 'variant',
      settings: personaSettings.variant,
    },
  ] as const;

  for (const persona of personas) {
    await pool.query(
      `INSERT INTO persona_versions (id, tenant_id, name, settings, content_hash)
       VALUES ($1, $2, $3, $4, $5)`,
      [persona.id, seedIds.tenant, persona.name, JSON.stringify(persona.settings), persona.hash],
    );
  }
}
