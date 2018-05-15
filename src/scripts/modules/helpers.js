import jsep from 'jsep';
import tingle from 'tingle.js';
import { color_inf, color_sup, fixed_dimension, formatnb_decimal_sep, formatnb_thousands_sep } from './options';
import { makeModalReport } from './report';
import ContextMenu from './contextMenu';
import { app, bindUI_chart, bindHelpMenu, study_zones, territorial_mesh } from './../main';

const array_slice = Array.prototype.slice;

/* eslint-disable wrap-iife, object-shorthand, no-bitwise, strict,
no-extend-native, prefer-rest-params, no-prototype-builtins, no-param-reassign,
no-restricted-syntax, lines-around-directive, no-unused-vars, consistent-return */
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
    const MouseEvent = function (eventType, _params) {
      const params = Object.assign({
        bubbles: false,
        cancelable: false,
        view: window,
        detail: 0,
        screenX: 0,
        screenY: 0,
        clientX: 0,
        clientY: 0,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        button: 0,
        relatedTarget: null,
      }, _params);
      // params = params || { bubbles: false, cancelable: false };
      const mouseEvent = document.createEvent('MouseEvent');
      mouseEvent.initMouseEvent(
        eventType, params.bubbles, params.cancelable, params.view,
        params.detail, params.screenX, params.screenY, params.clientX, params.clientY,
        params.ctrlKey, params.altKey, params.shiftKey, params.metaKey,
        params.button, params.relatedTarget,
      );
      return mouseEvent;
    };
    MouseEvent.prototype = Event.prototype;
    window.MouseEvent = MouseEvent;
  }
})();
/* eslint-enable wrap-iife, object-shorthand, no-bitwise, strict,
no-extend-native, prefer-rest-params, no-prototype-builtins, no-param-reassign,
no-restricted-syntax, lines-around-directive, no-unused-vars, consistent-return  */

const isIE = (() => (/MSIE/i.test(navigator.userAgent)
    || /Trident\/\d./i.test(navigator.userAgent)
    || /Edge\/\d./i.test(navigator.userAgent)))();


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
    return array_slice.call(document.elementsFromPoint(x, y));
  } else if (document.msElementsFromPoint) {
    return array_slice.call(document.msElementsFromPoint(x, y));
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

/**
* Compute the real value of a ratio within a study area.
* The value is computed according to a formula retrived for the metadata file.
* (contrary to the getMean function which returns the mean value of the
*  regions within the study area)
*
* @param {Array} data - The dataset extract corresponding to the features currently in use.
* @param {String} var_name - The name of the variable to be used.
* @param {Array} info_var - The Array of Object containing the informations about each variable.
* @return {Number} - The computed value.
*
*/
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
  if (!formula.left.left && !formula.right.right) {
    id1 = o_info[formula.left.name];
    id2 = o_info[formula.right.name];
    const serie1 = data.map(d => +d[id1]);
    const serie2 = data.map(d => +d[id2]);
    const fun = operators.get(formula.operator);
    for (let i = 0; i < nb_values; i++) {
      s1 += serie1[i];
      s2 += serie2[i];
    }

    return fun(s1, s2);
  } else if (formula.left.left && !formula.right.left) {
    id1 = o_info[formula.left.left.name];
    id2 = o_info[formula.left.right.name];
    const serie1 = data.map(d => +d[id1]);
    const serie2 = data.map(d => +d[id2]);
    let fun = operators.get(formula.left.operator);
    for (let i = 0; i < nb_values; i++) {
      s1 += serie1[i];
      s2 += serie2[i];
    }
    left = fun(s1, s2);
    fun = operators.get(formula.operator);
    let right;
    if (formula.right.type === 'Identifier') {
      right = formula.right.name === 'id1' ? s1 : s2;
    } else {
      right = formula.right.value;
    }
    return fun(left, right);
  }
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
* @param {Object} layer - A geojson collection of features.
*
* @return {Void}
*/
function prepareGeomLayerId(layer) {
  const available_territ_mesh = territorial_mesh.map(d => d.id);
  const { id_field, id_field_geom } = app.current_config;
  layer.features.forEach((ft) => {
    // eslint-disable-next-line no-param-reassign
    ft.id = ft.properties[id_field_geom];
    // eslint-disable-next-line no-param-reassign
    ft._ix_dataset = app.full_dataset.findIndex(d => d[id_field] === ft.id);
    const other = app.full_dataset[ft._ix_dataset];
    available_territ_mesh.forEach((t) => {
      // eslint-disable-next-line no-param-reassign
      ft.properties[t] = +other[t];
      other[`nearest_${t}`] = ft.properties[`nearest_${t}`];
    });
    // eslint-disable-next-line no-param-reassign
    ft.properties.name = other.name;
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
  return arr[Math.round(Math.random() * (false_length || arr.length - 1))];
}

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


/**
*
* Export a SVG chart or map to a downloadable SVG file.
*
* @param {Node} elem - The svg element to be exported.
* @param {String} filename - The filename to be used for this export.
*
*/
export function exportSVG(elem, filename) {
  const targetSvg = elem.cloneNode(true);
  const serializer = new XMLSerializer();
  removeAll(targetSvg.querySelectorAll('.brush_map'));
  let source = serializer.serializeToString(targetSvg);
  source = ['<?xml version="1.0" encoding="utf-8" standalone="no"?>\r\n', source].join('');

  if (window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveOrOpenBlob(new Blob([source], { type: 'image/svg+xml' }), filename);
  } else {
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
}

/**
*
* Export a SVG chart or map to a downloadable PNG file.
*
* @param {Node} elem - The svg element to be converted to png and exported.
* @param {String} filename - The filename to be used for this export.
*
*/
export function exportPNG(elem, filename) {
  const bbox = elem.getBBox();
  const _h = bbox.height;
  const _w = bbox.width;
  const targetCanvas = d3.select('body')
    .append('canvas')
    .attr('id', 'canvas_export')
    .node();
  targetCanvas.width = _w;
  targetCanvas.height = _h;
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
  const img = new Image();
  const svgBlob = new Blob([svg_src], { type: 'image/svg+xml;charset=utf-8' });
  const url = (window.URL || window.webkitURL || window).createObjectURL(svgBlob);
  img.onload = function () {
    const ctx = targetCanvas.getContext('2d');
    ctx.clearRect(0, 0, _w, _h);
    ctx.drawImage(img, 0, 0);
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      const d = targetCanvas.msToBlob();
      window.navigator.msSaveOrOpenBlob(new Blob([d], { type: 'image/png' }), filename);
    } else {
      const dataurl = targetCanvas.toDataURL('image/png');
      fetch(dataurl)
        .then(res => res.blob())
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          const dlAnchorElem = document.createElement('a');
          dlAnchorElem.setAttribute('href', blobUrl);
          dlAnchorElem.setAttribute('download', filename);
          dlAnchorElem.style.display = 'none';
          document.body.appendChild(dlAnchorElem);
          dlAnchorElem.click();
          dlAnchorElem.remove();
          URL.revokeObjectURL(blobUrl);
        });
    }
  };
  img.src = url;
}

/**
* Returns whether an existing context menu is already displayed on the document.
*
* @return {Boolean} - Is there an existing context menu displayed ?
*/
const isContextMenuDisplayed = () => !!document.querySelector('.context-menu');

/**
* Function to display a modal window allowing the user to choose the name of its
* new studyzone.
* If the 'confirm' button is pressed, the studyzone will actualy be created given
* an array of Id of the regions to be selected. It will also be displayed in
* the left menu.
* This new studyzone will be used right now so the chart will (probably) be redrawn.
*
* @param {Array} regions - An array of identifiers of the regions to be used in the studyzone.
* @return {Void}
*/
function createStudyZone(regions) {
  if (regions.indexOf(app.current_config.my_region) < 0) {
    regions.push(app.current_config.my_region);
  }
  // eslint-disable-next-line new-cap
  const modal = new tingle.modal({
    stickyFooter: false,
    closeMethods: ['overlay', 'button', 'escape'],
    closeLabel: 'Close',
    onOpen() {
      document.querySelector('div.tingle-modal.tingle-modal--visible').style.background = 'rgba(0,0,0,0,0.4)';
    },
    onClose() {
      modal.destroy();
    },
  });
  const n_custom_studyzone = Object.keys(app.custom_studyzones).length + 1;
  const content = `<p style="color: #4f81bd;font-size: 1.2rem;"><b>Création d'un espace d'étude personnalisé</b></p>
  <p>Territoires sélectionnés : </p>
<p style="text-align: justify;">${regions.map(r => `<span class="i_regio" title="${app.feature_names[r]}">${r}</span>`).join(', ')}</p>
<div>
  <p>
  <span>Nom de l'espace d'étude :</span>
  <input id="input_name_studyzone" type="text" style="width:280px;" placeholder="Espace d'étude ${n_custom_studyzone}" />
  </p>
  <div style="width:75%; display: flex-inline; text-align: center; margin: auto; font-size: 1.2em;">
    <button class="b_valid button_blue">Valider</button>
    <button class="b_cancel button_red">Annuler</button>
  </div>
</div>`;
  modal.setContent(content);
  modal.open();
  const div_modal = document.querySelector('div.tingle-modal');
  div_modal.querySelector('.b_valid').onclick = function () {
    const name_studyzone = div_modal.querySelector('#input_name_studyzone').value || `Espace d'étude ${n_custom_studyzone}`;
    app.custom_studyzones[name_studyzone] = regions;
    const section3 = document.querySelector('#menu_studyzone');
    const entry = document.createElement('p');
    entry.setAttribute('filter-value', 'CUSTOM');
    entry.innerHTML = `<span display_level="${app.current_config.current_level}" class='filter_v square'></span><span class="label_chk">${name_studyzone}</span><span class="i_info">i</span>`;
    section3.appendChild(entry);
    bindUI_chart(app.chart, app.map);
    bindHelpMenu();
    modal.close();
    entry.querySelector('.label_chk').click();
  };
  div_modal.querySelector('.b_cancel').onclick = function () {
    modal.close();
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
function svgContextMenu(current_chart, svg_elem, colors_selection) {
  let items_menu;
  // Remove existing context menu if any:
  if (isContextMenuDisplayed()) {
    removeAll(document.querySelectorAll('.context-menu'));
  }
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
      {
        name: 'Rétablir le zoom de la carte',
        action: () => { current_chart.resetZoom(); },
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
    // If the click was on a chart element,
    // add an extra option in the menu allowing to zoom the map on this feature:
    if (elem_id) {
      items_menu.push({
        name: 'Zoomer la carte sur le territoire sélectionné',
        action: () => { app.map.zoomOnFeature(elem_id); },
      });
    }
    // If the current chart is zoomable, allow to reset the zoom:
    if (current_chart.zoom && current_chart.zoomed) {
      items_menu.push({
        name: 'Rétablir le zoom du graphique',
        action: () => { current_chart.resetZoom(); },
      });
    }
  }
  // Allow to create a study zone from the current selection:
  if (app.current_config.nb_var < 3 && colors_selection && colors_selection.length > 1) {
    items_menu.push({
      name: 'Créer un espace d\'étude à partir de la sélection',
      action: () => { createStudyZone(colors_selection); },
    });
  }
  // Disable PNG export for Internet Explorer (< Edge):
  if (isIE && window.navigator && window.navigator.appVersion.indexOf('Edge') < 0) {
    items_menu.splice(0, 1);
  }
  // Hide tooltips before displaying the context menu:
  current_chart.tooltip.style('display', 'none');
  // Create and display the context menu:
  new ContextMenu().showMenu(d3.event, document.body, items_menu);
}

/**
* Cross-browser way to get the scroll values.
*
* @return {Object} - Object containing scrollX and scrollY values.
*
*/
const getScrollValue = () => {
  const scrollX = (window.pageXOffset !== undefined)
    ? window.pageXOffset
    : (document.documentElement || document.body.parentNode || document.body).scrollLeft;

  const scrollY = (window.pageYOffset !== undefined)
    ? window.pageYOffset
    : (document.documentElement || document.body.parentNode || document.body).scrollTop;
  return { scrollX, scrollY };
};

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
  this.href = '#';
  window.open(path);
  event.preventDefault();
  // eslint-disable-next-line no-param-reassign
  event.returnValue = false;
  this.href = path;
  return false;
}

/**
* Returns the name of the current study zone with a nice formatting.
*
* @return {String} - The name of the current study zone.
*
*/
const getNameStudyZone = () => (!app.current_config.filter_key
  ? 'France' : app.current_config.filter_type === 'SPAT' && app.current_config.filter_key instanceof Array
    ? ['France (Territoires dans un voisinage de ', document.getElementById('dist_filter').value, 'km)'].join('')
    : app.current_config.filter_type === 'CUSTOM' && app.current_config.filter_key instanceof Array
      ? document.querySelector('p[filter-value="CUSTOM"] > .filter_v.square.checked').nextSibling.innerHTML
      : study_zones.find(d => d.id === app.current_config.filter_key).name);

let tm_leftmenu;

/* eslint-disable no-param-reassign */
function toggleVisibilityLeftMenu() {
  if (tm_leftmenu) return;
  const bar_section = document.getElementById('bar_section');
  const map_section = document.getElementById('map_section');
  const bar_topsection = document.querySelector('#menutop > .t2');
  const map_topsection = document.querySelector('#menutop > .t3');
  const left_elems = document.querySelectorAll('.t1');
  if (bar_section.classList.contains('zoomed')) {
    this.innerHTML = '◀';
    this.parentElement.title = 'Cacher le menu';
    array_slice.call(left_elems).forEach((elem) => {
      elem.style.display = null;
      elem.style.visibility = 'visible';
      elem.style.transform = 'scaleX(1)';
    });
    bar_topsection.classList.remove('zoomed');
    map_topsection.classList.remove('zoomed');
    bar_section.classList.remove('zoomed');
    map_section.classList.remove('zoomed');
    const w_bar = bar_section.getBoundingClientRect().width;
    const w_map = map_section.getBoundingClientRect().width;
    const h_lgd = document.getElementById('svg_legend').viewBox.baseVal.height;
    d3.select('.cont_svg.cchart')
      .style('padding-top', `${(fixed_dimension.chart.height / fixed_dimension.chart.width) * w_bar}px`);
    d3.select('.cont_svg.cmap')
      .style('padding-top', `${(fixed_dimension.map.height / fixed_dimension.map.width) * w_map}px`);
    d3.select('.cont_svg.clgd').style('padding-top', `${(h_lgd / fixed_dimension.legend.width) * w_map}px`);
    d3.select('#selected_summary').remove();
  } else {
    this.innerHTML = '▶';
    this.parentElement.title = 'Afficher le menu';
    array_slice.call(left_elems).forEach((elem) => {
      elem.style.visibility = 'hidden';
      elem.style.transform = 'scaleX(0)';
    });
    tm_leftmenu = setTimeout(() => {
      array_slice.call(left_elems).forEach((elem) => {
        elem.style.display = 'none';
      });
      bar_topsection.classList.add('zoomed');
      map_topsection.classList.add('zoomed');
      bar_section.classList.add('zoomed');
      map_section.classList.add('zoomed');
      const w_bar = bar_section.getBoundingClientRect().width;
      const w_map = map_section.getBoundingClientRect().width;
      const h_lgd = document.getElementById('svg_legend').viewBox.baseVal.height;

      const name_study_zone = getNameStudyZone();

      d3.select('.cont_svg.cchart')
        .style('padding-top', `${(fixed_dimension.chart.height / fixed_dimension.chart.width) * w_bar - 15}px`);
      d3.select('.cont_svg.cmap')
        .style('padding-top', `${(fixed_dimension.map.height / fixed_dimension.map.width) * w_map}px`);
      d3.select('.cont_svg.clgd').style('padding-top', `${(h_lgd / fixed_dimension.legend.width) * w_map}px`);
      d3.select('body')
        .insert('div', '#menutop')
        .attr('id', 'selected_summary')
        .styles({
          background: '#4f81bd',
          'border-color': '#4f81bd',
          'border-style': 'outset',
          'border-width': '2px',
          color: 'white',
          'font-size': '0.9em',
          'line-height': '1.5em',
          margin: 'auto',
          'text-align': 'center',
          width: '60%',
        })
        .html(`
          Unités territoriales : <b>${app.current_config.current_level}</b> -
          Mon territoire : <b>${app.current_config.my_region_pretty_name}</b> -
          Espace d'étude : <b>${name_study_zone}</b>`);
      tm_leftmenu = undefined;
    }, 275);
  }
}
/* eslint-enable no-param-reassign */


const waitingOverlay = (function () {
  const overlay = document.createElement('div');
  overlay.id = 'overlay';
  overlay.style.display = 'none';
  overlay.innerHTML = '<div class="spinner2"></div>';
  overlay.onclick = (e) => {
    if (overlay.style.display === 'none') return;
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  };
  document.body.insertBefore(overlay, document.getElementById('menutop'));
  return {
    display: () => { overlay.style.display = null; },
    hide: () => { overlay.style.display = 'none'; },
  };
}());

const execWithWaitingOverlay = function execWithWaitingOverlay(func) {
  waitingOverlay.display();
  setTimeout(() => {
    func();
    waitingOverlay.hide();
  }, 10);
};


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
  formatNumber,
  getStyle,
  getStyleProperty,
  removeAll,
  svgContextMenu,
  clickDlPdf,
  isContextMenuDisplayed,
  _isNaN,
  isNumber,
  getScrollValue,
  toggleVisibilityLeftMenu,
  getNameStudyZone,
  execWithWaitingOverlay,
};
