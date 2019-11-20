module.exports = (width, height, image) => {
  var ratioX = width / image.width
  var ratioY = height / image.height
  var ratio = Math.min(ratioX, ratioY)

  return {
    x: 0,
    y: 0,
    width: image.width * ratio,
    height: image.height * ratio
  }
}
