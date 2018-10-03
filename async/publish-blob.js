const pull = Object.assign(require('pull-stream'), {
  defer: require('pull-defer'),
  boxStream: require('pull-box-stream'),
  addBlob: AddBlobSink
})
const split = require('split-buffer')
const crypto = require('crypto')
const zeros = Buffer.alloc(24, 0)
const { resolve, onceTrue } = require('../utils')

const MAX_SIZE = 5 * 1024 * 1024 // 5MB

module.exports = function publishBlob ({ server, isPrivate }) {
  return function (doc, cb) {
    const { name, mimeType: type, blob } = doc

    var reader = new global.FileReader()
    reader.onload = function () {
      // TODO bail out and run onError(?) if size > 5MB

      const size = reader.result.length || reader.result.byteLength
      if (size > MAX_SIZE) {
        const humanSize = Math.ceil(size / (1024 * 1024) * 10) / 10
        cb(null, new Error(`${name} (${humanSize} MB) is larger than the allowed limit of 5MB `))
        return
      }

      pull(
        pull.values(split(new Buffer(reader.result), 64 * 1024)),
        pull.addBlob({ server, encrypt: resolve(isPrivate) }, (err, link) => {
          if (err) return cb(err)

          cb(null, { link, name, size, type })
        })
      )
    }
    reader.readAsArrayBuffer(blob)
  }
}

function AddBlobSink ({ server, encrypt = false }, cb) {
  var sink = pull.defer.sink()

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
        pull.boxStream.createBoxStream(key, zeros),
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
      data = typeof data === 'string' ? new Buffer(data) : data
      buffers.push(data)
      hash.update(data)
    },
    err => cb(err, buffers, hash.digest())
  )
}
