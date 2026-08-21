# Cross Project Script Tool

CLI in TypeScript for counting GitHub Copilot-generated lines across frontend, backend and multi-project repositories.

## Features

- Detects frontend, backend or generic projects.
- Detects Rules 7, 8 and 10 with case-insensitive comment matching and common accent variants.
- Counts only configured source extensions and ignores generated C# files and build directories where applicable.
- Uses `cloc` for AI-block counts and repository totals when the executable is available, with a local fallback.
- Supports consolidated text or JSON reports.

## Getting Started

### Prerequisites
- Node.js and npm.
- `cloc` on `PATH` for repository-specific totals; the tool falls back to local counting when it is unavailable.

### Installation
1. Navigate to this directory:
   ```
   cd cross-project-script-tool
   ```
2. Install dependencies and compile:
   ```
   npm install
   npm run build
   ```

### Usage
Run the CLI from this directory:
```
npm run cli -- [project-path] [options]
npm run cli -- --all [options]
```

Examples:
```bash
npm run cli -- "C:/projects/my-api"
npm run cli -- "C:/projects/my-api" -o report.json -f json
npm run cli -- --all -o all-projects.txt
npm run cli -- "C:/projects/my-api" -d
```

Options are `--all`, `-o/--output`, `-f/--format` (`text` or `json`), `-d/--debug` and `-h/--help`.

For multi-project analysis, add one local project path per line to `projects.txt`. Prepare repositories first when needed:
```bash
npm run prepare-repos -- -b main
npm run cli -- --all
```

Repository-specific counted extensions and `cloc` languages are defined in `src/config/repositoryRules.ts`. Detection is limited to the union of those configured extensions.

See [README_ES.md](README_ES.md), [USAGE.md](USAGE.md) and [RULES.md](RULES.md) for detailed documentation.