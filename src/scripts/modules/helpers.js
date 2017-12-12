import { color_inf, color_sup } from './options';

/* eslint-disable wrap-iife, object-shorthand, no-bitwise,
no-extend-native, prefer-rest-params, no-prototype-builtins */
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
})();
/* eslint-enable wrap-iife, object-shorthand, no-bitwise,
no-extend-native, prefer-rest-params, no-prototype-builtins */

// eslint-disable-next-line no-restricted-properties
const math_pow = Math.pow;
const math_abs = Math.abs;
const math_round = Math.round;
const math_max = Math.max;
const math_sin = Math.sin;
const math_cos = Math.cos;
const math_sqrt = Math.sqrt;
const HALF_PI = Math.PI / 2;

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
const getElementsFromPoint = (x, y, context = document.body) => {
  if (document.elementsFromPoint) {
    return Array.prototype.slice.call(document.elementsFromPoint(x, y));
  } else if (document.msElementsFromPoint) {
    return Array.prototype.slice.call(document.msElementsFromPoint(x, y));
  }
  const elements = [];
  const children = context.children;
  let i;
  let l;
  let pos;

  for (i = 0, l = children.length; i < l; i++) {
    pos = children[i].getBoundingClientRect();
    if (pos.left <= x && x <= pos.right && pos.top <= y && y <= pos.bottom) {
      elements.push(children[i]);
    }
  }
  return elements;
};

/**
* Function to prepare a tooltip zone to be used/bound later.
*
* @param {Object} parent - The d3 node selection for the parent.
* @param {String} before - The selector describing the before element.
* @param {String} classname - The className value to be used for
*                             this tooltip (default 'tooltip').
* @return {Object} - The d3 node element for this tooltip zone.
*
*/
function prepareTooltip2(parent, before, classname = 'tooltip') {
  const t = parent.select('.tooltip');
  if (t.node()) {
    return t;
  }
  const tooltip = parent.insert('div', before)
    .attr('class', classname)
    .style('display', 'none');

  tooltip.append('p').attr('class', 'title');
  tooltip.append('p').attr('class', 'content');

  return tooltip;
}

/**
* Function to bind a tooltip (on mousedown/mousemove)
* on each element described by the given 'selector'.
* Options can contains the name of attribute containing
* the tooltip value, the name of the class to be used for
* the tooltip and the parent DOM element on which appending
* these tooltips (these tooltips are created and destroyed
* each time they are displayed).
*
* @param {String} selector
* @param {Object} options
* @return {Void}
*
*/
const Tooltipsify = (selector, options = {}) => {
  const opts = {
    parent: options.parent || document.body,
    className: options.className || 'tooltip-black',
    dataAttr: options.dataAttr || 'title-tooltip',
    timeout: options.timeout || 5,
  };
  const elems = d3.selectAll(selector);
  if (elems._groups[0].length === 0) return;

  let tooltip_parent = d3.select(opts.parent).select(`.${opts.className}`);
  let tooltip;
  let t;

  if (!tooltip_parent.node()) {
    tooltip_parent = d3.select(opts.parent).insert('div')
      .attr('class', opts.className)
      .style('display', 'none');
    tooltip = tooltip_parent.append('p').attr('class', 'content');
  } else {
    tooltip = tooltip_parent.select('.content');
  }

  elems
    .on('mouseover', () => {
      clearTimeout(t);
      tooltip_parent.style('display', null);
    })
    .on('mouseout', () => {
      clearTimeout(t);
      t = setTimeout(() => { tooltip_parent.style('display', 'none'); }, opts.timeout);
    })
    .on('mousemove mousedown', function () {
      clearTimeout(t);
      tooltip
        .html(this.getAttribute(opts.dataAttr));
      const b = tooltip.node().getBoundingClientRect();
      tooltip_parent
        .styles({
          display: null,
          left: `${d3.event.pageX - 5}px`,
          top: `${d3.event.pageY - b.height - 15}px`,
        });
    });
};

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
  if (test_value < ref_value) {
    return serie_inversed ? color_sup : color_inf;
  }
  return serie_inversed ? color_inf : color_sup;
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

const getRatioToWide = () => {
  if (window.matchMedia('(min-width: 1561px)').matches) {
    return 1550 / 1350;
  } else if (window.matchMedia('(min-width: 1361px) and (max-width: 1560px)').matches) {
    return 1350 / 1350;
  } else if (window.matchMedia('(min-width: 1161px) and (max-width: 1360px)').matches) {
    return 1150 / 1350;
  } else if (window.matchMedia('(min-width: 960px) and (max-width: 1160px)').matches) {
    return 960 / 1350;
  } else if (window.matchMedia('(max-width: 959px)').matches) {
    return 540 / 1350;
  }
  return 1350 / 1350;
};


function addSpacesSeparator(value) {
  const reg = /(\d+)(\d{3})/;
  let val = `${value}`;
  while (reg.test(val)) {
    val = val.replace(reg, '$1 $2');
  }
  return val;
}


function formatNumber(value, precision) {
  let val = `${value}`;
  if (!val.match(/^-?[0-9]*.?[0-9]*$/)) return false;
  if (precision) {
    const mult = +([1].concat(Array(precision).fill(0)).join(''));
    val = `${Math.round(+val * mult) / mult}`;
  }
  const values_list = val.split('.');
  values_list[0] = addSpacesSeparator(values_list[0]);
  return values_list.join(',');
}


export {
  comp,
  comp2,
  math_abs,
  math_round,
  math_sin,
  math_cos,
  math_max,
  math_sqrt,
  math_pow,
  HALF_PI,
  Rect,
  PropSizer,
  unbindUI,
  prepareTooltip2,
  removeDuplicates,
  getSvgPathType,
  svgPathToCoords,
  computePercentileRank,
  _getPR,
  getMean,
  getStdDev,
  getStandardizedMeanStdDev,
  shuffle,
  euclidian_distance,
  selectFirstAvailableVar,
  prepareGeomLayerId,
  getRandom,
  Tooltipsify,
  getElementsFromPoint,
  getRatioToWide,
  formatNumber,
};
