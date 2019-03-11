class MaxSizeError extends Error {
  constructor ({ fileName, fileSize, maxFileSize }) {
    super(`${fileName} (${humanSize(fileSize)}) is larger than the allowed limit of ${humanSize(maxFileSize)}`)

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MaxSizeError)
    }

    this.fileName = fileName
    this.fileSize = fileSize
    this.maxFileSize = maxFileSize
    this.code = 'EXCEEDS_MAX_SIZE'
  }
}

module.exports = MaxSizeError

function humanSize (size) {
  return (Math.ceil(size / (1024 * 1024) * 10) / 10) + ' MB'
}
