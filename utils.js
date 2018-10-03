module.exports = {
  resolve,
  onceTrue
}

// stolen from mutant:

function resolve (source) {
  return typeof source === 'function' ? source() : source
}

function onceTrue (value, fn) {
  var done = false
  var release = watch(value, (v) => {
    if (v && !done) {
      done = true
      setImmediate(doRelease)
      fn(v)
    }
  }, { nextTick: true })

  return release

  function doRelease () {
    release()
  }
}

function watch (observable, listener) {
  listener = listener || noop
  if (typeof observable === 'function') {
    var remove = observable(listener)
    listener(observable())
    return remove
  } else {
    listener(observable)
    return noop
  }
}

function noop () {}
