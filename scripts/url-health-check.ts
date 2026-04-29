#!/usr/bin/env bun
/**
 * C2: URL health check for solace-grounding/solace-canonical-sources.md
 *
 * Fetches every URL in the canonical sources index and reports status:
 *   200     — healthy
 *   301/302 — redirect (update the URL)
 *   404     — broken (search docs.solace.com for the page name)
 *   timeout — flag for manual review
 *
 * Usage:
 *   bun run scripts/url-health-check.ts           # check all URLs
 *   bun run scripts/url-health-check.ts --verbose  # show all results including healthy
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(import.meta.dir, '..');
const CANONICAL_SOURCES = path.join(ROOT, 'solace-grounding', 'solace-canonical-sources.md');
const VERBOSE = process.argv.includes('--verbose');
const TIMEOUT_MS = 10_000;

interface UrlResult {
  url: string;
  status: number | 'timeout' | 'error';
  redirect?: string;
  error?: string;
}

function extractUrls(content: string): string[] {
  const urlRegex = /`(https?:\/\/[^`\s]+)`/g;
  const urls: string[] = [];
  let match;
  while ((match = urlRegex.exec(content)) !== null) {
    urls.push(match[1]);
  }
  return [...new Set(urls)];
}

async function checkUrl(url: string): Promise<UrlResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'manual',
    });

    clearTimeout(timeout);

    if (response.status >= 300 && response.status < 400) {
      return {
        url,
        status: response.status,
        redirect: response.headers.get('location') ?? undefined,
      };
    }

    if (!response.ok) {
      // Retry with GET for servers that don't support HEAD
      const getResponse = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: 'manual',
      });

      if (getResponse.status >= 300 && getResponse.status < 400) {
        return {
          url,
          status: getResponse.status,
          redirect: getResponse.headers.get('location') ?? undefined,
        };
      }

      return { url, status: getResponse.status };
    }

    return { url, status: response.status };
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      return { url, status: 'timeout' };
    }
    return { url, status: 'error', error: err.message };
  }
}

async function main() {
  if (!fs.existsSync(CANONICAL_SOURCES)) {
    console.error(`Not found: ${CANONICAL_SOURCES}`);
    process.exit(1);
  }

  const content = fs.readFileSync(CANONICAL_SOURCES, 'utf-8');
  const urls = extractUrls(content);
  console.log(`Checking ${urls.length} URLs from solace-canonical-sources.md...\n`);

  const concurrency = 5;
  const results: UrlResult[] = [];

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(checkUrl));
    results.push(...batchResults);
  }

  const healthy = results.filter(r => r.status === 200);
  const redirects = results.filter(r => typeof r.status === 'number' && r.status >= 300 && r.status < 400);
  const broken = results.filter(r => r.status === 404);
  const errors = results.filter(r => r.status === 'error' || r.status === 'timeout');
  const other = results.filter(r =>
    typeof r.status === 'number' && r.status !== 200 && r.status !== 404 &&
    !(r.status >= 300 && r.status < 400)
  );

  if (VERBOSE && healthy.length > 0) {
    console.log(`  Healthy (${healthy.length}):`);
    for (const r of healthy) {
      console.log(`  200 ${r.url}`);
    }
    console.log('');
  }

  if (redirects.length > 0) {
    console.log(`  Redirects (${redirects.length}) — update these URLs:`);
    for (const r of redirects) {
      console.log(`  ${r.status} ${r.url}`);
      if (r.redirect) console.log(`      -> ${r.redirect}`);
    }
    console.log('');
  }

  if (broken.length > 0) {
    console.log(`  Broken (${broken.length}) — search docs.solace.com for the page name:`);
    for (const r of broken) {
      console.log(`  404 ${r.url}`);
    }
    console.log('');
  }

  if (errors.length > 0) {
    console.log(`  Errors/Timeouts (${errors.length}) — manual review needed:`);
    for (const r of errors) {
      console.log(`  ${r.status} ${r.url}${r.error ? ` (${r.error})` : ''}`);
    }
    console.log('');
  }

  if (other.length > 0) {
    console.log(`  Other (${other.length}):`);
    for (const r of other) {
      console.log(`  ${r.status} ${r.url}`);
    }
    console.log('');
  }

  console.log('Summary');
  console.log('═'.repeat(40));
  console.log(`  Healthy:    ${healthy.length}`);
  console.log(`  Redirects:  ${redirects.length}`);
  console.log(`  Broken:     ${broken.length}`);
  console.log(`  Errors:     ${errors.length}`);
  console.log(`  Other:      ${other.length}`);
  console.log(`  Total:      ${results.length}`);

  if (broken.length > 0 || errors.length > 0) {
    process.exit(1);
  }
}

main();
