const pull = require('pull-stream')
const mime = require('simple-mime')('application/octet-stream')

const imageProcess = require('./async/image-process')
const blobify = require('./async/blobify')
const publishBlob = require('./async/publish-blob')
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const MaxSizeError = require('./lib/max-size-error')

module.exports = function blobFiles (files, server, opts, cb) {
  if (!files.length) return
  if (typeof opts === 'function') return blobFiles(files, server, {}, opts)

  const { stripExif, resize, quality, isPrivate, maxSize = MAX_SIZE } = opts
  pull(
    pull.values(files),
    pull.asyncMap(buildFileDoc),
    pull.asyncMap(imageProcess({ stripExif, resize, quality })),
    pull.asyncMap(blobify),
    pull.asyncMap(publishBlob({ server, isPrivate, maxSize })),
    pull.drain(
      result => {
        // this catches the maxSize errors from publishBlob
        if (result.constructor === Error) cb(result)
        else cb(null, result)
      },
      err => {
        if (err === null) return // done signal
        cb(err)
      }
    )
  )

  function buildFileDoc (file, cb) {
    if (resize || file.size < maxSize) {
      const reader = new global.FileReader()
      reader.onload = function (e) {
        cb(null, {
          name: file.name,
          mimeType: mime(file.name),
          data: e.target.result
        })
      }
      reader.readAsDataURL(file)
    } else {
      // files larger than 20 MB or so will take a long time to process with readAsDataURL
      // larger than 100 MB and they might lock up the entire app (fill the ram)
      // We'll just bail before it gets serious! (since ssb can only accept files < 5 MB anyway)
      cb(new MaxSizeError({
        fileName: file.name,
        fileSize: file.size,
        maxFileSize: maxSize
      }))
    }
  }
}

// re-export error so that it can be used to check the type
module.exports.MaxSizeError = MaxSizeError
