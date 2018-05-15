'use strict';
const DOMParser = require('xmldom').DOMParser;

function XmlParser(XMLString) {
  this.xml = XMLString;
}

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

function parseManifestXml(node) {
  if (!node) throw new Error('Unexpected argument, empty node.');

  const document = {
    attributes: [],
    childNodes: [],
    namespaceURI: node.namespaceURI,
    nodeName: node.nodeName,
    nodeType: node.nodeType
  };

  if (shouldIgnoreNode(node)) return null;

  document.attributes = collapseAttributes(node);

  if (node.childNodes && node.childNodes.length) {
    for (let i = 0, l = node.childNodes.length; i < l; i++) {
      const cNode = parseManifestXml(node.childNodes.item(i));
      if (cNode) {
        document.childNodes.push(cNode);
      }
    }
  }

  return document;
}

function collapseAttributes(node) {
  const attrs = [];

  if (node && node.attributes && node.attributes.length) {
    for (let i = 0, l = node.attributes.length; i < l; i++) {
      const attr = normalizeAttr(node.attributes.item(i));
      if (attr) attrs.push(attr);
    }
  }

  return attrs;
}

function normalizeAttr(attr) {
  if (!attr) return;

  return {
    name: attr.name,
    namespaceURI: attr.namespaceURI,
    nodeName: attr.nodeName,
    nodeType: 2,
    typedValue: {
      type: (typeof attr.value),
      value: attr.value
    },
    value: attr.value
  };
}


XmlParser.prototype.parse = () => {
  let document;
  try {
    document = new DOMParser().parseFromString(this.xml);
  } catch (e) {
    throw e;
  }

  return parseManifestXml(document.documentElement) || {};
};

module.exports = XmlParser;
