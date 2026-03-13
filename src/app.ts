import bodyParser from 'body-parser'
import crypto from 'crypto'
import express from 'express'
import fs from 'fs'
import path from 'path'
import multer from 'multer'
import sharp from 'sharp'

const app = express()
const APP_PORT = process.env.PORT || 8080

const DATA_DIR = process.env.DATA_DIR || 'data'
const OUTPUT_DIR = path.join(DATA_DIR, 'output')
const HISTORY_PATH = path.join(DATA_DIR, 'history.json')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}
if (!fs.existsSync(HISTORY_PATH)) {
  fs.writeFileSync(HISTORY_PATH, '{}', 'utf8')
}

app.use(bodyParser.json())

function logLine(msg: string): void {
  const ts = new Date().toISOString()
  console.log(`[${ts}] ${msg}`)
}

app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - start
    logLine(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`)
  })
  next()
})

function renderHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Convert image files to WebP for free" />
    <title>WebP Converter</title>
    <style>
      * { box-sizing: border-box; }
      html { font-size: 16px; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: linear-gradient(160deg, #f0f4f8 0%, #e2e8f0 100%);
        color: #1e293b;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 2rem 1rem 3rem;
      }
      .container {
        width: 100%;
        max-width: 520px;
      }
      header {
        text-align: center;
        margin-bottom: 2rem;
      }
      header h1 {
        font-size: 1.75rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        margin: 0;
        color: #0f172a;
      }
      header p {
        margin: 0.5rem 0 0;
        font-size: 0.9375rem;
        color: #64748b;
      }
      #drop-zone {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-height: 220px;
        padding: 2rem;
        background: #fff;
        border: 2px dashed #cbd5e1;
        border-radius: 16px;
        cursor: pointer;
        transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        font-size: 1rem;
        font-weight: 500;
        color: #475569;
        text-align: center;
      }
      #drop-zone:hover { border-color: #94a3b8; background: #f8fafc; box-shadow: 0 4px 12px rgba(15,23,42,0.06); }
      #drop-zone:disabled { cursor: not-allowed; opacity: 0.7; }
      #drop-zone .icon {
        width: 48px;
        height: 48px;
        margin-bottom: 1rem;
        background: #e2e8f0;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
      }
      #drop-zone .primary { color: #0f172a; font-weight: 600; margin-bottom: 0.25rem; }
      #hidden-form { display: none; }
      #loading {
        display: none;
        margin-top: 1rem;
        padding: 0.75rem 1rem;
        background: #f1f5f9;
        border-radius: 10px;
        font-size: 0.875rem;
        color: #475569;
      }
      #convert-result:empty, #history-list:empty { display: none; }
      #convert-result, #history-list {
        margin-top: 1.5rem;
        padding: 1.25rem 1.5rem;
        background: #fff;
        border-radius: 14px;
        box-shadow: 0 1px 3px rgba(15,23,42,0.06);
      }
      #convert-result h3, #history-list h3 {
        margin: 0 0 0.75rem 0;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #64748b;
      }
      #convert-result ul, #history-list ul { list-style: none; margin: 0; padding: 0; }
      #convert-result li, #history-list li {
        padding: 0.5rem 0;
        border-bottom: 1px solid #f1f5f9;
      }
      #convert-result li:last-child, #history-list li:last-child { border-bottom: none; }
      #convert-result a, #history-list a {
        color: #2563eb;
        text-decoration: none;
        font-size: 0.9375rem;
      }
      #convert-result a:hover, #history-list a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <div class="container">
      <header>
        <h1>WebP Converter</h1>
        <p>Convert images to WebP — drag & drop or click</p>
      </header>
      <button type="button" id="drop-zone">
        <span class="icon">↑</span>
        <span class="primary">Choose or drop images</span>
        <span>PNG, JPG, GIF, etc. · Multiple files supported</span>
      </button>
      <form id="hidden-form"><input id="file-input" name="file" type="file" accept="image/*" multiple /></form>
      <div id="loading">Converting...</div>
      <div id="convert-result"></div>
      <div id="history-list"></div>
    </div>
    <script src="/app.js"></script>
  </body>
</html>`
}

app.get('/', (_req, res) => {
  res.type('html').send(renderHtml())
})

// Serve client script from public/app.js (no static mount)
const appJsPath = path.join(process.cwd(), 'public', 'app.js')
app.get('/app.js', (_req, res) => {
  if (!fs.existsSync(appJsPath)) {
    res.status(404).send('Not found')
    return
  }
  res.type('application/javascript').send(fs.readFileSync(appJsPath, 'utf8'))
})

const MAX_FILES = 20
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10)
const converter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
}).array('file', MAX_FILES)

app.post('/convert', converter, async (req, res) => {
  const files = req.files as Express.Multer.File[] | undefined
  if (!files?.length) throw new Error('No file provided')

  const history: Record<string, { originalName: string; createdAt: string }> =
    JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'))

  const result: { id: string; originalName: string }[] = []

  for (const file of files) {
    const id = crypto.randomUUID()
    const originalName = file.originalname.replace(/\.\w+$/, '.webp')
    await sharp(file.buffer)
      .webp()
      .toFile(path.join(OUTPUT_DIR, `${id}.webp`))
    history[id] = {
      originalName,
      createdAt: new Date().toISOString(),
    }
    result.push({ id, originalName })
  }

  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf8')
  res.json({ files: result })
})

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

app.get('/download/:id', (req, res) => {
  const id = req.params.id
  if (!id || !UUID_REGEX.test(id)) {
    res.status(400).json({ error: 'Invalid or missing id' })
    return
  }
  const history: Record<string, { originalName: string; createdAt: string }> =
    JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'))
  const meta = history[id]
  if (!meta) {
    res.status(404).json({ error: 'File not found' })
    return
  }
  const filePath = path.join(OUTPUT_DIR, `${id}.webp`)
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' })
    return
  }
  res.download(filePath, meta.originalName)
})

app.get('/api/history', (_req, res) => {
  const history: Record<string, { originalName: string; createdAt: string }> =
    JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'))
  const list = Object.entries(history).map(([id, meta]) => ({
    id,
    originalName: meta.originalName,
    createdAt: meta.createdAt,
  }))
  res.json(list)
})

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'LIMIT_FILE_SIZE'
    ) {
      logLine(`ERROR File too large (max ${MAX_FILE_SIZE_MB}MB)`)
      res
        .status(413)
        .json({ error: 'File too large', maxFileSizeMB: MAX_FILE_SIZE_MB })
      return
    }
    next(err)
  },
)

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logLine(`ERROR ${err instanceof Error ? err.message : String(err)}`)
    res.status(500).json({ error: 'Internal server error' })
  },
)

app.listen(APP_PORT, () => {
  logLine(`Application is running on ${APP_PORT}`)
})
