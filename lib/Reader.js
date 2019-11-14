'use strict';
const Unzip = typeof  window === 'undefined' ? require('./unzip/zip-node') : require('./unzip/zip-browser');
const ResourceFinder = require('./ResourceFinder');
const utils = require('./utils');

/**
 *
 * @param {Any} path    In browser, path must be a File object or a Blob. In NodeJS, this must be a string of your file's path.
 * @constructor
 */
class Reader {
  constructor(path) {
    this.path = path;
    this.unzip = new Unzip(path);
  }

  parseResorceMap(resourceBuffer, callback) {
    let res;
    try {
      res = new ResourceFinder().processResourceTable(resourceBuffer);
    } catch (e) {
      return callback(e);
    }

    callback(null, res);
  }

  /**
   *
   *
   * @param {Array<String>} whatYouNeed    Entries' name
   * @param {Object}        options        (Optional)
   * @param {String}        options.type   By default, this function will return an Object of buffers.
   *                                       If options.type='blob', it will return blobs in browser.
   *                                       It won't do anything in NodeJS.
   * @param {Function}      callback       Will be called like `callback(error, buffers)`
   */
  getEntries(whatYouNeed, options, callback) {
    if (utils.isFunction(options)) {
      callback = options;
      options = {};
    }

    whatYouNeed = whatYouNeed.map(rule => {
      if (typeof rule === 'string') rule = rule.split('\u0000').join('');
      return rule;
    });

    this.unzip.getBuffer(whatYouNeed, options, (error, buffers, entryCount) => {
      callback(error, buffers, entryCount);
    });
  }

  getEntry(entryName, options, callback) {
    if (utils.isFunction(options)) {
      callback = options;
      options = {};
    }
    if (typeof entryName === 'string') entryName = entryName.split('\u0000').join('');

    this.unzip.getBuffer([entryName], options, (error, buffers) => {
      callback(error, buffers[entryName]);
    });
  }
}

module.exports = Reader;
