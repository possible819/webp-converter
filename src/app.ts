import bodyParser from 'body-parser'
import express from 'express'
import fs from 'fs'
import path from 'path'
import multer from 'multer'
import sharp from 'sharp'

const app = express()
const APP_PORT = process.env.PORT || 8080

const DATA_DIR = process.env.DATA_DIR || 'data'
const HISTORY_PATH = path.join(DATA_DIR, 'history.json')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}
const dataOutputDir = path.join(DATA_DIR, 'output')
if (!fs.existsSync(dataOutputDir)) {
  fs.mkdirSync(dataOutputDir, { recursive: true })
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

app.post(
  '/convert',
  multer({ storage: multer.memoryStorage() }).single('file'),
  async (req, res) => {
    const file = req.file
    if (!file) throw new Error('No file provided')

    const filename = file.originalname.replace(/\.\w+$/, '.webp')
    await sharp(file.buffer).webp().toFile(path.join(PUBLIC_OUTPUT, filename))
    res.json({ filename })
  },
)

app.get('/download/:filename', (req, res) => {
  if (!req.params.filename) throw new Error('No specified file name found.')
  const filename = req.params.filename
  res.download(path.join(PUBLIC_OUTPUT, filename))
})

app.listen(APP_PORT, () => {
  console.log(`Application is running on ${APP_PORT}`)
})
