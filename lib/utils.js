'use strict';
function toArray(arrayLikeObj) {
  if (!arrayLikeObj) return [];

  return Array.prototype.slice.call(arrayLikeObj);
}

function extend(destObject) {
  const args = toArray(arguments);

  if (args.length === 1) {
    return destObject;
  }

  args.shift();

  // 从前往后遍历
  for (let i = 0, l = args.length; i < l; i++) {
    for (const key in args[i]) {
      if (args[i].hasOwnProperty(key)) {
        destObject[key] = args[i][key];
      }
    }
  }

  return destObject;
}

function isEmpty(obj) {
  for (const i in obj) {
    return false;
  }
  return true;
}

function isTypeOf(something, type) {
  if (!type) return false;

  type = type.toLowerCase();

  const realTypeString = Object.prototype.toString.call(something);

  return realTypeString.toLowerCase() === '[object ' + type + ']';
}

function isArray(something) {
  return isTypeOf(something, 'array');
}

function isFunction(something) {
  return typeof something === 'function';
}

function isString(something) {
  return typeof something === 'string';
}

function isDefined(something) {
  return !(typeof something === 'undefined');
}

function isObject(something) {
  return typeof something === 'object';
}

function isPrimitive(something) {
  return something === null ||
    typeof something === 'boolean' ||
    typeof something === 'number' ||
    typeof something === 'string' ||
    typeof something === 'undefined';
}

function isReg(something) {
  return isTypeOf(something, 'regexp');
}

function findOutResources(apkInfo, resourceMapStr) {

  const resourceMap = {};

  iteratorObj(apkInfo);

  return resourceMap;

  function iteratorObj(obj) {
    for (const i in obj) {
      if (isArray(obj[i])) {
        iteratorArray(obj[i]);
      } else if (isObject(obj[i])) {
        iteratorObj(obj[i]);
      } else if (isPrimitive(obj[i])) {
        if (isResouces(obj[i])) {
          obj[i] = resourceMapStr[transKeyToMatchResourceMap(obj[i])];
        }
      }
    }
  }

  function iteratorArray(array) {
    for (let i = 0, l = array.length; i < l; i++) {
      if (isArray(array[i])) {
        iteratorArray(array[i]);
      } else if (isObject(array[i])) {
        iteratorObj(array[i]);
      } else if (isPrimitive(array[i])) {
        if (isResouces(array[i])) {
          array[i] = resourceMapStr[transKeyToMatchResourceMap(array[i])];
        }
      }
    }
  }
}

function startWith(str, prefix) {
  return str.indexOf(prefix) === 0;
}

function isResouces(attrValue) {
  if (!attrValue) return false;
  if (typeof attrValue !== 'string') {
    attrValue = attrValue.toString();
  }
  return startWith(attrValue, 'resourceId:');
}

function transKeyToMatchResourceMap(resourceId) {
  return '@' + resourceId.replace('resourceId:0x', '').toUpperCase();
}

function castLogger(doWhat, fromWhen) {
  console.log(doWhat + ' cost: ' + (Date.now() - fromWhen) + 'ms');
}

function findOutIcon(pkgInfo, extension) {
  if (extension === 'apk') {
    if (pkgInfo.application.icon && pkgInfo.application.icon.splice) {
      const rulesMap = {
        ldpi: 120,
        mdpi: 160,
        hdpi: 240,
        xhdpi: 320,
        xxhdpi: 480,
        xxxhdpi: 640
      };

      const resultMap = {};

      let maxDpiIcon = {
        dpi: 120,
        icon: ''
      };

      for (const i in rulesMap) {
        pkgInfo.application.icon.some(icon => {
          if (icon && icon.indexOf(i) > -1) {
            resultMap['application-icon-' + rulesMap[i]] = icon;
            return true;
          }
          return false;
        });

        // 单独取出最大的
        if (resultMap['application-icon-' + rulesMap[i]] && rulesMap[i] >= maxDpiIcon.dpi) {
          maxDpiIcon = {
            dpi: rulesMap[i],
            icon: resultMap['application-icon-' + rulesMap[i]]
          };
        }
      }

      if (isEmpty(resultMap) || !maxDpiIcon.icon) {
        maxDpiIcon = {
          dpi: 120,
          icon: pkgInfo.application.icon[0] || ''
        };
        resultMap['applicataion-icon-120'] = maxDpiIcon.icon;
      }

      return maxDpiIcon.icon;
    }
    console.error('Unexpected icon type,', pkgInfo.application.icon);
  } else if (extension === 'ipa') {
    if (pkgInfo.CFBundleIcons && pkgInfo.CFBundleIcons.CFBundlePrimaryIcon
      && pkgInfo.CFBundleIcons.CFBundlePrimaryIcon.CFBundleIconFiles &&
      pkgInfo.CFBundleIcons.CFBundlePrimaryIcon.CFBundleIconFiles.length) {
      // It's an array...just try the last one
      return pkgInfo.CFBundleIcons.CFBundlePrimaryIcon.CFBundleIconFiles[pkgInfo.CFBundleIcons.CFBundlePrimaryIcon.CFBundleIconFiles.length - 1];
    }
    // Maybe there is a default one
    return '.app/Icon.png';
  } else {
    console.warn('Unexpected extension', extension);
  }
}

module.exports = {
  findOutResources,
  toArray,
  extend,
  startWith,
  isResouces,
  transKeyToMatchResourceMap,
  castLogger,
  isTypeOf,
  isArray,
  isFunction,
  isString,
  isDefined,
  isObject,
  isReg,
  findOutIcon,
  isEmpty
};
