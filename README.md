# 🔥 Firecrawl CLI

Command-line interface for Firecrawl. Scrape, crawl, and extract data from any website directly from your terminal.

> **Fork Notice**: This project is forked from [firecrawl/cli](https://github.com/firecrawl/cli) for personal use only. No plans to merge back upstream. Thanks to the [Firecrawl](https://firecrawl.dev) team for the great work!

## Installation

This project is not published to npm. Build a self-contained single-file script and use it directly:

```bash
# Clone the repository
git clone https://github.com/archerny/firecrawl-cli.git
cd firecrawl-cli

# Install dependencies and bundle
pnpm install
pnpm bundle

# The output is bundle/index.cjs — a single file with zero dependencies.
# Copy it anywhere and run with Node.js:
node bundle/index.cjs --help
```

## Quick Start

Configure first, then scrape:

```bash
# Set up configuration (all three options required)
node bundle/index.cjs config --api-url https://api.firecrawl.dev --api-key your-api-key --data-dir ~/firecrawl-data

# Or use environment variables
export FIRECRAWL_API_URL=https://api.firecrawl.dev
export FIRECRAWL_API_KEY=your-api-key
export FIRECRAWL_DATA_DIR=~/firecrawl-data

# Scrape a URL
node bundle/index.cjs https://example.com
```

## Configuration

Three settings are required: **API URL**, **API Key**, and **Data Directory**. If any are missing, the CLI will print an error with instructions and exit.

### Configuration Methods

```bash
# Direct configuration (saves to settings file)
node bundle/index.cjs config --api-url https://api.firecrawl.dev --api-key your-api-key --data-dir ~/firecrawl-data

# Environment variables
export FIRECRAWL_API_URL=https://api.firecrawl.dev
export FIRECRAWL_API_KEY=your-api-key
export FIRECRAWL_DATA_DIR=~/firecrawl-data

# Per-command overrides
node bundle/index.cjs scrape https://example.com --api-url https://api.firecrawl.dev --api-key your-api-key
```

### Configuration Priority

Settings are resolved in the following order (highest to lowest):

1. Command-line flags (`--api-key`, `--api-url`)
2. Global config (set via `node bundle/index.cjs config`)
3. Environment variables (`FIRECRAWL_API_KEY`, `FIRECRAWL_API_URL`, `FIRECRAWL_DATA_DIR`)
4. Stored settings (`~/.config/firecrawl-cli/settings.json`)

### Self-hosted / Local Development

For self-hosted Firecrawl instances or local development:

```bash
# Use a local Firecrawl instance
node bundle/index.cjs config --api-url http://localhost:3002 --api-key your-local-key --data-dir ./data

# Or set via environment variables
export FIRECRAWL_API_URL=http://localhost:3002
export FIRECRAWL_API_KEY=your-local-key
export FIRECRAWL_DATA_DIR=./data
node bundle/index.cjs scrape https://example.com
```

### Storage Paths

| Item            | Path                                    |
| --------------- | --------------------------------------- |
| Settings file   | `~/.config/firecrawl-cli/settings.json` |
| Scraped data    | User-configured `dataDir`               |
| Browser session | `<dataDir>/browser-session.json`        |

> **Note**: On Windows, the settings file is stored at `%APPDATA%\firecrawl-cli\settings.json`.

---

## Commands

### `scrape` - Scrape URLs

Extract content from any webpage. Pass multiple URLs to scrape them concurrently — each result is saved to the configured data directory automatically.

```bash
# Basic usage (outputs markdown)
node bundle/index.cjs https://example.com
node bundle/index.cjs scrape https://example.com

# Get raw HTML
node bundle/index.cjs https://example.com --html
node bundle/index.cjs https://example.com -H

# Multiple formats (outputs JSON)
node bundle/index.cjs https://example.com --format markdown,links,images

# Save to file
node bundle/index.cjs https://example.com -o output.md
node bundle/index.cjs https://example.com --format json -o data.json --pretty

# Multiple URLs (scraped concurrently, each saved to data directory)
node bundle/index.cjs scrape https://example.com https://example.com/blog

# Ask a question about the page
node bundle/index.cjs https://example.com -Q "What is this page about?"
```

#### Scrape Options

| Option                     | Description                                                   |
| -------------------------- | ------------------------------------------------------------- |
| `-f, --format <formats>`   | Output format(s), comma-separated                             |
| `-H, --html`               | Shortcut for `--format html`                                  |
| `-S, --summary`            | Shortcut for `--format summary`                               |
| `-Q, --query <prompt>`     | Ask a question about the page content                         |
| `--only-main-content`      | Extract only main content (removes navs, footers, etc.)       |
| `--wait-for <ms>`          | Wait time before scraping (for JS-rendered content)           |
| `--screenshot`             | Take a screenshot                                             |
| `--full-page-screenshot`   | Take a full page screenshot                                   |
| `--include-tags <tags>`    | Only include specific HTML tags                               |
| `--exclude-tags <tags>`    | Exclude specific HTML tags                                    |
| `--max-age <milliseconds>` | Maximum age of cached content in milliseconds                 |
| `--country <code>`         | ISO country code for geo-targeted scraping (e.g., US, DE, BR) |
| `--languages <codes>`      | Comma-separated language codes for scraping (e.g., en,es)     |
| `-o, --output <path>`      | Save output to file                                           |
| `--json`                   | Output as JSON format                                         |
| `--pretty`                 | Pretty print JSON output                                      |
| `--timing`                 | Show request timing info                                      |

#### Available Formats

| Format           | Description                  |
| ---------------- | ---------------------------- |
| `markdown`       | Clean markdown (default)     |
| `html`           | Cleaned HTML                 |
| `rawHtml`        | Original HTML                |
| `links`          | All links on the page        |
| `images`         | All images on the page       |
| `screenshot`     | Screenshot as base64         |
| `summary`        | AI-generated summary         |
| `json`           | Structured JSON extraction   |
| `changeTracking` | Track changes on the page    |
| `attributes`     | Page attributes and metadata |
| `branding`       | Brand identity extraction    |

---

### `download` - Bulk Site Download

Combines `map` + `scrape` to download a site into the configured data directory as nested directories.

```bash
# Download with limit
node bundle/index.cjs download https://example.com --limit 50 -y

# Download with screenshots
node bundle/index.cjs download https://example.com --screenshot --limit 20 -y

# Filter by paths
node bundle/index.cjs download https://docs.example.com --include-paths "/api,/guide" --limit 100 -y

# Exclude localized pages
node bundle/index.cjs download https://docs.example.com --exclude-paths "/zh,/ja,/fr,/es" -y
```

#### Download Options

| Option                     | Description                                               |
| -------------------------- | --------------------------------------------------------- |
| `--limit <number>`         | Max pages to download                                     |
| `--search <query>`         | Filter pages by search query                              |
| `--include-paths <paths>`  | Only download URLs matching these paths (comma-separated) |
| `--exclude-paths <paths>`  | Skip URLs matching these paths (comma-separated)          |
| `--allow-subdomains`       | Include subdomains                                        |
| `-f, --format <formats>`   | Output format(s), comma-separated (default: markdown)     |
| `-H, --html`               | Download as HTML                                          |
| `-S, --summary`            | Download as summary                                       |
| `--only-main-content`      | Include only main content                                 |
| `--wait-for <ms>`          | Wait time before scraping in milliseconds                 |
| `--screenshot`             | Take a screenshot                                         |
| `--full-page-screenshot`   | Take a full page screenshot                               |
| `--include-tags <tags>`    | Comma-separated list of tags to include                   |
| `--exclude-tags <tags>`    | Comma-separated list of tags to exclude                   |
| `--max-age <milliseconds>` | Maximum age of cached content in milliseconds             |
| `--country <code>`         | ISO country code for geo-targeted scraping                |
| `--languages <codes>`      | Comma-separated language codes for scraping               |
| `-y, --yes`                | Skip confirmation prompt                                  |

---

### `search` - Search the web

Search the web and optionally scrape content from search results.

```bash
# Basic search
node bundle/index.cjs search "firecrawl web scraping"

# Limit results
node bundle/index.cjs search "AI news" --limit 10

# Search and scrape results
node bundle/index.cjs search "firecrawl tutorials" --scrape
```

#### Search Options

| Option                       | Description                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| `--limit <n>`                | Maximum results (default: 5, max: 100)                                                      |
| `--sources <sources>`        | Comma-separated: `web`, `images`, `news` (default: web)                                     |
| `--categories <categories>`  | Comma-separated: `github`, `research`, `pdf`                                                |
| `--tbs <value>`              | Time filter: `qdr:h` (hour), `qdr:d` (day), `qdr:w` (week), `qdr:m` (month), `qdr:y` (year) |
| `--location <location>`      | Geo-targeting (e.g., "Germany", "San Francisco,California,United States")                   |
| `--country <code>`           | ISO country code (default: US)                                                              |
| `--scrape`                   | Enable scraping of search results                                                           |
| `--scrape-formats <formats>` | Scrape formats when `--scrape` enabled (default: markdown)                                  |
| `-o, --output <path>`        | Save to file                                                                                |
| `--json`                     | Output as compact JSON                                                                      |

---

### `map` - Discover all URLs on a website

```bash
node bundle/index.cjs map https://example.com
node bundle/index.cjs map https://example.com --json
node bundle/index.cjs map https://example.com --search "blog"
```

---

### `crawl` - Crawl an entire website

```bash
# Start a crawl
node bundle/index.cjs crawl https://example.com --wait --progress

# Check crawl status
node bundle/index.cjs crawl <job-id>

# Limit pages
node bundle/index.cjs crawl https://example.com --limit 100 --max-depth 3
```

---

### `agent` - AI-powered web data extraction

```bash
node bundle/index.cjs agent "Find the pricing plans for Firecrawl" --wait
node bundle/index.cjs agent "Extract company info" --schema '{"type":"object","properties":{"name":{"type":"string"}}}'
node bundle/index.cjs agent "Summarize this page" --urls https://example.com --wait
```

---

### `browser` - Browser sandbox sessions (Beta)

```bash
# Quick shorthand (auto-launches session)
node bundle/index.cjs browser "open https://example.com"
node bundle/index.cjs browser "snapshot"

# Explicit subcommands
node bundle/index.cjs browser launch-session
node bundle/index.cjs browser launch-session --ttl 600 --json
node bundle/index.cjs browser execute "open https://example.com"
node bundle/index.cjs browser execute "snapshot"
node bundle/index.cjs browser list
node bundle/index.cjs browser close

# Run Playwright code
node bundle/index.cjs browser execute --python 'print(await page.title())'
node bundle/index.cjs browser execute --node 'await page.title()'
```

---

### `config` / `view-config`

```bash
# Set configuration (all three options required)
node bundle/index.cjs config --api-url http://localhost:3002 --api-key your-key --data-dir ~/firecrawl-data

# View current configuration
node bundle/index.cjs view-config
```

---

### `version` / `status`

```bash
# Show version
node bundle/index.cjs version

# Show version with auth status
node bundle/index.cjs version --auth-status

# Show full status (version, auth, concurrency, data directory)
node bundle/index.cjs --status
```

---

## Global Options

| Option                | Description                                                |
| --------------------- | ---------------------------------------------------------- |
| `--status`            | Show version, auth, concurrency, and data directory status |
| `-k, --api-key <key>` | Use specific API key                                       |
| `--api-url <url>`     | Use custom API URL (for self-hosted/local development)     |
| `-V, --version`       | Show version                                               |
| `-h, --help`          | Show help                                                  |

---

## Project Structure

```
src/
├── index.ts                  # CLI entry point, command registration
├── commands/
│   ├── scrape.ts             # scrape & download commands
│   ├── crawl.ts              # crawl command
│   ├── map.ts                # map command
│   ├── search.ts             # search command
│   ├── agent.ts              # agent command
│   ├── browser.ts            # browser command
│   ├── config.ts             # config & view-config commands
│   ├── status.ts             # status command
│   └── version.ts            # version command
├── utils/
│   ├── settings.ts           # Persistent settings storage (API key, URL, data dir)
│   ├── config.ts             # Global runtime configuration
│   ├── auth.ts               # Authentication check & config validation
│   ├── client.ts             # Firecrawl SDK client factory
│   ├── browser-session.ts    # Browser session persistence
│   ├── output.ts             # Output formatting & file writing
│   ├── options.ts            # CLI option parsing
│   ├── url.ts                # URL validation & normalization
│   └── job.ts                # Job ID detection
├── types/
│   ├── scrape.ts             # Scrape-related type definitions
│   └── search.ts             # Search-related type definitions
└── __tests__/
    ├── README.md             # Testing guide
    ├── commands/             # Command test files
    └── utils/                # Utility test files & mock helpers
```

## Development

```bash
# Install dependencies
pnpm install

# Build (for development, outputs to dist/)
pnpm build

# Bundle (for production, outputs single file to bundle/index.cjs)
pnpm bundle

# Watch mode (development)
pnpm dev

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type check
pnpm type-check

# Format code
pnpm format
```

### Test Coverage

Tests use Vitest with v8 coverage. All tests mock the Firecrawl client to avoid real API calls.

```bash
# Run tests with coverage report
npx vitest run --coverage
```

Current coverage (364 tests across 18 test files):

| Layer           | Stmts   | Branch  | Funcs   | Lines   |
| --------------- | ------- | ------- | ------- | ------- |
| `src/utils/`    | 93%     | 81%     | 98%     | 95%     |
| `src/commands/` | 44%     | 42%     | 46%     | 44%     |
| **Overall**     | **57%** | **54%** | **68%** | **58%** |

## License

ISC
