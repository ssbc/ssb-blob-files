const pull = require('pull-stream')
const mime = require('simple-mime')('application/octect-stream')

const imageProcess = require('./async/image-process')
const blobify = require('./async/blobify')
const publishBlob = require('./async/publish-blob')

module.exports = function blobFiles (files, server, opts, cb) {
  if (!files.length) return
  if (typeof opts === 'function') return blobFiles(files, server, {}, opts)

  const { stripExif, resize, quality, isPrivate } = opts

  pull(
    pull.values(files),
    pull.asyncMap(buildFileDoc),
    pull.asyncMap(imageProcess({ stripExif, resize, quality })),
    pull.asyncMap(blobify),
    pull.asyncMap(publishBlob({ server, isPrivate })),
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
}

function buildFileDoc (file, cb) {
  const reader = new global.FileReader()
  reader.onload = function (e) {
    cb(null, {
      name: file.name,
      mimeType: mime(file.name),
      data: e.target.result
    })
  }
  reader.readAsDataURL(file)
}
