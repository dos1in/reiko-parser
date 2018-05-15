'use strict';
const Reader = require('./Reader');
const utils = require('./utils');
const jar = require('./jar');

const YAPATCH_MF = /^yapatch\.mf$/i;
const META_INF_YAPATCH_MF = /meta-inf\/.*\.mf$/i;
const ANDROIDD_SF = /meta-inf\/.*\.sf$/i;
const ANDROIDD_RSA = /meta-inf\/.*\.*$/i;
const JS = /.*\.js$/i;

const options = {
  createdTime: /Created-Time: (.*)/,
  createdBy: /Created-By: (.*)/,
  yaPatchType: /YaPatchType: (.*)/,
  versionName: /VersionName: (.*)/,
  versionCode: /VersionCode: (.*)/,
  from: /From: (.*)/,
  to: /To: (.*)/
};

const DEFAULT_OPTIONS = {
  withIcon: false
};

class PatchReader extends Reader {
  constructor(path, options) {
    super(path);
    this.options = utils.extend({}, DEFAULT_OPTIONS, (options || {}));
  }

  parse(callback, fileInfo) {
    const whatYouNeed = [YAPATCH_MF, META_INF_YAPATCH_MF, ANDROIDD_SF, ANDROIDD_RSA, JS];
    this.getEntries(whatYouNeed, (error, buffers, entryCount) => {
      if (error) {
        return callback(error);
      }
      console.log('entryCount ==> ', entryCount);
      console.log('all ==> ', buffers[JS]);

      // 判断是否存在js文件，有且只有一个js文件才是正常的包
      if (buffers[JS]) {
        // callback(err, info)
        if (entryCount === 1) {
          return callback(null, { ios_patch: 'ok' });
        } else if (entryCount > 1) {
          return callback(new Error('Parse patch file failed, zipfile contains more than one js! It suppose to be just one js file!'));
        }
      }
      const patch = buffers[YAPATCH_MF] || buffers[META_INF_YAPATCH_MF];
      if (!patch) {
        return callback(new Error('Parse patch file failed, can not find yapatch.mf!'));
      }

      const patchMsg = {};
      const patchStr = patch.toString();
      let rsa = null;
      for (const i in options) {
        patchMsg[i] = patchStr.match(options[i])[1];
      }


      if (buffers[ANDROIDD_RSA]) {
        rsa = buffers[ANDROIDD_RSA];
      }
      // console.log('fileinfo ==> ', fileInfo)
      const tempFile = fileInfo.fileId + '.txt';

      return new Promise((resolve, reject) => {
        if (!rsa) {
          reject(new Error('没有找到签名信息！'));
        }
        resolve(jar.write(tempFile, rsa, jar.keytool, callback, patchMsg));
      });

    });
  }
}

module.exports = PatchReader;
