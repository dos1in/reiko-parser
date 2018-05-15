'use strict';

const ApkReader = require('./lib/ApkReader');
const IpaReader = require('./lib/IpaReader');

function PkgReader(path, extension, options) {
  return new (extension === 'ipa' ? IpaReader : ApkReader)(path, options);
}

module.exports = PkgReader;
