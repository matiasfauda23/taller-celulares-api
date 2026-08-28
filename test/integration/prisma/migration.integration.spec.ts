import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { query, resetPublicSchema, runPrisma } from '../setup/postgres.setup';

describe('project migrations', () => {
  beforeAll(async () => {
    await resetPublicSchema();
  });

  it('deploys the only migration from empty and is idempotent', async () => {
    const migrations = readdirSync(
      join(process.cwd(), 'prisma/migrations'),
    ).filter((name) => name.endsWith('_authentication'));
    expect(migrations).toHaveLength(1);

    expect(runPrisma('migrate', 'deploy')).toContain('applied');
    expect(runPrisma('migrate', 'deploy')).toContain('No pending migrations');
    expect(runPrisma('migrate', 'status')).toContain(
      'Database schema is up to date',
    );
    expect(() => runPrisma('generate')).not.toThrow();

    const tables = await query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'
       ORDER BY table_name`,
    );
    expect(tables.map(({ table_name }) => table_name)).toEqual([
      'Account',
      'Client',
      'Device',
      'RefreshCredential',
      'Session',
      'WorkOrder',
      'Workshop',
    ]);
  }, 30_000);

  it('contains the approved constraints without raw refresh storage', async () => {
    const columns = await query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'RefreshCredential'`,
    );
    expect(columns.map(({ column_name }) => column_name)).toEqual(
      expect.arrayContaining(['tokenHash', 'successorId', 'sessionId']),
    );
    expect(columns.map(({ column_name }) => column_name)).not.toEqual(
      expect.arrayContaining(['token', 'refreshToken']),
    );

    const migrationDirectory = readdirSync(
      join(process.cwd(), 'prisma/migrations'),
    ).find((name) => name.endsWith('_authentication'));
    expect(migrationDirectory).toBeDefined();
    if (!migrationDirectory)
      throw new Error('authentication migration not found');
    const sql = readFileSync(
      join(
        process.cwd(),
        'prisma/migrations',
        migrationDirectory,
        'migration.sql',
      ),
      'utf8',
    );
    expect(sql).toContain('ON DELETE RESTRICT');
    expect(sql).toContain('RefreshCredential_tokenHash_key');
    expect(sql).toContain('RefreshCredential_successorId_key');
    expect(sql).toContain('RefreshCredential_sessionId_status_idx');
    expect(sql).toContain('SessionRevocationReason');
    expect(sql).toContain('RefreshCredentialStatus');
    expect(sql).not.toContain('db push');
  });
});
