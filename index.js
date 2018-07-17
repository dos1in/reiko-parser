'use strict';

const ApkReader = require('./distribution/ApkReader');
const IpaReader = require('./distribution/IpaReader');

function PkgReader(path, extension, options) {
  return new (extension === 'ipa' ? IpaReader : ApkReader)(path, options);
}

module.exports = PkgReader;
