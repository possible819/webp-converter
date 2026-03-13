# WebP Converter

Convert images to WebP via a simple web UI or API. Supports multiple files, persistent history, and download by ID.

## Features

- **Multi-file convert**: Upload multiple images; each is stored with a UUID and listed in history.
- **History**: Converted files persist across restarts (stored in `data/`). Use the UI or `GET /api/history` to list them.
- **Download by ID**: Download via `GET /download/:id`; the server sends the file with the original name.

## Tech

- Node.js, TypeScript, Express
- [Sharp](https://sharp.pixelplumbing.com/) for WebP conversion
- Multer (memory storage) for uploads

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/convert` | Upload one or more images (multipart, field `file`). Returns `{ files: [ { id, originalName }, ... ] }`. |
| `GET` | `/download/:id` | Download converted file by UUID; original filename in `Content-Disposition`. |
| `GET` | `/api/history` | List all converted files: `[ { id, originalName, createdAt }, ... ]`. |
| `GET` | `/` | Serves the web UI (dynamic HTML). |
| `GET` | `/app.js` | Client script for the UI. |

## Data

- Converted files: `data/output/<uuid>.webp` (path overridable with `DATA_DIR`).
- Metadata: `data/history.json` (id → originalName, createdAt). Ignored by git via `.gitignore` (`data/`).

## Setup and run

```bash
yarn install
yarn build
yarn start   # default port 8080; set PORT or use serve:dev
```

- **Dev**: `yarn serve:dev` (nodemon, ts-node, PORT=8080).
- **Production**: `yarn pm2:start` (see `ecosystem.config.cjs`; port 10001).

## License

MIT
