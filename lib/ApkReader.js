'use strict';
const Reader = require('./Reader');
const ManifestParser = require('./manifest');
const utils = require('./utils');

const MANIFEST_FTIL_NAME = /^androidmanifest\.xml$/;
const RESOURCE_FILE_NAME = /^resources\.arsc$/;

const DEFAULT_OPTIONS = {
  ignore: [
    'uses-sdk.minSdkVersion',
    'application.activity',
    'application.service',
    'application.receiver',
    'application.provider'
  ],
  searchResource: true,
  withIcon: false
};

class ApkReader extends Reader {
  constructor(path, options) {
    super(path);
    this.options = utils.extend({}, DEFAULT_OPTIONS, (options || {}));
  }

  parse(callback) {
    const that = this;

    const whatYouNeed = [MANIFEST_FTIL_NAME];

    if (this.options.searchResource) whatYouNeed.push(RESOURCE_FILE_NAME);

    this.getEntries(whatYouNeed, (error, buffers) => {
      if (error) return callback(error);
      that.parseManifest(buffers[MANIFEST_FTIL_NAME], (error, apkInfo) => {
        if (error) return callback(error);

        if (that.options.searchResource) {
          that.parseResorceMap(buffers[RESOURCE_FILE_NAME], (error, resourceMapStr) => {
            if (error) {
              return callback(error);
            }

            utils.findOutResources(apkInfo, resourceMapStr);

            if (that.options.withIcon) {
              const iconPath = utils.findOutIcon(apkInfo, 'apk');

              if (iconPath) {
                return that.getEntry(iconPath, (error, icon) => {
                  if (error) {
                    console.error('Error happened when try paring icon.');
                    console.error(error);
                    return callback(null, apkInfo);
                  }
                  apkInfo.icon = 'data:image/png;base64,' + icon.toString('base64');
                  callback(null, apkInfo);
                });
              }
            }

            callback(null, apkInfo);
          });
        }
      });
    });
  }

  parseManifest(manifestBuffer, callback) {
    let apkInfo;
    try {
      apkInfo = new ManifestParser(manifestBuffer, {
        ignore: [
          'application.activity',
          'application.service',
          'application.receiver',
          'application.provider',
          'permission-group'
        ]
      }).parse();
    } catch (e) {
      return callback(e);
    }
    callback(null, apkInfo);
  }
}

module.exports = ApkReader;
