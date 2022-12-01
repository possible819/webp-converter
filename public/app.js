class WebpConverter {
  constructor() {
    this.dropZone = document.querySelector('#drop-zone')
    this.form = document.querySelector('#hidden-form')
    this.fileInput = document.querySelector('#file-input')
    this.file = null

    this.registerEventListeners()
  }

  registerEventListeners() {
    this.dropZone.onclick = () => {
      this.fileInput.click()
    }
    this.dropZone.ondrop = (event) => {
      event.preventDefault()
      this.file = event.dataTransfer.files[0]
      this.convert()
    }
    this.dropZone.ondragover = (event) => {
      event.preventDefault()
    }
    this.fileInput.onchange = (event) => {
      this.file = event.target.files[0]
      this.convert()
    }
  }

  async convert() {
    try {
      if (!this.file) throw new Error('No file found')
      const formData = new FormData()
      formData.append('file', this.file)

      const response = await fetch('/convert', {
        method: 'post',
        body: formData,
      })

      if (!response.ok) throw new Error('Failed to convert file')
      const { filename } = await response.json()

      const anchor = document.createElement('a')
      anchor.href = `/download/${filename}`
      anchor.click()
      anchor.remove()
      this.form.reset()
    } catch (e) {
      if (e instanceof Error) {
        alert(e.message)
      } else {
        alert('Unexpected error occurred.')
      }
    }
  }
}

new WebpConverter()
