import jsep from 'jsep';
import tingle from 'tingle.js';
import { color_inf, color_sup, formatnb_decimal_sep, formatnb_thousands_sep } from './options';
import { makeModalReport } from './report';
import ContextMenu from './contextMenu';

/* eslint-disable wrap-iife, object-shorthand, no-bitwise,
no-extend-native, prefer-rest-params, no-prototype-builtins,
no-restricted-syntax, lines-around-directive, no-unused-vars */
(function () {
  /*
  Polyfill for 'Element.remove'
  from https://developer.mozilla.org/en-US/docs/Web/API/ChildNode/remove
  */
  (function (arr) {
    arr.forEach((item) => {
      if (item.hasOwnProperty('remove')) {
        return;
      }
      Object.defineProperty(item, 'remove', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: function remove() {
          if (this.parentNode !== null) {
            this.parentNode.removeChild(this);
          }
        },
      });
    });
  })([Element.prototype, CharacterData.prototype, DocumentType.prototype]);
  /*
  Polyfill for 'Array.find'
  from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
  */
  if (!Array.prototype.find) {
    Object.defineProperty(Array.prototype, 'find', {
      value: function (predicate) {
        // 1. Let O be ? ToObject(this value).
        if (this == null) {
          throw new TypeError('"this" is null or not defined');
        }
        let k;
        let kValue;
        const o = Object(this);

        // 2. Let len be ? ToLength(? Get(O, "length")).
        const len = o.length >>> 0;

        // 3. If IsCallable(predicate) is false, throw a TypeError exception.
        if (typeof predicate !== 'function') {
          throw new TypeError('predicate must be a function');
        }

        // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
        const thisArg = arguments[1];

        // 5. Let k be 0.
        k = 0;

        // 6. Repeat, while k < len
        while (k < len) {
          // a. Let Pk be ! ToString(k).
          // b. Let kValue be ? Get(O, Pk).
          // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
          // d. If testResult is true, return kValue.
          kValue = o[k];
          if (predicate.call(thisArg, kValue, k, o)) {
            return kValue;
          }
          // e. Increase k by 1.
          k += 1;
        }
        // 7. Return undefined.
        return undefined;
      },
    });
  }
  /*
  Polyfill for 'Object.assign'
  from https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/Object/assign
  */
  if (typeof Object.assign !== 'function') {
    // Must be writable: true, enumerable: false, configurable: true
    Object.defineProperty(Object, 'assign', {
      value: function assign(target, varArgs) { // .length of function is 2
        'use strict';
        if (target == null) { // TypeError if undefined or null
          throw new TypeError('Cannot convert undefined or null to object');
        }
        const to = Object(target);
        for (let index = 1; index < arguments.length; index++) {
          const nextSource = arguments[index];
          if (nextSource != null) { // Skip over if undefined or null
            for (const nextKey in nextSource) {
              // Avoid bugs when hasOwnProperty is shadowed
              if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                to[nextKey] = nextSource[nextKey];
              }
            }
          }
        }
        return to;
      },
      writable: true,
      configurable: true,
    });
  }
  /* Polyfill for 'Array.fill'
  from https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/Array/fill
  */
  if (!Array.prototype.fill) {
    Object.defineProperty(Array.prototype, 'fill', {
      value: function (value) {
        // Steps 1-2.
        if (this == null) {
          throw new TypeError('this is null or not defined');
        }
        const O = Object(this);
        // Steps 3-5.
        const len = O.length >>> 0;
        // Steps 6-7.
        const start = arguments[1];
        const relativeStart = start >> 0;
        // Step 8.
        let k = relativeStart < 0 ?
          Math.max(len + relativeStart, 0) :
          Math.min(relativeStart, len);
        // Steps 9-10.
        const end = arguments[2];
        const relativeEnd = end === undefined ?
          len : end >> 0;
        // Step 11.
        const final = relativeEnd < 0 ?
          Math.max(len + relativeEnd, 0) :
          Math.min(relativeEnd, len);
        // Step 12.
        while (k < final) {
          O[k] = value;
          k += 1;
        }
        // Step 13.
        return O;
      },
    });
  }
  if (!Array.prototype.findIndex) {
    Object.defineProperty(Array.prototype, 'findIndex', {
      value: function (predicate) {
        // 1. Let O be ? ToObject(this value).
        if (this == null) {
          throw new TypeError('"this" is null or not defined');
        }
        const o = Object(this);
        // 2. Let len be ? ToLength(? Get(O, "length")).
        const len = o.length >>> 0;
        // 3. If IsCallable(predicate) is false, throw a TypeError exception.
        if (typeof predicate !== 'function') {
          throw new TypeError('predicate must be a function');
        }
        // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
        const thisArg = arguments[1];
        // 5. Let k be 0.
        let k = 0;
        // 6. Repeat, while k < len
        while (k < len) {
          // a. Let Pk be ! ToString(k).
          // b. Let kValue be ? Get(O, Pk).
          // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
          // d. If testResult is true, return k.
          const kValue = o[k];
          if (predicate.call(thisArg, kValue, k, o)) {
            return k;
          }
          // e. Increase k by 1.
          k += 1;
        }
        // 7. Return -1.
        return -1;
      },
    });
  }
  try {
    const a = new MouseEvent('test');
    return false; // No need to polyfill
  } catch (e) {
    const MouseEvent = function (eventType, params) {
      params = params || { bubbles: false, cancelable: false };
      const mouseEvent = document.createEvent('MouseEvent');
      mouseEvent.initMouseEvent(
        eventType, params.bubbles, params.cancelable, window,
        0, 0, 0, 0, 0, false, false, false, false, 0, null);
      return mouseEvent;
    };
    MouseEvent.prototype = Event.prototype;
    window.MouseEvent = MouseEvent;
  }
})();
/* eslint-enable wrap-iife, object-shorthand, no-bitwise,
no-extend-native, prefer-rest-params, no-prototype-builtins,
no-restricted-syntax, lines-around-directive, no-unused-vars  */

// eslint-disable-next-line no-restricted-properties
const math_pow = Math.pow;
const math_abs = Math.abs;
const math_round = Math.round;
const math_max = Math.max;
const math_min = Math.min;
const math_sin = Math.sin;
const math_cos = Math.cos;
const math_sqrt = Math.sqrt;
const HALF_PI = Math.PI / 2;
const _isNaN = Number.isNaN || isNaN; // eslint-disable-line no-restricted-globals
// eslint-disable-next-line no-restricted-globals
const isNumber = value => value != null && value !== '' && isFinite(value) && !_isNaN(+value);

const operators = new Map();
[
  ['+', function (a, b) { return a + b; }],
  ['-', function (a, b) { return a - b; }],
  ['/', function (a, b) { if (b === 0) { return ''; } return a / b; }],
  ['*', function (a, b) { return a * b; }],
].forEach((el) => {
  operators.set(el[0], el[1]);
});
/**
* Function to dispatch, according to their availability,
* between the appropriate 'elementsFromPoint' function
* (as Edge seems to use a different name than the others),
* or use a custom polyfill if the functionnality is unavailable.
*
* @param {Number} x - X screen coordinate.
* @param {Number} y - Y screen coordinate.
* @return {Array of Nodes} - An Array created from the resulting NodeList.
*
*/
/* eslint-disable no-cond-assign, no-plusplus */
const getElementsFromPoint = (x, y) => {
  if (document.elementsFromPoint) {
    return Array.prototype.slice.call(document.elementsFromPoint(x, y));
  } else if (document.msElementsFromPoint) {
    return Array.prototype.slice.call(document.msElementsFromPoint(x, y));
  }
  const elements = [];
  const previousPointerEvents = [];
  let current;
  let i;
  let d;
  // get all elements via elementFromPoint, and remove them from hit-testing in order
  while ((current = document.elementFromPoint(x, y))
      && elements.indexOf(current) === -1 && current != null) {
    // push the element and its current style
    elements.push(current);
    previousPointerEvents.push({
      value: current.style.getPropertyValue('pointer-events'),
      priority: current.style.getPropertyPriority('pointer-events'),
    });

    // add "pointer-events: none", to get to the underlying element
    current.style.setProperty('pointer-events', 'none', 'important');
  }

  // restore the previous pointer-events values
  for (i = previousPointerEvents.length; d = previousPointerEvents[--i];) {
    elements[i].style.setProperty('pointer-events', d.value ? d.value : '', d.priority);
  }
  return elements;
};
/* eslint-enable no-cond-assign, no-plusplus */

/**
* Function to get the computed style value of an element.
*
* @param {Node} el - The targeted element.
* @return {Object}
*
*/
const getStyle = el => (window.getComputedStyle ? getComputedStyle(el, null) : el.currentStyle);

/**
* Function to get the computed style value of an element's property.
*
* @param {Node} elem - The targeted node.
* @param {String} prop - The targeted property.
* @return {String} - The computed/current value for this style property.
*
*/
const getStyleProperty = (elem, prop) => getStyle(elem)[prop];

function unbindUI() {
  // Removes the current behavior corresponding to clicking on the left menu:
  d3.selectAll('span.filter_v')
    .on('click', null);
  d3.selectAll('span.target_region')
    .on('click', null);
  d3.selectAll('span.label_chk')
    .on('click', null);

  // Remove the table:
  d3.select('.dataTable-wrapper').remove();

  // Unbind buttons on the top of the map:
  d3.select('#header_map')
    .selectAll('img')
    .on('click', null);

  // Remove the selection menu (or buttons) under the chart:
  d3.select('#bar_section > #menu_selection').remove();

  // Removes the current behavior corresponding to clicking on the top menu:
  d3.selectAll('.type_chart.title_menu').on('click', null);

  // Removes the current behavior corresponding to pressing the Control key:
  document.onkeyup = null;
  document.onkeydown = null;
}

/**
* Function to compare the value of a feature to the reference value (i.e. the value of "my region")
* and return the appropriate color (serie may be inversed)
*
* @param {Number} test_value - The value to be compared to the value of "my region".
* @param {Number} ref_value - The value of my region.
* @param {Boolean} serie_inversed - Whether the serie is inversed or not in the current chart.
* @return {String} - A string containing the color to be used for this value.
*
*/
const comp = (test_value, ref_value, serie_inversed) => {
  if (serie_inversed) {
    if (test_value <= ref_value) {
      return color_sup;
    }
    return color_inf;
  }
  if (test_value < ref_value) {
    return color_inf;
  }
  return color_sup;
};


/**
* Function to compare the value of a feature to the reference value (i.e. the value of "my region")
* and return the appropriate color (serie may be inversed)
*
* @param {Number} val1 - The value to be compared to the value of "my region" for the 1st variable.
* @param {Number} val2 - The value to be compared to the value of "my region" for the 2nd variable.
* @param {Number} ref_val1 - The value of my region for he first variable.
* @param {Number} ref_val2 - The value of my region for the second variable.
* @param {Boolean} xInversed - Whether the serie is inversed on the x axis in the current chart.
* @param {Boolean} yInversed - Whether the serie is inversed on the y axis in the current chart.
* @return {String} - A string containing the color to be used for theses values.
*
*/
const comp2 = (val1, val2, ref_val1, ref_val2, xInversed, yInversed) => {
  if ((val1 < ref_val1 && !xInversed) || (val1 > ref_val1 && xInversed)) { // val1 is inferior:
    if (val2 < ref_val2) {
      return yInversed ? 'rgb(160, 30, 160)' : color_inf;
    }
    return yInversed ? color_inf : 'rgb(160, 30, 160)';
  }
  // val1 is superior :
  if (val2 > ref_val2) {
    return !yInversed ? color_sup : 'orange';
  }
  return !yInversed ? 'orange' : color_sup;
};

class Rect {
  constructor(topleft, bottomright) {
    this.xmin = topleft[0];
    this.xmax = bottomright[0];
    this.ymin = topleft[1];
    this.ymax = bottomright[1];
  }

  contains(pt) {
    if (pt[0] >= this.xmin && pt[0] <= this.xmax
        && pt[1] >= this.ymin && pt[1] <= this.ymax) {
      return true;
    }
    return false;
  }
}

const PropSizer = function PropSizer(fixed_value, fixed_size) {
  this.fixed_value = fixed_value;
  const { sqrt, abs, PI } = Math;
  this.smax = fixed_size * fixed_size * PI;
  this.scale = val => sqrt(abs(val) * this.smax / this.fixed_value) / PI;
  // this.get_value = size => ((size * PI) ** 2) / this.smax * this.fixed_value;
  // Use Math pow to support browser without ** operator:
  // eslint-disable-next-line no-restricted-properties
  this.get_value = size => Math.pow(size * PI, 2) / this.smax * this.fixed_value;
};

/**
* Function removing duplicate members of an array.
*
* @param {Array} arr - The array on which to operate.
* @return {Array} - The input array, without duplicates.
*
*/
const removeDuplicates = function removeDuplicates(arr) {
  const tmp = [];
  for (let i = 0, len_arr = arr.length; i < len_arr; i++) {
    if (tmp.indexOf(arr[i]) === -1) {
      tmp.push(arr[i]);
    }
  }
  return tmp;
};

const getSvgPathType = (path) => {
  if (path.indexOf('M ') > -1 && path.indexOf(' L ') > -1) {
    return 2;
  }
  return 1;
};

const svgPathToCoords = (path, type_path) => {
  if (type_path === 1) {
    return path.slice(1).split('L').map(pt => pt.split(',').map(a => +a));
  }
  return path.slice(2).split(' L ').map(pt => pt.split(' ').map(a => +a));
};

function computePercentileRank(obj, field_name, result_field_name) {
  const values = obj.map(d => d[field_name]);
  const len_values = values.length;
  const getPR = (v) => {
    let count = 0;
    for (let i = 0; i < len_values; i++) {
      if (values[i] <= v) {
        count += 1;
      }
    }
    // return 100 * count / len_values;
    return 100 * (count - 1) / (len_values - 1);
  };
  for (let ix = 0; ix < len_values; ix++) {
    // eslint-disable-next-line no-param-reassign
    obj[ix][result_field_name] = getPR(values[ix]);
  }
}

const _getPR = (v, serie) => {
  let count = 0;
  for (let i = 0; i < serie.length; i++) {
    if (serie[i] <= v) {
      count += 1;
    }
  }
  // return 100 * count / serie.length;
  return 100 * (count - 1) / (serie.length - 1);
};

/**
* Compute the mean value of a serie of values.
*
* @param {Array} serie - An array of Number.
* @return {Number} - The mean of the input serie of values.
*
*/
const getMean = (serie) => {
  const nb_values = serie.length;
  let sum = 0;
  for (let i = 0; i < nb_values; i++) {
    sum += serie[i];
  }
  return sum / nb_values;
};

const getMean2 = (data, var_name, info_var) => {
  const o_info = info_var.find(ft => ft.id === var_name);
  const nb_values = data.length;
  if (o_info.formula === 'not relevant') {
    return getMean(data.map(d => +d[var_name]));
  }
  let id1;
  let id2;
  let s1 = 0;
  let s2 = 0;
  let left = 0;
  const formula = jsep(o_info.formula);
  console.log(formula);
  if (!formula.left.left && !formula.right.right) {
    id1 = o_info[formula.left.name];
    id2 = o_info[formula.right.name];
    console.log('formula : ', o_info.formula);
    console.log('id1 : ', id1, ' id2 :', id2);
    const serie1 = data.map(d => +d[id1]);
    const serie2 = data.map(d => +d[id2]);
    const fun = operators.get(formula.operator);
    for (let i = 0; i < nb_values; i++) {
      s1 += serie1[i];
      s2 += serie2[i];
    }
    // console.log('mult1 : ', mult1, ' mult2 : ', mult2);

    return fun(s1, s2);
  } else if (formula.left.left && !formula.right.left) {
    id1 = o_info[formula.left.left.name];
    id2 = o_info[formula.left.right.name];
    console.log('formula : ', o_info.formula);
    console.log('id1 :', id1, 'id2 :', id2);
    const serie1 = data.map(d => +d[id1]);
    const serie2 = data.map(d => +d[id2]);
    let fun = operators.get(formula.left.operator);
    for (let i = 0; i < nb_values; i++) {
      s1 += serie1[i];
      s2 += serie2[i];
    }
    left = fun(s1, s2);
    fun = operators.get(formula.operator);
    if (formula.right.type === 'Identifier') {
      const right = formula.right.name === 'id1' ? s1 : s2;
      return fun(left, right);
    } else {
      return fun(left, formula.right.value);
    }
  }
  console.log('Error');
  console.log(' ');
  console.log(o_info.formula);
  return NaN;
};

/**
* Compute the standard deviation of a serie of values.
*
* @param {Array} serie - An array of Number.
* @param {Number} mean_value - (Optional) The mean value of the serie.
* @return {Number} - The standard deviation of the input serie of values.
*
*/
const getStdDev = (serie, mean_value) => {
  const nb_values = serie.length;
  if (!mean_value) {
    mean_value = getMean(serie); // eslint-disable-line no-param-reassign
  }
  let sum = 0;
  for (let i = 0; i < nb_values; i++) {
    // eslint-disable-next-line no-restricted-properties
    sum += math_pow(serie[i] - mean_value, 2);
  }
  return math_sqrt((1 / nb_values) * sum);
};

/**
* ...
*
* @param {Array} serie - The Array of Number to be standardized.
* @return {Array} - The resulting standardized Array of Number, in the same order
*  as the input Array.
*
*/
const getStandardizedMeanStdDev = (serie) => {
  const mean = getMean(serie);
  const stddev = getStdDev(serie, mean);
  return serie.map(val => (val - mean) / stddev);
};

/**
* Function the get a shuffled version of an array.
*
* @param {Array} array - The array to shuffle.
* @return {Array} - The shuffled array.
*/
const shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // eslint-disable-next-line no-param-reassign
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

/**
* Compute the euclidian distance between two Features
* containing Point geometries.
*
* @param {Object} feature1
* @param {Object} feature2
* @return {Number} - The distance between feature1 and feature2 in their unit.
*
*/
function euclidian_distance(feature1, feature2) {
  const [x1, y1] = feature1.geometry.coordinates;
  const [x2, y2] = feature2.geometry.coordinates;
  const a = x1 - x2;
  const b = y1 - y2;
  return math_sqrt(a * a + b * b);
}

/**
* Function to select the first variable on the left menu
* (triggered after changing region, if no more variable was selected)
*
* @return {String} - The code of an available variable to use.
*
*/
function selectFirstAvailableVar() {
  const menu = document.querySelector('#menu');
  const v = menu.querySelectorAll('.target_variable');
  for (let i = 0; i < v.length; i++) {
    if (!v[i].classList.contains('disabled')) {
      v[i].classList.add('checked');
      return v[i].getAttribute('value');
    }
  }
  return null;
}

/**
* Function to extract the 'id' field (named according
* to 'id_field' value) on the target layer properties
* and assign its value directly on the field name 'id'.
*
* @param {Object} layer - A geojson collection of features
* @param {String} id_field - The name of the field containing
*                           the id values.
* @return {Void}
*/
function prepareGeomLayerId(layer, id_field) {
  layer.features.forEach((ft) => {
    // eslint-disable-next-line no-param-reassign
    ft.id = ft.properties[id_field];
  });
}

/**
* Function to get a random value from an array (or from a subset of an array).
*
* @param {Array} arr - The array on which to operate.
* @param {Number} false_length - The length of the subset on which to operate
*                         (Optional - default to the real length of the array)
* @return {Same type as the members of the input array}
*
*/
function getRandom(arr, false_length) {
  return arr[Math.round(Math.random() * (false_length || arr.length))];
}

// const getRatioToWide = () => {
//   if (window.matchMedia('(min-width: 1561px)').matches) {
//     return 1550 / 1350;
//   } else if (window.matchMedia('(min-width: 1361px) and (max-width: 1560px)').matches) {
//     return 1350 / 1350;
//   } else if (window.matchMedia('(min-width: 1161px) and (max-width: 1360px)').matches) {
//     return 1150 / 1350;
//   } else if (window.matchMedia('(min-width: 960px) and (max-width: 1160px)').matches) {
//     return 960 / 1350;
//   } else if (window.matchMedia('(max-width: 959px)').matches) {
//     return 540 / 1350;
//   }
//   return 1350 / 1350;
// };


function addThousandsSeparator(value) {
  const reg = /(\d+)(\d{3})/;
  let val = `${value}`;
  while (reg.test(val)) {
    val = val.replace(reg, `$1${formatnb_thousands_sep}$2`);
  }
  return val;
}

/**
* Function to format a number using custom
* decimal separator and thousands separator (defined in the 'options' file).
*
* @param {Number} value - The value to be formatted, as a number.
* @param {Number} precision - The number of digits to the right of the decimal
*         to keep (value will be rounded to that precision before formatting).
*
* @return {String} - The formatted number as a String, using the
*         decimal separator and thousands separator defined in the 'options' file.
*/
function formatNumber(value, precision) {
  let val = `${value}`;
  if (!val.match(/^-?[0-9]*.?[0-9]*$/)) return false;
  if (precision) {
    const mult = +([1].concat(Array(precision).fill(0)).join(''));
    val = `${math_round(+val * mult) / mult}`;
  }
  const values_list = val.split('.');
  values_list[0] = addThousandsSeparator(values_list[0]);
  return values_list.join(formatnb_decimal_sep);
}

const array_slice = Array.prototype.slice;

/**
* Removes all Node of the given NodeList.
*
* @param {NodeList} elems - A NodeList (or an Array) containing the elements
*  to be removed.
* @return {Void}
*
*/
const removeAll = (elems) => {
  array_slice.call(elems).forEach((el) => { el.remove(); });
};

function dataURIToBlob(dataURI) {
  const _dataURI = dataURI.replace(/^data:/, '');
  const type = _dataURI.match(/image\/[^;]+/);
  const base64 = _dataURI.replace(/^[^,]+,/, '');
  const arrayBuffer = new ArrayBuffer(base64.length);
  const typedArray = new Uint8Array(arrayBuffer);
  for (let i = 0; i < base64.length; i++) {
    typedArray[i] = base64.charCodeAt(i);
  }
  return new Blob([arrayBuffer], { type });
}

export function exportSVG(elem, filename) {
  const targetSvg = elem.cloneNode(true);
  const serializer = new XMLSerializer();
  removeAll(targetSvg.querySelectorAll('.brush_map'));
  let source = serializer.serializeToString(targetSvg);
  source = ['<?xml version="1.0" encoding="utf-8" standalone="no"?>\r\n', source].join('');

  const href = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }));
  const a = document.createElement('a');
  a.setAttribute('download', filename);
  a.setAttribute('href', href);
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

export function exportPNG(elem, filename) {
  const _h = elem.viewBox.baseVal.height;
  const _w = elem.viewBox.baseVal.width;
  const targetCanvas = d3.select('body')
    .append('canvas')
    .attrs({ id: 'canvas_export', height: _h, width: _w })
    .node();
  const bg_rect = document.createElementNS(d3.namespaces.svg, 'rect');
  bg_rect.setAttribute('id', 'background');
  bg_rect.setAttribute('height', '100%');
  bg_rect.setAttribute('width', '100%');
  bg_rect.setAttribute('x', 0);
  bg_rect.setAttribute('y', 0);
  bg_rect.setAttribute('fill', '#ffffff');
  elem.insertBefore(bg_rect, elem.firstChild);
  const targetSvg = elem.cloneNode(true);
  targetSvg.removeAttribute('viewBox');
  targetSvg.removeAttribute('preserveAspectRatio');
  targetSvg.setAttribute('width', _w);
  targetSvg.setAttribute('height', _h);
  bg_rect.remove();
  const svg_src = (new XMLSerializer()).serializeToString(targetSvg);
  const ctx = targetCanvas.getContext('2d');
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg_src)}`;
  img.onload = function () {
    ctx.drawImage(img, 0, 0);
    const dataurl = targetCanvas.toDataURL('image/png');
    console.log(dataurl);
    fetch(dataurl)
      .then(res => res.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute('href', blobUrl);
        dlAnchorElem.setAttribute('download', filename);
        if (window.isIE) {
          // eslint-disable-next-line new-cap
          const modal = new tingle.modal({
            stickyFooter: false,
            closeMethods: ['overlay', 'button', 'escape'],
            closeLabel: 'Close',
            onOpen() {
              dlAnchorElem.innerHTML = filename;
              const content = document.getElementsByClassName('link_download')[0];
              content.appendChild(dlAnchorElem);
            },
            onClose() {
              modal.destroy();
            },
          });
          modal.setContent('<div class="link_download"><p>Lien de téléchargement</p></div>');
          modal.open();
        } else {
          dlAnchorElem.style.display = 'none';
          document.body.appendChild(dlAnchorElem);
          dlAnchorElem.click();
          dlAnchorElem.remove();
          URL.revokeObjectURL(blobUrl);
        }
      });

    // console.log(dataurl);
    // const blob = dataURIToBlob(dataurl);
    // console.log(blob);
    // const href = URL.createObjectURL(blob);
    // const a = document.createElement('a');
    // a.setAttribute('download', filename);
    // a.setAttribute('href', href);
    // a.style.display = 'none';
    // document.body.appendChild(a);
    // a.click();
    // targetCanvas.remove();
    // a.remove();
    // URL.revokeObjectURL(href);
    // canvasToBlob(targetCanvas, (blob) => {
    //   const href = URL.createObjectURL(blob);
    //   console.log(href);
    //   const a = document.createElement('a');
    //   a.setAttribute('download', filename);
    //   a.setAttribute('href', href);
    //   a.style.display = 'none';
    //   document.body.appendChild(a);
    //   a.click();
    //   targetCanvas.remove();
    //   console.log(a);
    //   setTimeout(() => {
    //     a.remove();
    //     URL.revokeObjectURL(href);
    //   }, 125);
    // }, 'image/png');
    // targetCanvas.toBlob((blob) => {
    //   const href = URL.createObjectURL(new Blob([blob], { type: 'image/png' }));
    //   const a = document.createElement('a');
    //   a.setAttribute('download', filename);
    //   a.setAttribute('href', href);
    //   a.style.display = 'none';
    //   document.body.append(a);
    //   a.click();
    //   targetCanvas.remove();
    //   a.remove();
    //   URL.revokeObjectURL(href);
    // }, 'image/png');
  };
}


/**
* Display a custom context menu when the user triggers a right click on the map
* or on a chart.
*
* @param {Object} current_chart - The Object corresponding to the
*  current chart in use in the application.
* @return {Void}
*/
function svgContextMenu(current_chart, svg_elem, map_elem) {
  let items_menu;
  if (current_chart.isMap) {
    items_menu = [
      {
        name: 'Export au format PNG',
        action: () => { exportPNG(svg_elem.node(), 'regioviz_map.png'); },
      },
      {
        name: 'Export au format SVG',
        action: () => { exportSVG(svg_elem.node(), 'regioviz_map.svg'); },
      },
      {
        name: 'Export d\'un rapport complet',
        action: () => { makeModalReport(); },
      },
    ];
  } else {
    const elem_id = current_chart.getElemBelow(d3.event);
    items_menu = [
      {
        name: 'Export au format PNG',
        action: () => { exportPNG(svg_elem.node(), 'regioviz_chart.png'); },
      },
      {
        name: 'Export au format SVG',
        action: () => { exportSVG(svg_elem.node(), 'regioviz_chart.svg'); },
      },
      {
        name: 'Export d\'un rapport complet',
        action: () => { makeModalReport(); },
      },
    ];
    if (elem_id) {
      items_menu.push({
        name: 'Zoomer la carte sur la région sélectionnée',
        action: () => { map_elem.zoomOnFeature(elem_id); },
      });
    }
  }
  current_chart.tooltip.style('display', 'none');
  new ContextMenu().showMenu(d3.event, document.body, items_menu);
}

const isContextMenuDisplayed = () => !!document.querySelector('.context-menu');

/**
* Catch the event when the user click on the download anchor of a pdf document and
* use the 'href' attribute of the anchor to open the document on a new window/tab
* (and avoid the default action of trying to download the document).
*
* @param {Event} event - The current event.
* @return {Boolean} - Always returns false the indicate the default action for this
*  event has been prevented.
*
*/
function clickDlPdf(event) {
  const path = this.href;
  // console.log(event);
  this.href = '#';
  window.open(path);
  event.preventDefault();
  // eslint-disable-next-line no-param-reassign
  event.returnValue = false;
  this.href = path;
  return false;
}

export {
  comp,
  comp2,
  math_abs,
  math_round,
  math_min,
  math_sin,
  math_cos,
  math_max,
  math_sqrt,
  math_pow,
  HALF_PI,
  Rect,
  PropSizer,
  unbindUI,
  removeDuplicates,
  getSvgPathType,
  svgPathToCoords,
  computePercentileRank,
  _getPR,
  getMean,
  getMean2,
  getStdDev,
  getStandardizedMeanStdDev,
  shuffle,
  euclidian_distance,
  selectFirstAvailableVar,
  prepareGeomLayerId,
  getRandom,
  getElementsFromPoint,
  // getRatioToWide,
  formatNumber,
  getStyle,
  getStyleProperty,
  removeAll,
  svgContextMenu,
  clickDlPdf,
  isContextMenuDisplayed,
  _isNaN,
};
