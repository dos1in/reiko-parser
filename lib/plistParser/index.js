'use strict';
const plist = require('./xmlPlistParser');
const bplist = require('./bplistParser');

exports.parse = aStringOrBuffer => {
  let results;
  const firstByte = aStringOrBuffer[0];
  try {
    if (firstByte === 60 || firstByte === '<' || firstByte === 239) {
      results = plist.parse(aStringOrBuffer.toString());
    } else if (firstByte === 98) {
      results = bplist.parseBuffer(aStringOrBuffer)[0];
    } else {
      console.error("Unable to determine format for plist aStringOrBuffer: '%s'", aStringOrBuffer);
      results = {};
    }
  } catch (e) {
    console.error(e);
  }
  return results;
};
