'use strict';
const DOMParser = require('xmldom').DOMParser;

/**
 * Module exports.
 */

exports.parse = parse;

/**
 * We ignore raw text (usually whitespace), <!-- xml comments -->,
 * and raw CDATA nodes.
 *
 * @param {Element} node
 * @returns {Boolean}
 * @api private
 */

function shouldIgnoreNode(node) {
  return node.nodeType === 3 // text
    || node.nodeType === 8 // comment
    || node.nodeType === 4; // cdata
}


/**
 * Parses a Plist XML string. Returns an Object.
 *
 * @param {String} xml - the XML String to decode
 * @returns {Mixed} the decoded value from the Plist XML
 * @api public
 */

function parse(xml) {
  const doc = new DOMParser().parseFromString(xml);
  if (doc.documentElement.nodeName !== 'plist') {
    throw new Error('malformed document. First element should be <plist>');
  }
  let plist = parsePlistXML(doc.documentElement);

  // the root <plist> node gets interpreted as an Array,
  // so pull out the inner data first
  if (plist.length === 1) plist = plist[0];

  return plist;
}

/**
 * Convert an XML based plist document into a JSON representation.
 *
 * @param {Object} xml_node - current XML node in the plist
 * @returns {Mixed} built up JSON object
 * @api private
 */

function parsePlistXML(node) {

  if (!node) {
    return null;
  }


  if (node.nodeName === 'plist') {
    const new_arr = [];
    for (let i = 0; i < node.childNodes.length; i++) {
      // ignore comment nodes (text)
      if (!shouldIgnoreNode(node.childNodes[i])) {
        new_arr.push(parsePlistXML(node.childNodes[i]));
      }
    }
    return new_arr;

  } else if (node.nodeName === 'dict') {
    const new_obj = {};
    let key = null;
    for (let i = 0; i < node.childNodes.length; i++) {
      // ignore comment nodes (text)
      if (!shouldIgnoreNode(node.childNodes[i])) {
        if (key === null) {
          key = parsePlistXML(node.childNodes[i]);
        } else {
          new_obj[key] = parsePlistXML(node.childNodes[i]);
          key = null;
        }
      }
    }
    return new_obj;

  } else if (node.nodeName === 'array') {
    const new_arr = [];
    for (let i = 0; i < node.childNodes.length; i++) {
      // ignore comment nodes (text)
      if (!shouldIgnoreNode(node.childNodes[i])) {
        const res = parsePlistXML(node.childNodes[i]);
        if (res != null) {
          new_arr.push(res);
        }
      }
    }
    return new_arr;

  } else if (node.nodeName === '#text') {
    // TODO: what should we do with text types? (CDATA sections)

  } else if (node.nodeName === 'key') {
    return node.childNodes[0].nodeValue;

  } else if (node.nodeName === 'string') {
    let res = '';
    for (let i = 0; i < node.childNodes.length; i++) {
      res += node.childNodes[i].nodeValue;
    }
    return res;

  } else if (node.nodeName === 'integer') {
    // parse as base 10 integer
    return parseInt(node.childNodes[0].nodeValue, 10);

  } else if (node.nodeName === 'real') {
    let res = '';
    for (let i = 0; i < node.childNodes.length; i++) {
      if (node.childNodes[i].nodeType === 3) {
        res += node.childNodes[i].nodeValue;
      }
    }
    return parseFloat(res);

  } else if (node.nodeName === 'data') {
    let res = '';
    for (let i = 0; i < node.childNodes.length; i++) {
      if (node.childNodes[i].nodeType === 3) {
        res += node.childNodes[i].nodeValue.replace(/\s+/g, '');
      }
    }

    // decode base64 data to a Buffer instance
    return new Buffer(res, 'base64');

  } else if (node.nodeName === 'date') {
    return new Date(node.childNodes[0].nodeValue);

  } else if (node.nodeName === 'true') {
    return true;

  } else if (node.nodeName === 'false') {
    return false;
  }
}
