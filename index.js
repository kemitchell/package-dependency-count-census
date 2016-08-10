var Writable = require('readable-stream').Writable
var inherits = require('util').inherits
var normalize = require('normalize-registry-metadata')

function Follower (levelup) {
  if (!(this instanceof Follower)) {
    return new Follower(levelup)
  }
  this._sequence = 0
  Writable.call(this, {objectMode: true})
}

inherits(Follower, Writable)

var prototype = Follower.prototype

prototype._write = function (chunk, encoding, callback) {
  var self = this
  var sequence = chunk.seq
  chunk = chunk.doc

  /* istanbul ignore if */
  if (!validName(chunk.name) || !validVersions(chunk.versions)) {
    self._sequence = sequence
    self.emit('sequence', sequence)
    return callback()
  }

  normalize(chunk)
  var name = chunk.name
  var versions = chunk.versions
  Object.keys(versions).forEach(function (version) {
    self.emit('count', [
      sequence,
      name,
      version,
      Object.keys(versions[version] || {}).length
    ])
  })
  callback()
}

function validName (argument) {
  return typeof argument === 'string' && argument.length !== 0
}

function validVersions (argument) {
  return typeof argument === 'object'
}

var ChangesStream = require('changes-stream')

var changes = new ChangesStream({
  db: 'https://replicate.npmjs.com',
  include_docs: true,
  since: 1
})

var follower = new Follower()

changes
.on('error', logError)
.pipe(follower)
.on('error', logError)
.on('count', function (data) {
  console.log(
    data
    .map(function (element) {
      return element.toString()
    })
    .join('\t')
  )
})

function logError (error) {
  console.error(error)
  process.exit(1)
}

