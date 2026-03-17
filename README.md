# 🔥 Firecrawl CLI

Command-line interface for Firecrawl. Scrape, crawl, and extract data from any website directly from your terminal.

> **Fork 声明**：本项目 fork 自 [firecrawl/cli](https://github.com/firecrawl/cli)，仅供个人使用，不再计划合并回上游。感谢 [Firecrawl](https://firecrawl.dev) 团队的出色工作！

## Installation

本项目不发布到 npm，请通过本地构建使用：

```bash
# 克隆仓库
git clone https://github.com/archerny/firecrawl-cli.git
cd firecrawl-cli

# 安装依赖并构建
pnpm install
pnpm build

# 全局链接（可选，之后可直接使用 firecrawl 命令）
npm link
```

## Quick Start

Just run a command - the CLI will prompt you to authenticate if needed:

```bash
firecrawl https://example.com
```

## Authentication

On first run, you'll be prompted to configure:

```
  🔥 firecrawl cli
  Turn websites into LLM-ready data

Welcome! To get started, configure your Firecrawl credentials.

Tip: You can also set FIRECRAWL_API_URL and FIRECRAWL_API_KEY environment variables

Enter your API URL:
Enter your API key:
```

### Authentication Methods

```bash
# Interactive (prompts automatically when needed)
firecrawl

# Direct API key and URL
firecrawl login --api-url https://api.firecrawl.dev --api-key your-api-key

# Environment variables
export FIRECRAWL_API_URL=https://api.firecrawl.dev
export FIRECRAWL_API_KEY=your-api-key

# Per-command overrides
firecrawl scrape https://example.com --api-url https://api.firecrawl.dev --api-key your-api-key
```

### Self-hosted / Local Development

For self-hosted Firecrawl instances or local development:

```bash
# Use a local Firecrawl instance
firecrawl login --api-url http://localhost:3002 --api-key your-local-key

# Or set via environment variables
export FIRECRAWL_API_URL=http://localhost:3002
export FIRECRAWL_API_KEY=your-local-key
firecrawl scrape https://example.com
```

---

## Commands

### `scrape` - Scrape URLs

Extract content from any webpage. Pass multiple URLs to scrape them concurrently -- each result is saved to `.firecrawl/` automatically.

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

# Multiple URLs (scraped concurrently, each saved to .firecrawl/)
firecrawl scrape https://example.com https://example.com/blog
```

#### Scrape Options

| Option                     | Description                                             |
| -------------------------- | ------------------------------------------------------- |
| `-f, --format <formats>`   | Output format(s), comma-separated                       |
| `-H, --html`               | Shortcut for `--format html`                            |
| `-S, --summary`            | Shortcut for `--format summary`                         |
| `--only-main-content`      | Extract only main content (removes navs, footers, etc.) |
| `--wait-for <ms>`          | Wait time before scraping (for JS-rendered content)     |
| `--screenshot`             | Take a screenshot                                       |
| `--full-page-screenshot`   | Take a full page screenshot                             |
| `--include-tags <tags>`    | Only include specific HTML tags                         |
| `--exclude-tags <tags>`    | Exclude specific HTML tags                              |
| `--max-age <milliseconds>` | Maximum age of cached content in milliseconds           |
| `-o, --output <path>`      | Save output to file                                     |
| `--json`                   | Output as JSON format                                   |
| `--pretty`                 | Pretty print JSON output                                |
| `--timing`                 | Show request timing info                                |

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

### `download` - Bulk Site Download

Combines `map` + `scrape` to save a site as local files.

```bash
# Interactive wizard
firecrawl download https://example.com

# Download with screenshots
firecrawl download https://example.com --screenshot --limit 20 -y
```

---

### `agent` - AI-powered web data extraction

```bash
firecrawl agent "Find the pricing plans for Firecrawl" --wait
firecrawl agent "Extract company info" --schema '{"type":"object","properties":{"name":{"type":"string"}}}'
```

---

### `browser` - Browser sandbox sessions (Beta)

```bash
firecrawl browser launch-session
firecrawl browser launch-session --ttl 600 --json
firecrawl browser execute "open https://example.com"
firecrawl browser execute "snapshot"
firecrawl browser list
firecrawl browser close
```

---

### `credit-usage` - Check your credits

```bash
firecrawl credit-usage
```

---

### `config` / `login` / `logout`

```bash
firecrawl login
firecrawl login --api-key fc-xxx
firecrawl logout
firecrawl view-config
```

---

## Global Options

| Option                | Description                                            |
| --------------------- | ------------------------------------------------------ |
| `--status`            | Show version, auth, concurrency, and credits           |
| `-k, --api-key <key>` | Use specific API key                                   |
| `--api-url <url>`     | Use custom API URL (for self-hosted/local development) |
| `-V, --version`       | Show version                                           |
| `-h, --help`          | Show help                                              |

---

## Experimental: AI Workflows

Launch pre-built AI workflows that combine Firecrawl's web capabilities with your coding agent.

```bash
firecrawl claude deep-research "topic"
firecrawl claude competitor-analysis https://example.com
firecrawl claude qa https://myapp.com
```

See the full documentation: **[Experimental Workflows ->](src/commands/experimental/README.md)**
