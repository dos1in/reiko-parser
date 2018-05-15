'use strict';

const ApkReader = require('./ApkReader');
const IpaReader = require('./IpaReader');

function PkgReader(path, extension, options) {
  return new (extension === 'ipa' ? IpaReader : ApkReader)(path, options);
}

module.exports = PkgReader;
