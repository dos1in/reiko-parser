'use strict';
/**
 * Code translated from a C# project https://github.com/hylander0/Iteedee.ApkReader/blob/master/Iteedee.ApkReader/ApkResourceFinder.cs
 *
 * Decode binary file `resources.arsc` from a .apk file to a JavaScript Object.
 */

const ByteBuffer = require('bytebuffer');

const DEBUG = false;

const RES_STRING_POOL_TYPE = 0x0001;
const RES_TABLE_TYPE = 0x0002;
const RES_TABLE_PACKAGE_TYPE = 0x0200;
const RES_TABLE_TYPE_TYPE = 0x0201;
const RES_TABLE_TYPE_SPEC_TYPE = 0x0202;


// // Contains no data.
// var TYPE_NULL = 0x00;
// // The 'data' holds an attribute resource identifier.
// var TYPE_ATTRIBUTE = 0x02;
// // The 'data' holds a single-precision floating point number.
// var TYPE_FLOAT = 0x04;
// // The 'data' holds a complex number encoding a dimension value,
// // such as "100in".
// var TYPE_DIMENSION = 0x05;
// // The 'data' holds a complex number encoding a fraction of a
// // container.
// var TYPE_FRACTION = 0x06;
// // The 'data' is a raw integer value of the form n..n.
// var TYPE_INT_DEC = 0x10;
// // The 'data' is a raw integer value of the form 0xn..n.
// var TYPE_INT_HEX = 0x11;
// // The 'data' is either 0 or 1, for input "false" or "true" respectively.
// var TYPE_INT_BOOLEAN = 0x12;
// // The 'data' is a raw integer value of the form #aarrggbb.
// var TYPE_INT_COLOR_ARGB8 = 0x1c;
// // The 'data' is a raw integer value of the form #rrggbb.
// var TYPE_INT_COLOR_RGB8 = 0x1d;
// // The 'data' is a raw integer value of the form #argb.
// var TYPE_INT_COLOR_ARGB4 = 0x1e;
// // The 'data' is a raw integer value of the form #rgb.
// var TYPE_INT_COLOR_RGB4 = 0x1f;

// The 'data' holds a ResTable_ref, a reference to another resource
// table entry.
const TYPE_REFERENCE = 0x01;
// The 'data' holds an index into the containing resource table's
// global value string pool.
const TYPE_STRING = 0x03;

class ResourceFinder {
  constructor() {
    this.valueStringPool = null;
    this.typeStringPool = null;
    this.keyStringPool = null;

    this.package_id = 0;

    this.responseMap = {};
    this.entryMap = {};
  }


  // Same to C# BinaryReader.readBytes
  readBytes(bb, len) {
    const uint8Array = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      uint8Array[i] = bb.readUint8();
    }

    return ByteBuffer.wrap(uint8Array, 'binary', true);
  }


  processResourceTable(resourceBuffer) {

    const bb = ByteBuffer.wrap(resourceBuffer, 'binary', true);

    // Resource table structure
    const type = bb.readShort();
    const headerSize = bb.readShort();
    const size = bb.readInt();
    const packageCount = bb.readInt();

    if (type !== RES_TABLE_TYPE) {
      throw new Error('No RES_TABLE_TYPE found!');
    }
    if (size !== bb.limit) {
      throw new Error('The buffer size not matches to the resource table size.');
    }

    bb.offset = headerSize;

    let realStringPoolCount = 0;
    let realPackageCount = 0;
    let pos;
    let t;
    let s;

    for (; ;) {
      try {
        pos = bb.offset;
        t = bb.readShort();
        // hs
        bb.readShort();
        s = bb.readInt();
      } catch (e) {
        break;
      }

      if (t === RES_STRING_POOL_TYPE) {
        // Process the string pool
        if (realStringPoolCount === 0) {
          // Only the first string pool is processed.
          if (DEBUG) {
            console.log('Processing the string pool ...');
          }

          const buffer = new ByteBuffer(s);
          bb.offset = pos;
          bb.prependTo(buffer);

          const bb2 = ByteBuffer.wrap(buffer, 'binary', true);

          bb2.LE();
          this.valueStringPool = this.processStringPool(bb2);
        }

        realStringPoolCount++;
      } else if (t === RES_TABLE_PACKAGE_TYPE) {
        // Process the package
        if (DEBUG) {
          console.log('Processing the package ' + realPackageCount + ' ...');
        }

        const buffer = new ByteBuffer(s);
        bb.offset = pos;
        bb.prependTo(buffer);

        const bb2 = ByteBuffer.wrap(buffer, 'binary', true);
        bb2.LE();
        this.processPackage(bb2);

        realPackageCount++;
      } else {
        console.error('Unsupported type');
      }

      bb.offset = pos + s;

      if (!bb.remaining()) {
        break;
      }
    }

    if (realStringPoolCount !== 1) {
      throw new Error('More than 1 string pool found!');
    }
    if (realPackageCount !== packageCount) {
      throw new Error(
        'Real package count not equals the declared count.');
    }

    return this.responseMap;
  }

  processPackage(bb) {
    // Package structure
    // type
    bb.readShort();
    const headerSize = bb.readShort();
    // size
    bb.readInt();
    const id = bb.readInt();

    this.package_id = id;

    for (let i = 0; i < 256; ++i) {
      bb.readUint8();
    }

    const typeStrings = bb.readInt();
    // lastPublicType
    bb.readInt();
    const keyStrings = bb.readInt();
    // lastPublicKey
    bb.readInt();

    if (typeStrings !== headerSize) {
      throw new Error('TypeStrings must immediately following the package structure header.');
    }

    if (DEBUG) {
      console.log('Type strings:');
    }

    let lastPosition = bb.offset;
    bb.offset = typeStrings;
    const bbTypeStrings = this.readBytes(bb, (bb.limit - bb.offset));
    bb.offset = lastPosition;
    this.typeStringPool = this.processStringPool(bbTypeStrings);

    // Key strings
    if (DEBUG) {
      console.log('Key strings:');
    }

    bb.offset = keyStrings;
    // key_type
    bb.readShort();
    // key_headerSize
    bb.readShort();
    const key_size = bb.readInt();

    lastPosition = bb.offset;
    bb.offset = keyStrings;
    const bbKeyStrings = this.readBytes(bb, (bb.limit - bb.offset));
    bb.offset = lastPosition;
    this.keyStringPool = this.processStringPool(bbKeyStrings);

    // Iterate through all chunks
    bb.offset = keyStrings + key_size;

    let bb2;
    let pos;
    let t;

    let s;

    for (; ;) {
      pos = bb.offset;
      try {
        t = bb.readShort();
        // hs
        bb.readShort();
        s = bb.readInt();
      } catch (e) {
        break;
      }

      // let typeSpecCount = 0;
      // let typeCount = 0;
      if (t === RES_TABLE_TYPE_SPEC_TYPE) {
        bb.offset = pos;
        bb2 = this.readBytes(bb, s);
        this.processTypeSpec(bb2);

        // typeSpecCount++;
      } else if (t === RES_TABLE_TYPE_TYPE) {
        bb.offset = pos;
        bb2 = this.readBytes(bb, s);
        this.processType(bb2);

        // typeCount++;
      }

      if (s === 0) {
        break;
      }

      bb.offset = pos + s;

      if (!bb.remaining()) {
        break;
      }
    }
  }

  processType(bb) {
    // type
    bb.readShort();
    const headerSize = bb.readShort();
    // size
    bb.readInt();
    const id = bb.readByte();
    // res0
    bb.readByte();
    // res1
    bb.readShort();
    const entryCount = bb.readInt();
    const entriesStart = bb.readInt();

    const refKeys = {};
    // config_size
    bb.readInt();

    // Skip the config data
    bb.offset = headerSize;

    if (headerSize + entryCount * 4 !== entriesStart) {
      throw new Error('HeaderSize, entryCount and entriesStart are not valid.');
    }

    // Start to get entry indices
    const entryIndices = new Array(entryCount);
    for (let i = 0; i < entryCount; ++i) {
      entryIndices[i] = bb.readInt();
    }

    // Get entries
    for (let i = 0; i < entryCount; ++i) {
      if (entryIndices[i] === -1) {
        continue;
      }
      const resource_id = (this.package_id << 24) | (id << 16) | i;
      // pos
      bb.offset;
      // entry_size
      bb.readShort();
      const entry_flag = bb.readShort();
      const entry_key = bb.readInt();

      // Get the value (simple) or map (complex)

      const FLAG_COMPLEX = 0x0001;
      if ((entry_flag & FLAG_COMPLEX) === 0) {
        // value_size
        bb.readShort();
        // value_res0
        bb.readByte();
        const value_dataType = bb.readByte();
        const value_data = bb.readInt();

        const idStr = Number(resource_id).toString(16);
        const keyStr = this.keyStringPool[entry_key];

        if (DEBUG) {
          console.log('Entry 0x' + idStr + ', key: ' + keyStr + ', simple value type: ');
        }

        const key = parseInt(idStr, 16);

        let entryArr = this.entryMap[key];
        if (entryArr == null) {
          entryArr = [];
        }
        entryArr.push(keyStr);

        this.entryMap[key] = entryArr;
        let data;
        if (value_dataType === TYPE_STRING) {
          data = this.valueStringPool[value_data];

          if (DEBUG) {
            console.log(', data: ' + data + '');
          }
        } else if (value_dataType === TYPE_REFERENCE) {
          // const hexIndex = Number(value_data).toString(16);
          refKeys[idStr] = value_data;
        } else {
          data = value_data;
          if (DEBUG) {
            console.log(', data: ' + data + '');
          }
        }
        this.putIntoMap('@' + idStr, data);
      } else {
        // Complex case
        // entry_parent
        bb.readInt();
        const entry_count = bb.readInt();

        for (let j = 0; j < entry_count; ++j) {
          // ref_name
          bb.readInt();
          // value_size
          bb.readShort();
          // value_res0
          bb.readByte();
          // value_dataType
          bb.readByte();
          // value_data
          bb.readInt();
        }

        if (DEBUG) {
          console.log('Entry 0x'
            + Number(resource_id).toString(16) + ', key: '
            + this.keyStringPool[entry_key]
            + ', complex value, not printed.');
        }
      }
    }

    for (const refK in refKeys) {
      const values = this.responseMap['@' + Number(refKeys[refK]).toString(16).toUpperCase()];
      if (values != null) {
        for (const value in values) {
          this.putIntoMap('@' + refK, value);
        }
      }
    }
  }

  processStringPool(bb) {
    // String pool structure
    // type
    bb.readShort();
    // headerSize
    bb.readShort();
    // size
    bb.readInt();
    const stringCount = bb.readInt();
    // styleCount
    bb.readInt();
    const flags = bb.readInt();
    const stringsStart = bb.readInt();
    // stylesStart
    bb.readInt();

    const isUTF_8 = (flags & 256) !== 0;

    const offsets = new Array(stringCount);
    for (let i = 0; i < stringCount; ++i) {
      offsets[i] = bb.readInt();
    }

    const strings = new Array(stringCount);

    for (let i = 0; i < stringCount; ++i) {

      const pos = stringsStart + offsets[i];
      bb.offset = pos;

      strings[i] = '';

      if (isUTF_8) {
        let u16len = bb.readUint8();

        if ((u16len & 0x80) !== 0) {
          u16len = ((u16len & 0x7F) << 8) + bb.readUint8();
        }

        let u8len = bb.readUint8();
        if ((u8len & 0x80) !== 0) {
          u8len = ((u8len & 0x7F) << 8) + bb.readUint8();
        }

        if (u8len > 0) {
          const buffer = this.readBytes(bb, u8len);
          try {
            strings[i] = ByteBuffer.wrap(buffer, 'utf8', true).toString('utf8');
          } catch (e) {
            if (DEBUG) {
              console.error(e);
              console.log('Error when turning buffer to utf-8 string.');
            }
          }
        } else {
          strings[i] = '';
        }
      } else {
        let u16len = bb.readUint16();
        if ((u16len & 0x8000) !== 0) { // larger than 32768
          u16len = ((u16len & 0x7FFF) << 16) + bb.readUint16();
        }

        if (u16len > 0) {
          const len = u16len * 2;
          const buffer = this.readBytes(bb, len);
          try {
            strings[i] = ByteBuffer.wrap(buffer, 'utf8', true).toString('utf8');
          } catch (e) {
            if (DEBUG) {
              console.error(e);
              console.log('Error when turning buffer to utf-8 string.');
            }
          }
        }
      }

      if (DEBUG) {
        console.log('Parsed value: {0}', strings[i]);
      }
    }

    return strings;
  }

  processTypeSpec(bb) {
    // type
    bb.readShort();
    // headerSize
    bb.readShort();
    // size
    bb.readInt();
    const id = bb.readByte();
    // res0
    bb.readByte();
    // res1
    bb.readShort();
    const entryCount = bb.readInt();

    if (DEBUG) {
      console.log('Processing type spec ' + this.typeStringPool[id - 1] + '...');
    }


    const flags = new Array(entryCount);

    for (let i = 0; i < entryCount; ++i) {
      flags[i] = bb.readInt();
    }
  }

  putIntoMap(resId, value) {
    let valueList = this.responseMap[resId.toUpperCase()];

    if (valueList == null) {
      valueList = [];
    }
    valueList.push(value);

    this.responseMap[resId.toUpperCase()] = valueList;
  }
}

module.exports = ResourceFinder;
