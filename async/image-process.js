const piexif = require('piexifjs')
const resizeDimensions = require('../lib/resize-dimensions')
const { resolve } = require('../utils')

module.exports = function imageProcess (opts) {
  const { quality = 0.85, resize, stripExif } = opts

  return function (doc, cb) {
    var orientation = 0
    if (doc.mimeType === 'image/jpeg') {
      try {
        orientation = getOrientation(doc.data)
        if (resolve(stripExif) === true) doc.data = removeExif(doc.data, orientation)
      } catch (ex) {
        console.log('exif exception:', ex)
      }
    }

    // handle exif orientation data and resize
    if (orientation >= 3 || resize) {
      getImage(doc.data, (image) => {
        image = rotate(image, orientation)
        if (resize) {
          image = doResize(image, resize.width, resize.height)
        }
        if (image.toBlob) {
          if (doc.mimeType !== 'image/jpeg' && doc.mimeType !== 'image/png') {
            doc.mimeType = 'image/jpeg'
          }
          image.toBlob(blob => {
            doc.blob = blob
            delete doc.data
            cb(null, doc)
          }, doc.mimeType, quality)
        } else {
          cb(null, doc)
        }
      })
    } else {
      cb(null, doc)
    }
  }
}

function getImage (data, cb) {
  var image = document.createElement('img')
  image.onload = () => cb(image)
  image.src = data
  image.style.display = 'block'
  //if (image.complete) cb(image)
}

function doResize (image, width, height) {
  if (image.height < height && image.width < width)
    return image

  const final = resizeDimensions(width, height, image)

  var canvas = document.createElement('canvas')
  canvas.width = final.width
  canvas.height = final.height

  var ctx = canvas.getContext('2d')
  ctx.drawImage(image, final.x, final.y, final.width, final.height)

  return canvas
}

function removeExif (fileData, orientation) {
  var clean = piexif.remove(fileData)
  if (orientation !== undefined) { // preserve
    var exifData = { '0th': {} }
    exifData['0th'][piexif.ImageIFD.Orientation] = orientation
    var exifStr = piexif.dump(exifData)
    return piexif.insert(exifStr, clean)
  } else {
    return clean
  }
}

function getOrientation (fileData) {
  var exif = piexif.load(fileData)
  return exif['0th'][piexif.ImageIFD.Orientation]
}

function rotate (img, orientation) {
  var canvas = document.createElement('canvas')
  var ctx = canvas.getContext('2d')

  if (orientation === 6 || orientation === 8) {
    canvas.width = img.height
    canvas.height = img.width
    ctx.translate(img.height / 2, img.width / 2)
    if (orientation === 6) {
      ctx.rotate(0.5 * Math.PI)
    } else {
      ctx.rotate(1.5 * Math.PI)
    }
  } else if (orientation === 3) {
    canvas.width = img.width
    canvas.height = img.height
    ctx.translate(img.width / 2, img.height / 2)
    ctx.rotate(1 * Math.PI)
  } else {
    return img
  }

  ctx.drawImage(img, -img.width / 2, -img.height / 2)
  return canvas
}

