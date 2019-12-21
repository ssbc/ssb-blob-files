const test = require('tape')
const resizeDimensions = require('../lib/resize-dimensions')

test('image resize', (t) => {
  const image = { width: 100, height: 100 }
  const newSize = 10
  const final = resizeDimensions(newSize, newSize, image)

  t.equal(final.width - final.x, newSize, 'correct width')
  t.equal(final.height - final.y, newSize, 'correct height')

  t.equal(final.x, 0, 'no width crop')
  t.equal(final.y, 0, 'no height crop')
  t.end()
})
