import { execFileSync } from 'node:child_process';
import { Client } from 'pg';

export function isolatedDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required for integration tests');
  const parsed = new URL(url);
  if (parsed.pathname !== '/taller_auth_test') {
    throw new Error(
      'Integration tests require the isolated taller_auth_test database',
    );
  }
  return url;
}

export function runPrisma(...args: string[]): string {
  return execFileSync('pnpm', ['exec', 'prisma', ...args], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: isolatedDatabaseUrl() },
    encoding: 'utf8',
  });
}

export async function resetPublicSchema(): Promise<void> {
  const client = new Client({ connectionString: isolatedDatabaseUrl() });
  await client.connect();
  try {
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
  } finally {
    await client.end();
  }
}

export async function query<T extends Record<string, unknown>>(
  text: string,
): Promise<T[]> {
  const client = new Client({ connectionString: isolatedDatabaseUrl() });
  await client.connect();
  try {
    return (await client.query<T>(text)).rows;
  } finally {
    await client.end();
  }
}
