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

function renderHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Convert image files to WebP for free" />
    <title>WebP Converter</title>
    <style>
      html, body { display: flex; width: 100vw; height: 100vh; margin: 0; font-family: sans-serif; color: #333; }
      main { display: flex; flex-direction: column; margin: 30px auto; max-width: 480px; padding: 0 16px; }
      #drop-zone { display: grid; width: 100%; min-height: 180px; background: #f5f5f5; border: 2px dashed #ccc; border-radius: 12px; font-size: 18px; font-weight: 600; place-items: center; text-align: center; line-height: 1.4; cursor: pointer; transition: border-color .2s, background .2s; }
      #drop-zone:hover { border-color: #999; background: #eee; }
      #drop-zone:disabled { cursor: not-allowed; }
      #hidden-form { display: none; }
      #loading { display: none; margin-top: 12px; color: #666; font-size: 14px; }
      #convert-result, #history-list { margin-top: 24px; padding: 16px; background: #fafafa; border-radius: 8px; border: 1px solid #eee; }
      #convert-result h3, #history-list h3 { margin: 0 0 12px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: .05em; }
      #convert-result ul, #history-list ul { list-style: none; margin: 0; padding: 0; }
      #convert-result li, #history-list li { padding: 6px 0; border-bottom: 1px solid #eee; }
      #convert-result li:last-child, #history-list li:last-child { border-bottom: none; }
      #convert-result a, #history-list a { color: #1976d2; text-decoration: none; }
      #convert-result a:hover, #history-list a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <main>
      <button type="button" id="drop-zone">
        <h1>WebP Converter</h1>
        <p>Drop files or click to convert</p>
      </button>
      <form id="hidden-form"><input id="file-input" name="file" type="file" accept="image/*" multiple /></form>
      <div id="loading">Converting...</div>
      <div id="convert-result"></div>
      <div id="history-list"></div>
    </main>
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
const converter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
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

app.listen(APP_PORT, () => {
  console.log(`Application is running on ${APP_PORT}`)
})
