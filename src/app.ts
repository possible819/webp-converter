import bodyParser from 'body-parser'
import express from 'express'
import fs from 'fs'
import multer from 'multer'
import sharp from 'sharp'

const app = express()
const APP_PORT = process.env.PORT || 8080

app.use(express.static('public'))
app.use(bodyParser.json())

app.post(
  '/convert',
  multer({ dest: './temp' }).single('file'),
  async (req, res) => {
    const file = req.file
    if (!file) throw new Error('No file provided')

    const filename = file.originalname.replace(/\.\w+$/, '.webp')
    await sharp(file.path).webp().toFile(`./public/output/${filename}`)
    fs.unlinkSync(file.path)
    res.json({ filename })
  },
)

if (fs.existsSync('public/output')) {
  fs.rmSync('public/output', { recursive: true })
}

fs.mkdirSync('public/output')

app.get('/download/:filename', (req, res) => {
  if (!req.params.filename) throw new Error('No specified file name found.')
  const filename = req.params.filename

  res.download(`./public/output/${filename}`)
})

app.listen(APP_PORT, () => {
  console.log(`Application is running on ${APP_PORT}`)
})
