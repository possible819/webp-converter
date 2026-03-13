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

const PUBLIC_OUTPUT = path.join('public', 'output')
if (!fs.existsSync(PUBLIC_OUTPUT)) {
  fs.mkdirSync(PUBLIC_OUTPUT, { recursive: true })
}

app.use(express.static('public'))
app.use(bodyParser.json())

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
