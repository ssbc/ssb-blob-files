# ssb-blob-files

Channel a bunch of files from a dom event into the blob store.
Get some tweaks and checks made along the way.

## Usage

```js
var h = require('mutant/h')
var blobFiles = require('ssb-blob-files')

var opts = {
  stripExif: true,
  resize: { width: 640, height: 480 },
  isPrivate: true
}

var fileInput = h('input', {
  type: 'file',
  attributes: { multiple: true }, // permit multiple files to be attached
  'ev-change': (ev) => {
    var files = ev.target.files
    blobFiles(files, server, opts, (err, result) => {  // server is a connection to scuttlebutt server
      ev.target.value = ''

      if (err) console.log('oh noes') 
      else // do something with the result data
    }
  })
})
```

## API

### `blobFiles(files, server, opts cb)`

`files` - an Array of files of the format delivered by file input events

`server` - a connection to a scuttlebot server (either an ssb-client instance, or an observeable which resolves to one)

`opts` - (optional) an options Object of the form:

```js
{
  stripExif: Boolean,   // (default: false) removes exif data from images (geo-location, camera meta data, etc)
  resize: Object,       // (default: undefined) resizes image if possible. Expected properties: width, height
  quality: Number,      // (default: 0.85) tune the compression of jpegs. value between 0 and 1
  isPrivate: Boolean    // (default: false) encrypts the blob
}
```

If a blob is private, it gets encryted and the unbox key is attached to the end of the `link` property in the `result` output (see `cb` details)

`cb` - a callback with signature `(err, result)` which is run _for each file that is processed_.
The shape of the result object is

```js
{
  link: BlobId,  // hash id in the blob store, will have an unbox key on the end if isPrivate was true
  name: String,  // the filename
  size: Integer, // size in bytes
  type: String   // the MimeType
}
```
