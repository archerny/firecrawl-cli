# 🔥 Firecrawl CLI

Command-line interface for Firecrawl. Scrape, crawl, and extract data from any website directly from your terminal.

> **Fork Notice**: This project is forked from [firecrawl/cli](https://github.com/firecrawl/cli) for personal use only. No plans to merge back upstream. Thanks to the [Firecrawl](https://firecrawl.dev) team for the great work!

## Installation

This project is not published to npm. Build and use locally:

```bash
# Clone the repository
git clone https://github.com/archerny/firecrawl-cli.git
cd firecrawl-cli

# Install dependencies and build
pnpm install
pnpm build

# Global link (optional, allows using the firecrawl command directly)
npm link
```

## Quick Start

Just run a command - the CLI will prompt you to configure if needed:

```bash
firecrawl https://example.com
```

## Configuration

On first run, you'll be prompted to configure three required settings:

```
  🔥 firecrawl cli
  Turn websites into LLM-ready data

Welcome! To get started, configure your Firecrawl settings.

Tip: You can also set FIRECRAWL_API_URL, FIRECRAWL_API_KEY, and FIRECRAWL_DATA_DIR environment variables

Enter your API URL:
Enter your API key:
Enter data directory (where scraped data will be stored):
```

### Configuration Methods

```bash
# Interactive (prompts automatically when needed)
firecrawl

# Direct configuration (all three required)
firecrawl config --api-url https://api.firecrawl.dev --api-key your-api-key --data-dir ~/firecrawl-data

# Environment variables
export FIRECRAWL_API_URL=https://api.firecrawl.dev
export FIRECRAWL_API_KEY=your-api-key
export FIRECRAWL_DATA_DIR=~/firecrawl-data

# Per-command overrides
firecrawl scrape https://example.com --api-url https://api.firecrawl.dev --api-key your-api-key
```

### Configuration Priority

Settings are resolved in the following order (highest to lowest):

1. Command-line flags (`--api-key`, `--api-url`)
2. Global config (set via `firecrawl config`)
3. Environment variables (`FIRECRAWL_API_KEY`, `FIRECRAWL_API_URL`, `FIRECRAWL_DATA_DIR`)
4. Stored settings (`~/.config/firecrawl-cli/settings.json`)

### Self-hosted / Local Development

For self-hosted Firecrawl instances or local development:

```bash
# Use a local Firecrawl instance
firecrawl config --api-url http://localhost:3002 --api-key your-local-key --data-dir ./data

# Or set via environment variables
export FIRECRAWL_API_URL=http://localhost:3002
export FIRECRAWL_API_KEY=your-local-key
export FIRECRAWL_DATA_DIR=./data
firecrawl scrape https://example.com
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
firecrawl https://example.com
firecrawl scrape https://example.com

# Get raw HTML
firecrawl https://example.com --html
firecrawl https://example.com -H

# Multiple formats (outputs JSON)
firecrawl https://example.com --format markdown,links,images

# Save to file
firecrawl https://example.com -o output.md
firecrawl https://example.com --format json -o data.json --pretty

# Multiple URLs (scraped concurrently, each saved to data directory)
firecrawl scrape https://example.com https://example.com/blog

# Ask a question about the page
firecrawl https://example.com -Q "What is this page about?"
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
# Interactive wizard
firecrawl download https://example.com

# Download with limit
firecrawl download https://example.com --limit 50 -y

# Download with screenshots
firecrawl download https://example.com --screenshot --limit 20 -y

# Filter by paths
firecrawl download https://docs.example.com --include-paths "/api,/guide" --limit 100 -y

# Exclude localized pages
firecrawl download https://docs.example.com --exclude-paths "/zh,/ja,/fr,/es" -y
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
firecrawl search "firecrawl web scraping"

# Limit results
firecrawl search "AI news" --limit 10

# Search and scrape results
firecrawl search "firecrawl tutorials" --scrape
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
firecrawl map https://example.com
firecrawl map https://example.com --json
firecrawl map https://example.com --search "blog"
```

---

### `crawl` - Crawl an entire website

```bash
# Start a crawl
firecrawl crawl https://example.com --wait --progress

# Check crawl status
firecrawl crawl <job-id>

# Limit pages
firecrawl crawl https://example.com --limit 100 --max-depth 3
```

---

### `agent` - AI-powered web data extraction

```bash
firecrawl agent "Find the pricing plans for Firecrawl" --wait
firecrawl agent "Extract company info" --schema '{"type":"object","properties":{"name":{"type":"string"}}}'
firecrawl agent "Summarize this page" --urls https://example.com --wait
```

---

### `browser` - Browser sandbox sessions (Beta)

```bash
# Quick shorthand (auto-launches session)
firecrawl browser "open https://example.com"
firecrawl browser "snapshot"

# Explicit subcommands
firecrawl browser launch-session
firecrawl browser launch-session --ttl 600 --json
firecrawl browser execute "open https://example.com"
firecrawl browser execute "snapshot"
firecrawl browser list
firecrawl browser close

# Run Playwright code
firecrawl browser execute --python 'print(await page.title())'
firecrawl browser execute --node 'await page.title()'
```

---

### `config` / `view-config`

```bash
# Interactive configuration
firecrawl config

# Direct configuration
firecrawl config --api-url http://localhost:3002 --api-key your-key --data-dir ~/firecrawl-data

# View current configuration
firecrawl view-config
```

---

### `version` / `status`

```bash
# Show version
firecrawl version

# Show version with auth status
firecrawl version --auth-status

# Show full status (version, auth, concurrency, data directory)
firecrawl --status
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
│   ├── auth.ts               # Authentication flow & interactive prompts
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

# Build
pnpm build

# Watch mode
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

Current coverage (374 tests across 18 test files):

| Layer           | Stmts   | Branch  | Funcs   | Lines   |
| --------------- | ------- | ------- | ------- | ------- |
| `src/utils/`    | 93%     | 81%     | 98%     | 95%     |
| `src/commands/` | 44%     | 42%     | 46%     | 44%     |
| **Overall**     | **57%** | **54%** | **68%** | **58%** |

## License

ISC
