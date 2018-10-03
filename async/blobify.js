module.exports = function blobify (doc, cb) {
  if (!doc.blob) {
    doc.blob = dataURItoBlob(doc.data)
    delete doc.data
  }

  cb(null, doc)
}

function dataURItoBlob (dataURI) {
  var byteString = window.atob(dataURI.split(',')[1])
  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
  var ab = new ArrayBuffer(byteString.length)
  var ia = new Uint8Array(ab)
  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  return new window.Blob([ab], { type: mimeString })
}
