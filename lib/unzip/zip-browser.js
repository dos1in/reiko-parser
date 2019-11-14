var zip = require('./lib/browser/zip');
var blobToBuffer = require('./lib/browser/blob-to-buffer');
var utils = require('./lib/utils');

function Unzip(file/* or blob */) {
  if (!(file instanceof Blob)) {
    throw new Error('Invalid input, expect the first param to be a File/Blob.');
  }

  if (!(this instanceof Unzip)) return new Unzip(file);

  this.file = file;
}

Unzip.prototype.destroy = function () {
  this.file = null;
};

/**
 *
 * @param {Array<String>} whatYouNeed
 * @param {Object} options       (Optional)
 * @param {String} options.type  Currently, only support 'blob', by default it will return Buffers
 * @param {Boolean} options.multiple If true, it will collect all the file which match the whtaYouNeed rule
 * @param callback Will be called like callback(err, buffers)
 */
Unzip.prototype.getBuffer = function (whatYouNeed, options, callback) {
  if (!utils.isArray(whatYouNeed) || !utils.isFunction(callback)) {
    return callback(new Error('getBuffer: invalid param, expect first param to be an Array and the second param to be a callback function'));
  }

  if (utils.isFunction(options)) {
    callback = options;
    options = {};
  }

  whatYouNeed = whatYouNeed.map(function (rule) {
    if (typeof rule === 'string') {
      rule = rule.split('\u0000').join('');
    }
    return rule;
  });

  var isMultiple = options && options.multiple || false;

  this.getEntries(function (error, entries) {
    if (error) return callback(error);

    var matchedEntries = {};

    entries.forEach(function (entry) {
      // Add regexp support
      return whatYouNeed.some(function (entryName) {
        if (utils.isThisWhatYouNeed(entryName, entry.filename)) {
          if (isMultiple) {
            var obj = { fileName: entryName, buffer: entry };
            matchedEntries[entryName]
              ? matchedEntries[entryName].push(obj)
              : (matchedEntries[entryName] = [obj]);
          } else {
            matchedEntries[entryName] = entry;
          }
          return true;
        }
      });
    });

    iterator(matchedEntries, options, function (error, bufferArray) {
      callback(error, bufferArray, entries.length);
    });
  });
};

Unzip.prototype.getEntries = function (callback) {
  zip.createReader(new zip.BlobReader(this.file), function (zipReader) {
    zipReader.getEntries(function (entries) {
      callback(null, entries, entries.length);
    });
  }, callback);
};

Unzip.getEntryData = function (entry, callback) {
  var writerType = 'blob';

  var writer = new zip.BlobWriter();

  entry.getData(writer, function (blob) {
    callback(null, blob, entry.length);
  });
};

function iterator(entries, options, callback) {
  var output = {};
  var serialize = [];
  var index = 0;

  for (var entryName in entries) {
    serialize.push({
      name: entryName,
      entry: entries[entryName]
    });
  }

  if (!serialize.length) {
    callback(null, {}, serialize.length);
  }

  serialize.forEach(function (entryInfo) {
    (function (name, entry) {
      Unzip.getEntryData(entry, function (err, blob) {
        if (err) return callback(err);

        if (options.type === 'blob') {
          add(name, blob);
          if (index >= serialize.length) {
            callback(null, output, serialize.length);
          }
        } else {
          blobToBuffer(blob, function (error, buffer) {
            if (error) {
              console.error(error);
              return callback(error);
            }
            add(name, buffer);

            if (index >= serialize.length) {
              callback(null, output, serialize.length);
            }
          });
        }
      });
    })(entryInfo.name, entryInfo.entry);
  });

  function add(name, data) {
    index++;
    output[name] = data;
  }
}

module.exports = Unzip;
