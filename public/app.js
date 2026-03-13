class WebpConverter {
  constructor() {
    this.dropZone = document.querySelector('#drop-zone')
    this.form = document.querySelector('#hidden-form')
    this.fileInput = document.querySelector('#file-input')
    this.convertResult = document.querySelector('#convert-result')
    this.historyList = document.querySelector('#history-list')
    this.loading = document.querySelector('#loading')

    this.registerEventListeners()
    this.loadHistory()
  }

  registerEventListeners() {
    this.dropZone.onclick = () => this.fileInput.click()
    this.dropZone.ondragover = (e) => e.preventDefault()
    this.dropZone.ondrop = (e) => {
      e.preventDefault()
      if (e.dataTransfer.files.length) this.convert(e.dataTransfer.files)
    }
    this.fileInput.onchange = (e) => {
      const files = e.target.files
      if (files?.length) this.convert(files)
    }
  }

  async convert(files) {
    try {
      const formData = new FormData()
      for (let i = 0; i < files.length; i++) formData.append('file', files[i])

      this.setLoading(true)
      const response = await fetch('/convert', {
        method: 'post',
        body: formData,
      })
      this.setLoading(false)

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to convert')
      }
      const { files: result } = await response.json()
      this.renderConvertResult(result)
      this.loadHistory()
      this.form.reset()
    } catch (e) {
      this.setLoading(false)
      alert(e instanceof Error ? e.message : 'Unexpected error occurred.')
    }
  }

  setLoading(show) {
    if (this.loading) this.loading.style.display = show ? 'block' : 'none'
    if (this.dropZone) {
      this.dropZone.disabled = show
      this.dropZone.style.pointerEvents = show ? 'none' : ''
      this.dropZone.style.opacity = show ? '0.6' : '1'
    }
  }

  renderConvertResult(files) {
    if (!this.convertResult || !files?.length) return
    this.convertResult.innerHTML =
      '<h3>Converted</h3>' + this.renderFileList(files)
  }

  renderFileList(files) {
    return (
      '<ul>' +
      files
        .map(
          (f) =>
            `<li><a href="/download/${f.id}" download>${escapeHtml(
              f.originalName,
            )}</a></li>`,
        )
        .join('') +
      '</ul>'
    )
  }

  async loadHistory() {
    try {
      const response = await fetch('/api/history')
      if (!response.ok) return
      const list = await response.json()
      if (!this.historyList) return
      this.historyList.innerHTML =
        '<h3>History</h3>' +
        (list.length
          ? '<ul>' +
            list
              .map(
                (f) =>
                  `<li><a href="/download/${f.id}" download>${escapeHtml(
                    f.originalName,
                  )}</a></li>`,
              )
              .join('') +
            '</ul>'
          : '<p>No files yet.</p>')
    } catch (_) {
      if (this.historyList)
        this.historyList.innerHTML = '<p>Failed to load history.</p>'
    }
  }
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

new WebpConverter()
