const pull = require('pull-stream')
const pullDefer = require('pull-defer')
const pullBoxStream = require('pull-box-stream')
const split = require('split-buffer')
const crypto = require('crypto')
const MaxSizeError = require('../lib/max-size-error')
const zeros = Buffer.alloc(24, 0)
const { resolve, onceTrue } = require('../utils')

module.exports = function publishBlob ({ server, isPrivate, maxSize }) {
  return function (doc, cb) {
    const { name, mimeType: type, blob } = doc

    var reader = new global.FileReader()
    reader.onload = function () {
      // TODO bail out and run onError(?) if size > 5MB

      const size = reader.result.length || reader.result.byteLength
      if (size > maxSize) {
        return cb(null, new MaxSizeError({
          fileSize: size,
          fileName: name,
          maxFileSize: maxSize
        }))
      }

      pull(
        pull.values(split(Buffer.from(reader.result), 64 * 1024)),
        pullAddBlobSink({ server, encrypt: resolve(isPrivate) }, (err, link) => {
          if (err) return cb(err)

          cb(null, { link, name, size, type })
        })
      )
    }
    reader.readAsArrayBuffer(blob)
  }
}

function pullAddBlobSink ({ server, encrypt = false }, cb) {
  var sink = pullDefer.sink()

  onceTrue(server, sbot => {
    if (!encrypt) {
      sink.resolve(sbot.blobs.add(cb))
      return
    }

    // FROM: https://github.com/ssbc/ssb-secret-blob/blob/master/index.js
    // here we need to hash something twice, first, hash the plain text to use as the
    // key. This has the benefit of encrypting deterministically - the same file will
    // have the same hash. This can be used to deduplicate storage, but has privacy
    // implications. I do it here just because it's early days and this makes testing
    // easier.

    sink.resolve(Hash(function (err, buffers, key) {
      if (err) return cb(err)
      pull(
        pull.once(Buffer.concat(buffers)),
        pullBoxStream.createBoxStream(key, zeros),
        Hash(function (err, buffers, hash) {
          if (err) return cb(err)
          var id = '&' + hash.toString('base64') + '.sha256'

          pull(
            pull.values(buffers),
            sbot.blobs.add(id, function (err) {
              if (err) return cb(err)

              sbot.blobs.push(id, function (err) {
                if (err) return cb(err)

                cb(null, id + '?unbox=' + key.toString('base64') + '.boxs')
              })
            })
          )
        })
      )
    }))
  })

  return sink
}

function Hash (cb) {
  var hash = crypto.createHash('sha256')
  var buffers = []

  return pull.drain(
    data => {
      data = typeof data === 'string' ? Buffer.from(data) : data
      buffers.push(data)
      hash.update(data)
    },
    err => cb(err, buffers, hash.digest())
  )
}
