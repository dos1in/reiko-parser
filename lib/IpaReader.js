'use strict';
const Reader = require('./Reader');
const utils = require('./utils');
const plist = require('./plistParser');
const cgbiToPng = require('cgbi-to-png');

const PLIST_REG = new RegExp(/payload\/.+?\.app\/info.plist$/i);
const PROVISION_REG = new RegExp(/payload\/.+?\.app\/embedded.mobileprovision/);

const DEFAULT_OPTIONS = {
  withIcon: false
};

class IpaReader extends Reader {
  constructor(path, options) {
    super(path);
    this.options = utils.extend({}, DEFAULT_OPTIONS, (options || {}));
  }

  parse(callback) {
    const whatYouNeed = [PLIST_REG, PROVISION_REG];
    const that = this;

    this.getEntries(whatYouNeed, (error, buffers) => {
      if (error) return callback(error);

      let plistInfo;
      let provisionInfo;

      if (buffers[PLIST_REG]) {
        try {
          plistInfo = plist.parse(buffers[PLIST_REG]);
        } catch (e) {
          return callback(e);
        }
      } else {
        return callback(new Error('Parse ipa file failed, can not find info.plist.'));
      }

      if (buffers[PROVISION_REG]) {
        try {
          provisionInfo = buffers[PROVISION_REG].toString('utf-8');
          const firstIndex = provisionInfo.indexOf('<');
          const lastIndex = provisionInfo.lastIndexOf('</plist>');
          provisionInfo = provisionInfo.slice(firstIndex, lastIndex);
          provisionInfo += '</plist>';

          provisionInfo = plist.parse(provisionInfo);
        } catch (e) {
          return callback(e);
        }
      }

      plistInfo.mobileProvision = provisionInfo;

      if (that.options.withIcon) {
        const iconPath = utils.findOutIcon(plistInfo, 'ipa');

        return that.getEntry(new RegExp(iconPath.toLowerCase()), (error, icon) => {
          if (error) {
            callback(null, plistInfo);
          } else {
            try {
              const pngBuffer = cgbiToPng.revert(icon);
               plistInfo.icon = 'data:image/png;base64,' + pngBuffer.toString('base64');
               callback(null, plistInfo);
            } catch (e) {
              callback(null, plistInfo);
            }
          }
        });
      } else {
        callback(null, plistInfo);
      }
    });
  }
}

module.exports = IpaReader;
