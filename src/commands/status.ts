/**
 * Status command implementation
 * Displays CLI version, auth status, and concurrency
 */

import { promises as fs } from 'fs';
import path from 'path';
import packageJson from '../../package.json';
import { isAuthenticated } from '../utils/auth';
import { getConfig, getDataDir, validateConfig } from '../utils/config';
import { loadSettings } from '../utils/settings';

type AuthSource = 'env' | 'stored' | 'none';

interface QueueStatusResponse {
  success: boolean;
  jobsInQueue?: number;
  activeJobsInQueue?: number;
  waitingJobsInQueue?: number;
  maxConcurrency?: number;
  mostRecentSuccess?: string | null;
}

interface StatusResult {
  version: string;
  authenticated: boolean;
  authSource: AuthSource;
  concurrency?: {
    active: number;
    max: number;
  };
  error?: string;
}

interface LocalStatus {
  dataDirConfigured: boolean;
  dataDirPath?: string;
  dataDirExists: boolean;
  dataDirFileCount: number;
}

/**
 * Detect how the user is authenticated
 */
function getAuthSource(): AuthSource {
  if (process.env.FIRECRAWL_API_KEY) {
    return 'env';
  }
  const stored = loadSettings();
  if (stored?.apiKey) {
    return 'stored';
  }
  return 'none';
}

/**
 * Fetch queue status from API
 */
async function fetchQueueStatus(
  apiKey: string,
  apiUrl: string
): Promise<QueueStatusResponse> {
  const url = `${apiUrl.replace(/\/$/, '')}/v2/team/queue-status`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `HTTP ${response.status}: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Get full status information
 */
export async function getStatus(): Promise<StatusResult> {
  const authSource = getAuthSource();
  const result: StatusResult = {
    version: packageJson.version,
    authenticated: isAuthenticated(),
    authSource,
  };

  if (!result.authenticated) {
    return result;
  }

  try {
    const config = getConfig();
    const apiKey = config.apiKey;
    validateConfig(apiKey);

    const apiUrl = config.apiUrl;

    if (!apiKey || !apiUrl) {
      return result;
    }

    // Fetch queue status
    const queueStatus = await fetchQueueStatus(apiKey, apiUrl);

    if (queueStatus.success && queueStatus.maxConcurrency !== undefined) {
      result.concurrency = {
        active: queueStatus.activeJobsInQueue || 0,
        max: queueStatus.maxConcurrency,
      };
    }
  } catch (error: any) {
    result.error = error?.message || 'Failed to fetch status';
  }

  return result;
}

/**
 * Format number with thousand separators
 */
function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Check data directory status
 */
async function getLocalStatus(): Promise<LocalStatus> {
  const dataDir = getDataDir();

  if (!dataDir) {
    return {
      dataDirConfigured: false,
      dataDirExists: false,
      dataDirFileCount: 0,
    };
  }

  const resolvedDir = path.resolve(dataDir);
  let dataDirExists = false;
  let dataDirFileCount = 0;

  async function countFiles(dir: string): Promise<number> {
    let count = 0;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'scratchpad') {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        count += await countFiles(fullPath);
      } else if (entry.isFile()) {
        if (!entry.name.startsWith('.')) {
          count += 1;
        }
      }
    }
    return count;
  }

  try {
    const stat = await fs.stat(resolvedDir);
    if (stat.isDirectory()) {
      dataDirExists = true;
      dataDirFileCount = await countFiles(resolvedDir);
    }
  } catch {
    dataDirExists = false;
  }

  return {
    dataDirConfigured: true,
    dataDirPath: resolvedDir,
    dataDirExists,
    dataDirFileCount,
  };
}

/**
 * Display data directory status
 */
function printDataDirStatus(
  localStatus: LocalStatus,
  dim: string,
  reset: string
): void {
  if (!localStatus.dataDirConfigured) {
    console.log(
      `  ${dim}Data dir:${reset} not configured ${dim}- run 'firecrawl config' to set${reset}`
    );
  } else if (localStatus.dataDirExists) {
    console.log(
      `  ${dim}Data dir:${reset} ${localStatus.dataDirPath} ${dim}- ${formatNumber(localStatus.dataDirFileCount)} files${reset}`
    );
  } else {
    console.log(
      `  ${dim}Data dir:${reset} ${localStatus.dataDirPath} ${dim}- not yet created${reset}`
    );
  }
}

/**
 * Handle status command output
 */
export async function handleStatusCommand(): Promise<void> {
  const orange = '\x1b[38;5;208m';
  const reset = '\x1b[0m';
  const dim = '\x1b[2m';
  const bold = '\x1b[1m';
  const green = '\x1b[32m';
  const red = '\x1b[31m';

  const status = await getStatus();
  const localStatus = await getLocalStatus();

  // Header
  console.log('');
  console.log(
    `  ${orange}🔥 ${bold}firecrawl${reset} ${dim}cli${reset} ${dim}v${status.version}${reset}`
  );
  console.log('');

  // Auth status with source
  if (status.authenticated) {
    const sourceLabel =
      status.authSource === 'env'
        ? 'via environment variables'
        : 'via stored settings';
    console.log(`  ${green}●${reset} Configured ${dim}${sourceLabel}${reset}`);
  } else {
    console.log(`  ${red}●${reset} Not configured`);
    console.log(`  ${dim}Run 'firecrawl config' to configure${reset}`);
    console.log('');
    printDataDirStatus(localStatus, dim, reset);
    console.log('');
    return;
  }

  // Show error if API calls failed
  if (status.error) {
    console.log(
      `  ${dim}Could not fetch account info: ${status.error}${reset}`
    );
    console.log('');
    printDataDirStatus(localStatus, dim, reset);
    console.log('');
    return;
  }

  // Concurrency (parallel jobs limit)
  if (status.concurrency) {
    const { active, max } = status.concurrency;
    console.log(
      `  ${dim}Concurrency:${reset} ${active}/${max} jobs ${dim}(parallel scrape limit)${reset}`
    );
  }

  printDataDirStatus(localStatus, dim, reset);

  console.log('');
}
