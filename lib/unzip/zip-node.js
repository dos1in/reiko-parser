const yauzl = require('yauzl');
const utils = require('./utils');

function Unzip(destPath) {
  if (!(this instanceof Unzip)) return new Unzip(path);
  this.path = destPath;
}

Unzip.prototype.destroy = function () {
  this.path = null;
};

/**
 * Iterator all entries,
 *
 * @param callback
 * @param onEnd
 */
Unzip.prototype.getEntries = function (callback, onEnd) {
  yauzl.open(this.path, { lazyEntries: true }, function (err, zipfile) {
    if (err) {
      callback(err);
      return;
    }

    function next() {
      zipfile.readEntry();
    }

    zipfile.on('entry', function (entry) {
      callback(null, zipfile, entry, next);
    });

    zipfile.on('end', function () {
      if (utils.isFunction(onEnd)) {
        onEnd();
      }
    });

    next();
  });
};

/**
 *
 * @param {Array<String>} whatYouNeed
 * @param {Object}        options       In node, we don't support any options now.
 * @param callback Will be called like callback(err, buffers)
 * 
 * @param options.multiple {boolean} if this param is true, getBuffer will return all the file which match the whatYouNeed reg in an array, each item would be an Object with two props, fileName and buffer
 */
Unzip.prototype.getBuffer = function (whatYouNeed, options, callback) {
  var finishedNumber = 0;
  const output = {};
  var entryCount = 0;
  var isMutiple = options && options.multiple || false;
  var currentIndex = 0;

  if (utils.isFunction(options)) {
    callback = options;
  }

  whatYouNeed = whatYouNeed.map(function (rule) {
    if (typeof rule === 'string') {
      rule = rule.split('\u0000').join('');
    }
    return rule;
  });

  this.getEntries(function (error, zipfile, entry, next) {
    if (error) return callback(error);
    entryCount = zipfile.entryCount;
    currentIndex++;
    var findIt = whatYouNeed.some(function (rule) {
      if (utils.isThisWhatYouNeed(rule, entry.fileName)) {
        Unzip.getEntryData(zipfile, entry, function (error, buffer) {
          if (error) {
            callback(error);
            return;
          }

          if (isMutiple) {
            var obj = {
              fileName: entry.fileName,
              buffer: buffer
            };
            if (output[rule]) {
              output[rule].push(obj);
            } else {
              output[rule] = [obj];
              finishedNumber++;
            }
          } else {
            output[rule] = buffer;
            finishedNumber++;
          }

          if (finishedNumber >= whatYouNeed.length && !isMutiple) {
            callback(null, output, entryCount);
          } else {
            next();
          }
        });
        return true;
      }
    });

    if (!findIt) next();

  }, function () {
    if ((finishedNumber < whatYouNeed.length) || (isMutiple && currentIndex >= entryCount)) {
      callback(null, output, entryCount);
    }
  });
};

Unzip.getEntryData = function (zipfile, entry, callback) {
  const bufferArr = [];
  zipfile.openReadStream(entry, function (err, readStream) {
    if (err) {
      callback(err);
      readStream.destroy();
      return;
    }

    readStream.on('data', function (chunk) {
      bufferArr.push(chunk);
    });

    readStream.on('end', function () {
      const buffer = Buffer.concat(bufferArr);
      callback(null, buffer);
      readStream.destroy();
    });
  });
};

module.exports = Unzip;
