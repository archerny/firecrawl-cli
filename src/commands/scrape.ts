/**
 * Scrape command implementation
 */

import type { FormatOption } from '@mendable/firecrawl-js';
import type {
  ScrapeOptions,
  ScrapeResult,
  ScrapeFormat,
  ScrapeLocation,
} from '../types/scrape';
import { getClient } from '../utils/client';
import { handleScrapeOutput, writeOutput } from '../utils/output';
import { getOrigin } from '../utils/url';
import { getDataDir } from '../utils/config';
import { getCliName } from '../utils/cli-name';
import { executeMap } from './map';
import { getStatus } from './status';

/**
 * Output timing information if requested
 */
function outputTiming(
  options: ScrapeOptions,
  requestStartTime: number,
  requestEndTime: number,
  error?: Error | unknown
): void {
  if (!options.timing) return;

  const requestDuration = requestEndTime - requestStartTime;
  const timingInfo: {
    url: string;
    requestTime: string;
    duration: string;
    status: 'success' | 'error';
    error?: string;
  } = {
    url: options.url,
    requestTime: new Date(requestStartTime).toISOString(),
    duration: `${requestDuration}ms`,
    status: error ? 'error' : 'success',
  };

  if (error) {
    timingInfo.error = error instanceof Error ? error.message : 'Unknown error';
  }

  console.error('Timing:', JSON.stringify(timingInfo, null, 2));
}

/**
 * Execute the scrape command
 */
export async function executeScrape(
  options: ScrapeOptions
): Promise<ScrapeResult> {
  // Get client instance (updates global config if apiKey/apiUrl provided)
  const app = getClient({ apiKey: options.apiKey, apiUrl: options.apiUrl });

  // Build scrape options
  const formats: FormatOption[] = [];

  // Add requested formats
  if (options.formats && options.formats.length > 0) {
    formats.push(...options.formats);
  }

  // Add screenshot format if requested and not already included
  if (options.fullPageScreenshot) {
    formats.push({ type: 'screenshot', fullPage: true });
  } else if (options.screenshot && !formats.includes('screenshot')) {
    formats.push('screenshot');
  }

  // Inject query format if --query was provided
  if (options.query) {
    formats.push({ type: 'query', prompt: options.query } as any);
  }

  // If no formats specified, default to markdown
  if (formats.length === 0) {
    formats.push('markdown');
  }

  const scrapeParams: Record<string, unknown> = {
    formats,
  };

  if (options.onlyMainContent !== undefined) {
    scrapeParams.onlyMainContent = options.onlyMainContent;
  }

  if (options.waitFor !== undefined) {
    scrapeParams.waitFor = options.waitFor;
  }

  if (options.includeTags && options.includeTags.length > 0) {
    scrapeParams.includeTags = options.includeTags;
  }

  if (options.excludeTags && options.excludeTags.length > 0) {
    scrapeParams.excludeTags = options.excludeTags;
  }

  if (options.maxAge !== undefined) {
    scrapeParams.maxAge = options.maxAge;
  }

  if (options.location) {
    scrapeParams.location = options.location;
  }

  // Execute scrape with timing - only wrap the scrape call in try-catch
  const requestStartTime = Date.now();

  try {
    const result = await app.scrape(options.url, scrapeParams);
    const requestEndTime = Date.now();
    outputTiming(options, requestStartTime, requestEndTime);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    const requestEndTime = Date.now();
    outputTiming(options, requestStartTime, requestEndTime, error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Handle scrape command output
 */
export async function handleScrapeCommand(
  options: ScrapeOptions
): Promise<void> {
  const result = await executeScrape(options);

  // Query mode: output answer directly
  if (options.query && result.success && result.data?.answer) {
    writeOutput(result.data.answer, options.output, !!options.output);
    return;
  }

  // Determine effective formats for output handling
  const effectiveFormats: ScrapeFormat[] =
    options.formats && options.formats.length > 0
      ? [...options.formats]
      : ['markdown'];

  // Add screenshot to effective formats if it was requested separately
  if (options.screenshot && !effectiveFormats.includes('screenshot')) {
    effectiveFormats.push('screenshot');
  }

  handleScrapeOutput(
    result,
    effectiveFormats,
    options.output,
    options.pretty,
    options.json
  );
}

/**
 * Generate a filename from a URL for saving to data directory
 */
export function urlToFilename(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const pathPart = parsed.pathname
      .replace(/^\/|\/$/g, '')
      .replace(/\//g, '-');
    if (!pathPart) return `${host}.md`;
    return `${host}-${pathPart}.md`;
  } catch {
    return url.replace(/[^a-zA-Z0-9.-]/g, '_') + '.md';
  }
}

/**
 * Handle scrape for multiple URLs.
 * Each result is saved as a separate file in the configured data directory.
 */
export async function handleMultiScrapeCommand(
  urls: string[],
  options: ScrapeOptions
): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');

  const dataDir = getDataDir();
  if (!dataDir) {
    throw new Error(
      `Data directory is required. Run "${getCliName()} config" to configure.`
    );
  }

  const dir = path.resolve(dataDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let completedCount = 0;
  let errorCount = 0;
  const total = urls.length;

  process.stderr.write(`Scraping ${total} URLs...\n`);

  const promises = urls.map(async (url) => {
    const scrapeOptions: ScrapeOptions = { ...options, url };
    const result = await executeScrape(scrapeOptions);

    const currentCount = ++completedCount;

    if (!result.success) {
      errorCount++;
      process.stderr.write(
        `[${currentCount}/${total}] Error: ${url} - ${result.error}\n`
      );
      return;
    }

    const filename = urlToFilename(url);
    const filepath = path.join(dir, filename);
    const content = result.data?.markdown || JSON.stringify(result.data);
    fs.writeFileSync(filepath, content, 'utf-8');

    process.stderr.write(`[${currentCount}/${total}] Saved: ${filepath}\n`);
  });

  await Promise.all(promises);

  process.stderr.write(
    `\nCompleted: ${completedCount - errorCount}/${total} succeeded`
  );
  if (errorCount > 0) {
    process.stderr.write(`, ${errorCount} failed`);
  }
  process.stderr.write('\n');

  if (errorCount === total) {
    process.exit(1);
  }
}

/**
 * Convert a URL path into a nested directory path with index.md.
 * e.g. https://docs.example.com/features/scrape → docs.example.com/features/scrape/index.md
 *      https://docs.example.com/ → docs.example.com/index.md
 */
export function urlToNestedPath(
  url: string,
  filename: string = 'index.md'
): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const pathPart = parsed.pathname.replace(/^\/|\/$/g, '');
    if (!pathPart) return `${host}/${filename}`;
    return `${host}/${pathPart}/${filename}`;
  } catch {
    return url.replace(/[^a-zA-Z0-9.-]/g, '_') + `/${filename}`;
  }
}

/**
 * Map an entire site and scrape all discovered URLs.
 * Organizes results into nested directories based on URL paths.
 */
interface AllScrapeOptions {
  limit?: number;
  yes?: boolean;
  search?: string;
  includePaths?: string[];
  excludePaths?: string[];
  allowSubdomains?: boolean;
}

/**
 * Extract top-level path segments from URLs and return them with counts, sorted by frequency.
 */
export function getTopPaths(urls: string[]): { path: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const url of urls) {
    try {
      const parts = new URL(url).pathname.replace(/^\//, '').split('/');
      if (parts[0]) {
        const segment = '/' + parts[0];
        counts.set(segment, (counts.get(segment) || 0) + 1);
      }
    } catch {
      // skip
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([p, count]) => ({ path: p, count }));
}

export async function handleAllScrapeCommand(
  siteUrl: string,
  options: ScrapeOptions,
  allOptions: AllScrapeOptions = {}
): Promise<void> {
  let { limit, yes, search, includePaths, excludePaths, allowSubdomains } =
    allOptions;
  const fs = await import('fs');
  const path = await import('path');

  // Map from origin so non-root URLs (e.g. pasted subpage) work reliably
  const mapUrl = getOrigin(siteUrl);
  process.stderr.write(`Mapping ${mapUrl}...\n`);

  const mapResult = await executeMap({
    urlOrJobId: mapUrl,
    apiKey: options.apiKey,
    apiUrl: options.apiUrl,
    search,
    includeSubdomains: allowSubdomains,
  });

  if (!mapResult.success || !mapResult.data) {
    console.error('Error mapping site:', mapResult.error);
    process.exit(1);
  }

  const totalFound = mapResult.data.links.length;
  let urls = mapResult.data.links.map((link) => link.url);

  if (urls.length === 0) {
    console.error('No URLs found on site.');
    process.exit(1);
  }

  process.stderr.write(`Found ${totalFound} pages on ${mapUrl}\n`);

  // Apply path filters
  if (includePaths && includePaths.length > 0) {
    urls = urls.filter((url) => {
      try {
        const pathname = new URL(url).pathname;
        return includePaths!.some((p) => pathname.startsWith(p));
      } catch {
        return false;
      }
    });
  }

  if (excludePaths && excludePaths.length > 0) {
    urls = urls.filter((url) => {
      try {
        const pathname = new URL(url).pathname;
        return !excludePaths!.some((p) => pathname.startsWith(p));
      } catch {
        return true;
      }
    });
  }

  if (urls.length === 0) {
    console.error('No URLs matched after filtering.');
    process.exit(1);
  }

  if (limit && limit > 0) {
    urls = urls.slice(0, limit);
  }

  // Preflight: check concurrency
  const status = await getStatus();
  const maxConcurrency = status.concurrency?.max || urls.length;

  if (!yes) {
    console.error(
      `\nFound ${urls.length} pages to scrape (${maxConcurrency} at a time).`
    );
    console.error(
      'Pass -y or --yes to confirm, or --limit <n> to restrict page count.\n'
    );
    process.exit(1);
  }

  process.stderr.write(
    `Scraping ${urls.length}${limit ? ` of ${mapResult.data.links.length}` : ''} pages (${maxConcurrency} at a time)...\n`
  );

  const dataDir = getDataDir();
  if (!dataDir) {
    throw new Error(
      `Data directory is required. Run "${getCliName()} config" to configure.`
    );
  }

  const baseDir = path.resolve(dataDir);
  let completedCount = 0;
  let errorCount = 0;
  const total = urls.length;

  let urlIndex = 0;

  const processUrl = async (url: string): Promise<void> => {
    const scrapeOptions: ScrapeOptions = { ...options, url };
    const result = await executeScrape(scrapeOptions);

    const currentCount = ++completedCount;

    if (!result.success) {
      errorCount++;
      process.stderr.write(
        `[${currentCount}/${total}] Error: ${url} - ${result.error}\n`
      );
      return;
    }

    // Save each format as its own file
    const formats = [...(options.formats || ['markdown'])];
    if (
      (options.screenshot || options.fullPageScreenshot) &&
      !formats.includes('screenshot')
    ) {
      formats.push('screenshot');
    }

    // Ensure output directory exists
    const dirPath = urlToNestedPath(url, '').replace(/\/$/, '');
    const dir = path.join(baseDir, dirPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const savedFiles: string[] = [];

    for (const fmt of formats) {
      if (fmt === 'screenshot') {
        if (result.data?.screenshot) {
          try {
            const response = await fetch(result.data.screenshot);
            if (response.ok) {
              const buffer = Buffer.from(await response.arrayBuffer());
              const filepath = path.join(dir, 'screenshot.png');
              fs.writeFileSync(filepath, buffer);
              savedFiles.push(filepath);
            }
          } catch {
            // Silently skip failed screenshot downloads
          }
        }
      } else if (fmt === 'markdown') {
        if (result.data?.markdown) {
          const filepath = path.join(dir, 'index.md');
          fs.writeFileSync(filepath, result.data.markdown, 'utf-8');
          savedFiles.push(filepath);
        }
      } else if (fmt === 'html' || fmt === 'rawHtml') {
        const html = result.data?.html || result.data?.rawHtml;
        if (html) {
          const filepath = path.join(dir, 'index.html');
          fs.writeFileSync(filepath, html, 'utf-8');
          savedFiles.push(filepath);
        }
      } else if (fmt === 'links') {
        if (Array.isArray(result.data?.links)) {
          const filepath = path.join(dir, 'links.txt');
          fs.writeFileSync(filepath, result.data.links.join('\n'), 'utf-8');
          savedFiles.push(filepath);
        }
      } else if (fmt === 'images') {
        if (Array.isArray(result.data?.images)) {
          const filepath = path.join(dir, 'images.txt');
          fs.writeFileSync(filepath, result.data.images.join('\n'), 'utf-8');
          savedFiles.push(filepath);
        }
      } else if (fmt === 'summary') {
        if (result.data?.summary) {
          const filepath = path.join(dir, 'summary.md');
          fs.writeFileSync(filepath, result.data.summary, 'utf-8');
          savedFiles.push(filepath);
        }
      } else if (fmt === 'json') {
        const filepath = path.join(dir, 'index.json');
        fs.writeFileSync(
          filepath,
          JSON.stringify(result.data, null, 2),
          'utf-8'
        );
        savedFiles.push(filepath);
      } else {
        const filepath = path.join(dir, 'index.json');
        fs.writeFileSync(
          filepath,
          JSON.stringify(result.data, null, 2),
          'utf-8'
        );
        savedFiles.push(filepath);
      }
    }

    process.stderr.write(
      `[${currentCount}/${total}] Saved: ${dir}/ (${savedFiles.length} files)\n`
    );
  };

  const runWorker = async (): Promise<void> => {
    while (urlIndex < urls.length) {
      const currentUrl = urls[urlIndex++];
      await processUrl(currentUrl);
    }
  };

  const workers = Array.from(
    { length: Math.min(maxConcurrency, urls.length) },
    () => runWorker()
  );

  await Promise.all(workers);

  process.stderr.write(
    `\nCompleted: ${completedCount - errorCount}/${total} succeeded`
  );
  if (errorCount > 0) {
    process.stderr.write(`, ${errorCount} failed`);
  }
  process.stderr.write('\n');

  if (errorCount === total) {
    process.exit(1);
  }
}
