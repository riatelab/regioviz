import alertify from 'alertifyjs';
import {
  math_max, math_min, math_sin, math_cos, HALF_PI, computePercentileRank, getMean2,
  formatNumber, svgContextMenu, isContextMenuDisplayed, getElementsFromPoint, getScrollValue,
} from './../helpers';
import { color_disabled, color_countries, color_highlight, fixed_dimension } from './../options';
import { calcPopCompletudeSubset, calcCompletudeSubset } from './../prepare_data';
import { app, variables_info, study_zones, territorial_mesh } from './../../main';
import CompletudeSection from './../completude';
import TableResumeStat from './../tableResumeStat';
import { prepareTooltip, Tooltipsify } from './../tooltip';


let svg_bar;
let margin;
let width;
let height;
let t;
let tm;

const updateDimensions = () => {
  svg_bar = d3.select('svg#svg_bar')
    .attr('viewBox', `-5 -5 ${fixed_dimension.chart.width} ${fixed_dimension.chart.height}`)
    .on('contextmenu', () => { svgContextMenu(app.chart, svg_bar, app.map); });
  margin = { top: 60, right: 80, bottom: 60, left: 80 };
  width = fixed_dimension.chart.width - margin.left - margin.right;
  height = fixed_dimension.chart.height - margin.top - margin.bottom;
  const width_value = document.getElementById('bar_section').getBoundingClientRect().width * 0.98;
  d3.select('.cont_svg.cchart').style('padding-top', `${(fixed_dimension.chart.height / fixed_dimension.chart.width) * width_value}px`);
};

/**
* Move an element from an array to a specific position
*
* @param {Array} array - The array to work on.
* @param {Number} from - The index of the element to be moved.
* @param {Number} to - The targeted index for this element.
* @return {Array} - The input array after the element has been moved.
*
*/
const move = function move(array, from, to) {
  array.splice(to, 0, array.splice(from, 1)[0]);
  return array;
};

/**
* Swap two features of an array.
*
* @param {Array} array - The array to work on.
* @param {Number} ix1 - The index of the first feature.
* @param {Number} ix2 - The index of the second feature.
* @return {Array} - The input array after the element has been swaped.
*
*/
const swap = function swap(array, ix1, ix2) {
  [array[ix1], array[ix2]] = [array[ix2], array[ix1]]; // eslint-disable-line no-param-reassign
  return array;
};

/**
* Prepare the data for "my region"
*
* @param {Array} data - The whole subset of the dataset we are currently working on.
* @param {Array} variables - The variables currently selected.
* @return {Object} - An object containing the data prepared in order to feed the radar.
*
*/
const prepare_data_radar_default = (data, variables) => {
  // Prepare the data for "My Région":
  const v_my_region = data.find(d => d.id === app.current_config.my_region);
  const ojb_my_region = {
    name: app.current_config.my_region,
    axes: [],
  };
  variables.forEach((v) => {
    const temp = variables_info.find(d => d.id === v);
    const _v = `pr_${v}`;
    ojb_my_region.axes.push({
      axis: temp.id, value: v_my_region[_v], raw_value: v_my_region[v], raw_value_unit: temp.unit,
    });
  });
  return ojb_my_region;
};

/**
* Prepare the data for a region.
*
* @param {Array} data - The whole subset of the dataset we are currently working on.
* @param {Array} variables - The variables currently selected.
* @param {String} ft - The ID of the region for which we are preparing this object.
* @return {Object} - An object containing the data prepared in order to feed the radar.
*
*/
const prepare_data_radar_ft = (data, variables, ft) => {
  const ft_values = data.find(d => d.id === ft);
  if (!ft_values) {
    return null;
  }
  const obj = {
    name: ft,
    axes: [],
  };
  variables.forEach((v) => {
    const temp = variables_info.find(d => d.id === v);
    const _v = `pr_${v}`;
    obj.axes.push({
      axis: temp.id, value: ft_values[_v], raw_value: ft_values[v], raw_value_unit: temp.unit,
    });
  });
  return obj;
};

/** Class representing a Radar (spider) chart */
export default class RadarChart3 {
  /**
   * Create a Radar chart on the `svg_bar` svg element previously defined
   * @param {Array} data - A reference to the subset of the dataset to be used
   * to create the radar (should contain at least three fields flagged as ratio
   * in the `app.current_config.ratio` Object).
   * @param {Object} options - Options regarding the style of the radar to be draw.
   */
  constructor(data, options) {
    updateDimensions();
    const cfg = {
      w: width - 20, // Width of the circle
      h: height - 20, // Height of the circle
      margin: margin, // The margins of the SVG
      levels: 10, // How many levels or inner circles should there be drawn
      maxValue: 100, // What is the value that the biggest circle will represent
      // How much farther than the radius of the outer circle should the labels be placed:
      labelFactor: 1.2,
      wrapWidth: 100, // The number of pixels after which a label needs to be given a new line
      opacityArea: 0.10, // The opacity of the area of the blob
      dotRadius: 4, // The size of the colored circles of each blog
      opacityCircles: 0.1, // The opacity of the circles of each blob
      strokeWidth: 2, // The width of the stroke around each blob
      roundStrokes: true, // If true the area and stroke will follow a round path (cardinal-closed)
      color: d3.scaleOrdinal(d3.schemeCategory10), // Color function,
      format: '.3', // The format string to be used by d3.format
      // The unit to display after the number on the axis and point tooltips (like $, €, %, etc):
      unit: '%',
      legend: false,
      allowInverseData: true,
    };
    this.cfg = cfg;
    // Put all of the options into a variable called cfg
    if (typeof options !== 'undefined') {
      const opts_key = Object.keys(options);
      for (let i = 0, len_i = opts_key.length; i < len_i; i++) {
        const k = opts_key[i];
        if (typeof options[k] !== 'undefined') {
          cfg[k] = options[k];
        }
      }
    }
    this.inversedAxis = new Set();
    this.g = svg_bar.append('g')
      .attr('id', 'RadarGrp')
      .attr('transform', `translate(${cfg.w / 2 + cfg.margin.left},${cfg.h / 2 + cfg.margin.top})`);

    // Prepare the tooltip displayed on mouseover:
    this.tooltip = prepareTooltip(d3.select(svg_bar.node().parentNode), null);

    this.prepareData(data);
    this.drawAxisGrid();
    this.drawArea();

    this.completude = new CompletudeSection();
    // Compute the "complétude" value for these ratios:
    this.completude.update(
      calcCompletudeSubset(app, this.variables, 'array'),
      calcPopCompletudeSubset(app, this.variables));
    app.colors[app.current_config.my_region] = color_highlight;
    if (cfg.allowInverseData) {
      this.inverse_data = (field) => {
        const data_length = this.data.length;
        if (!field) {
          for (let i = 0; i < data_length; i++) {
            const ax = this.data[i].axes;
            for (let j = 0; j < ax.length; j++) {
              ax[j].value = 100 - ax[j].value;
            }
          }
        } else {
          for (let i = 0; i < data_length; i++) {
            const ax = this.data[i].axes;
            for (let j = 0; j < ax.length; j++) {
              if (ax[j].axis === field) {
                ax[j].value = 100 - ax[j].value;
              }
            }
          }
        }
        this.update();
      };
    }
    this.makeTableStat();
    d3.select('#bar_section')
      .append('div')
      .attr('id', 'menu_selection')
      .styles({ position: 'relative', 'text-align': 'left', 'padding-left': '5em', top: '-2em' });

    this.updateLegend();
  }

  wrap(_text, _width) {
    const self = this;
    const nb_var = app.current_config.ratio.length;

    const colorLabel = function colorLabel() {
      const el = this.parentNode.querySelector('text');
      el.style.fill = 'darkblue';
      el.style.fontWeight = '800';
      const ix = +this.parentNode.id.slice(2);
      let ix1 = ix + 1;
      if (ix1 > nb_var - 1) {
        ix1 = 0;
      }
      self.g.select(`g#gp${ix1}`).select('text').style('fill', 'darkblue').style('font-weight', '800');
    };

    const unColorLabel = function unColorLabel(label) {
      const el = this.parentNode.querySelector('text');
      if (self.inversedAxis.has(label)) {
        el.style.fill = 'red';
      } else {
        el.style.fill = 'black';
      }
      el.style.fontWeight = null;
      const ix = +this.parentNode.id.slice(2);
      let ix1 = ix + 1;
      if (ix1 > nb_var - 1) {
        ix1 = 0;
      }
      const label1 = self.g.select(`g#gp${ix1}`).data()[0];
      self.g.select(`g#gp${ix1}`).select('text').style('fill', self.inversedAxis.has(label1) ? 'red' : 'black').style('font-weight', null);
    };

    const swapAxis = function swapAxis() {
      const ix = +this.parentNode.id.slice(2);
      if (ix + 1 === self.allAxis.length) {
        for (let i = 0; i < self.data.length; i++) {
          swap(self.data[i].axes, ix, 0);
        }
      } else {
        const new_ix = ix + 1;
        for (let i = 0; i < self.data.length; i++) {
          move(self.data[i].axes, ix, new_ix);
        }
      }
      self.update();
    };

    const reverseAxis = function reverseAxis(label) {
      const id_axis = this.parentNode.id;
      if (self.inversedAxis.has(label)) {
        self.inversedAxis.delete(label);
        self.g.select(`g#${id_axis}`)
          .select('.img_reverse')
          .attr('xlink:href', 'img/reverse_plus.png');
        this.style.fill = 'black';
      } else {
        self.inversedAxis.add(label);
        self.g.select(`g#${id_axis}`)
          .select('.img_reverse')
          .attr('xlink:href', 'img/reverse_moins.png');
        this.style.fill = 'red';
      }
      d3.event.stopPropagation();
      d3.event.preventDefault();
      self.inverse_data(label);
    };

    _text.each(function () {
      const text = d3.select(this);
      const words = text.text().split(/\s+/).reverse();
      const lineHeight = 1.4;
      const x = +text.attr('x');
      const dy = parseFloat(text.attr('dy'));
      const id = +text.attr('id');
      let y = +text.attr('y');
      let line = [];
      let lineNumber = 0;
      if (id === 0) y += 12;
      if (id === nb_var / 2) y -= 12;
      let tspan = text.text(null)
        .append('tspan')
        .attr('x', x)
        .attr('y', y)
        .attr('dy', `${dy}em`);
      let word = words.pop();
      while (word) {
        line.push(word);
        tspan.text(line.join(' '));
        if (tspan.node().getComputedTextLength() > _width) {
          line.pop();
          tspan.text(line.join(' '));
          line = [word];
          lineNumber += 1;
          tspan = text.append('tspan')
            .attrs({ x: 'x', y: 'y', dy: `${lineNumber * lineHeight + dy}em` })
            .text(word);
        }
        word = words.pop();
      }
    });
    svg_bar.selectAll('.img_reverse')
      .attrs(function () {
        const el = this.parentNode.querySelector('tspan');
        const x = +el.getAttribute('x') - 20;
        const y = +el.getAttribute('y') + 15;
        return { x, y };
      })
      .on('click', self.cfg.allowInverseData ? reverseAxis : null);

    svg_bar.selectAll('.img_reverse2')
      .attrs(function (_, i) {
        const el = this.parentNode.querySelector('tspan');
        const x = +el.getAttribute('x');
        const y = +el.getAttribute('y') + 15;
        const transform = `rotate(${(360 / nb_var) * i}, ${x + 25 / 2}, ${y + 10 / 2})`;
        return { x, y, transform };
      })
      .on('mouseover', colorLabel)
      .on('mouseout', unColorLabel)
      .on('click', swapAxis);

    svg_bar.selectAll('.rectlabel')
      .attrs(function () {
        const el = this.parentNode.querySelector('tspan');
        const bbox = el.getBoundingClientRect();
        const x = +el.getAttribute('x') - bbox.width / 2 - 20;
        const y = +el.getAttribute('y') - 15;
        const _h = 60;
        const _w = bbox.width + 40;
        return { x, y, height: _h, width: _w };
      });
  }

  add_element(elem) {
    const axes_reordered = [];
    elem.axes.forEach((ft) => {
      if (this.inversedAxis.has(ft.axis)) {
        ft.value = 100 - ft.value; // eslint-disable-line no-param-reassign
      }
    });
    this.data[0].axes.forEach((n) => {
      axes_reordered.push(elem.axes.find(ft => ft.axis === n.axis));
    });
    // eslint-disable-next-line no-param-reassign
    elem.axes = axes_reordered;
    this.data.push(elem);
    const colors_in_use = Object.keys(app.colors).map(k => app.colors[k]);
    for (let j = 0; j < this.data.length; j++) {
      const on_axes = [];
      if (this.id_my_region === this.data[j].name) app.colors[this.data[j].name] = color_highlight;
      else if (!app.colors[this.data[j].name]) {
        let ii = 0;
        while (ii < 21) {
          ii += 1;
          const c = this.cfg.color(ii);
          if (!(colors_in_use.indexOf(c) > -1)) {
            app.colors[this.data[j].name] = c;
          }
        }
      }
      for (let i = 0; i < this.data[j].axes.length; i++) {
        this.data[j].axes[i].id = this.data[j].name;
        on_axes.push(this.data[j].name);
      }
    }
    this.displayed_ids.push(elem.name);
    const self = this;
    const cfg = this.cfg;

    const blobWrapper = this.g
      .insert('g', '.radarCircleWrapper')
      .attrs({
        id: elem.name.indexOf(' ') > -1 ? 'ctx' : elem.name,
        class: 'radarWrapper',
      });

    // Append the backgrounds
    blobWrapper
      .append('path')
      .attrs({ class: 'radarArea', d: this.radarLine(elem.axes) })
      .styles({ fill: app.colors[elem.name], 'fill-opacity': cfg.opacityArea })
      .on('mouseover', function () {
        // Dim all blobs
        self.g.selectAll('.radarArea')
          .transition().duration(200)
          .style('fill-opacity', 0);
        // Bring back the hovered over blob
        d3.select(this)
          .transition().duration(200)
          .style('fill-opacity', 0.3);
      })
      .on('mouseout', () => {
        // Bring back all blobs
        self.g.selectAll('.radarArea')
          .transition().duration(200)
          .style('fill-opacity', cfg.opacityArea);
      })
      .on('click', (d) => {
        const ft_id = d.name;
        self.map_elem.target_layer
          .selectAll('path')
          .each(function (ft) {
            if (ft.id === ft_id) {
              const cloned = this.cloneNode();
              cloned.style.stroke = 'yellow';
              cloned.style.strokeWidth = '2.25px';
              cloned.classList.add('cloned');
              self.map_elem.layers.select('#temp').node().appendChild(cloned);
              setTimeout(() => {
                cloned.remove();
              }, 5000);
            }
          });
      });

    // Create the outlines
    blobWrapper.append('path')
      .attrs({ class: 'radarStroke', d: this.radarLine(elem.axes) })
      .styles({
        fill: 'none',
        stroke: app.colors[elem.name],
        filter: 'url(#glow)',
        'stroke-width': `${cfg.strokeWidth}px`,
      });

    // Append the circles
    blobWrapper.selectAll('.radarCircle')
      .data(elem.axes)
      .enter()
      .append('circle')
      .attrs((d, i) => ({
        class: 'radarCircle',
        r: cfg.dotRadius,
        cx: this.rScale(d.value) * math_cos(this.angleSlice * i - HALF_PI),
        cy: this.rScale(d.value) * math_sin(this.angleSlice * i - HALF_PI),
      }))
      .styles({
        fill: app.colors[elem.name],
        'fill-opacity': 0.8,
      });

    blobWrapper.node().__data__ = elem;

    // ///////////////////////////////////////////////////////
    // ////// Append invisible circles for tooltip ///////////
    // ///////////////////////////////////////////////////////

    // Wrapper for the invisible circles on top
    const blobCircleWrapper = this.g
      .append('g')
      .attr('id', elem.name.indexOf(' ') > -1 ? 'ctx' : elem.name)
      .attr('class', 'radarCircleWrapper');

    blobCircleWrapper.node().__data__ = elem;

    // Append a set of invisible circles on top for the mouseover pop-up
    blobCircleWrapper.selectAll('.radarInvisibleCircle')
      .data(elem.axes)
      .enter()
      .append('circle')
      .attrs((d, i) => ({
        class: 'radarInvisibleCircle',
        r: cfg.dotRadius * 1.5,
        cx: this.rScale(d.value) * math_cos(this.angleSlice * i - HALF_PI),
        cy: this.rScale(d.value) * math_sin(this.angleSlice * i - HALF_PI),
      }))
      .styles({
        fill: 'none',
        'pointer-events': 'all',
      });

    this.makeTooltips();
  }

  prepareData(data) {
    // Set the minimum number of variables to keep selected for this kind of chart:
    app.current_config.nb_var = 3;
    this.variables = app.current_config.ratio;
    this.ref_data = data.slice().filter(
      ft => this.variables.map(v => !!ft[v]).every(d => d === true));
    this.rank_variables = this.variables.map(d => `pr_${d}`);
    this.variables.forEach((d, i) => {
      computePercentileRank(this.ref_data, d, this.rank_variables[i]);
    });
    // try {
    //   this.data = [prepare_data_radar_default(this.ref_data, this.variables)];
    // } catch (e) {
    //   console.log(e, this.ref_data, this.variables);
    //   this.data = [];
    // }
    this.data = [prepare_data_radar_default(this.ref_data, this.variables)];
    this.displayed_ids = this.data.map(d => d.name);
    this.current_ids = this.ref_data.map(d => d.id);
    this.id_my_region = app.current_config.my_region;

    // If the supplied maxValue is smaller than the actual one, replace by the max in the data
    let maxValue = 0;
    for (let j = 0; j < this.data.length; j++) {
      if (this.id_my_region === this.data[j].name) app.colors[this.data[j].name] = color_highlight;
      else app.colors[this.data[j].name] = this.cfg.color(j + 1);
      for (let i = 0; i < this.data[j].axes.length; i++) {
        this.data[j].axes[i].id = this.data[j].name;
        if (this.data[j].axes[i].value > maxValue) {
          maxValue = this.data[j].axes[i].value;
        }
      }
    }

    this.maxValue = math_max(this.cfg.maxValue, maxValue);
    this.allAxis = this.data[0].axes.map(i => i.axis); // Names of each axis
    this.total = this.allAxis.length; // The number of different axes
    this.radius = math_min(this.cfg.w / 2, this.cfg.h / 2); // Radius of the outermost circle
    this.Format = d3.format(this.cfg.format); // Formatting
    this.angleSlice = Math.PI * 2 / this.total; // The width in radians of each "slice"
    // Scale for the radius
    this.rScale = d3.scaleLinear()
      .range([0, this.radius])
      .domain([0, this.maxValue]);
    // The radial line function
    this.radarLine = d3.radialLine()
      .curve(this.cfg.roundStrokes ? d3.curveCardinalClosed : d3.curveLinearClosed)
      .radius(d => this.rScale(d.value))
      .angle((d, i) => i * this.angleSlice);
  }

  drawAxisGrid() {
    const self = this;
    const cfg = this.cfg;
    const g = this.g;
    const radius = this.radius;
    const maxValue = this.maxValue;
    const rScale = this.rScale;
    const angleSlice = this.angleSlice;

    const axisGrid = g.append('g').attr('class', 'axisWrapper');

    // Draw the background circles
    axisGrid.selectAll('.levels')
      .data(d3.range(1, (cfg.levels + 1)).reverse())
      .enter()
      .append('circle')
      .attrs(d => ({
        class: 'gridCircle',
        r: radius / cfg.levels * d,
      }))
      .styles((d) => {
        if (d === 5) {
          return {
            fill: '#CDCDCD',
            stroke: 'rgb(245, 138, 138)',
            'stroke-dasharray': '5, 5',
            'fill-opacity': cfg.opacityCircles,
            filter: 'url(#glow)',
          };
        }
        return {
          fill: '#CDCDCD',
          stroke: '#CDCDCD',
          'fill-opacity': cfg.opacityCircles,
          filter: 'url(#glow)',
        };
      });

    // Create the straight lines radiating outward from the center
    const axis = axisGrid.selectAll('.axis')
      .data(this.allAxis)
      .enter()
      .append('g')
      .attr('class', 'axis');
    // Append the lines
    axis.append('line')
      .attrs((d, i) => ({
        x1: 0,
        y1: 0,
        x2: rScale(maxValue * 1.1) * math_cos(angleSlice * i - HALF_PI),
        y2: rScale(maxValue * 1.1) * math_sin(angleSlice * i - HALF_PI),
        class: 'line',
      }))
      .styles({ stroke: 'white', 'stroke-width': '2px' });

    // Append the labels at each axis
    const gp_axis_label = axis.append('g')
      .attr('id', (d, i) => `gp${i}`)
      .attr('class', 'gp_axis_label')
      .style('pointer-events', 'all');

    gp_axis_label.append('rect')
      .attrs({ class: 'rectlabel', fill: 'transparent' });

    const texts = gp_axis_label.append('text')
      .attrs((d, i) => ({
        id: i,
        class: 'legend',
        dy: '0.35em',
        'text-anchor': 'middle',
        'font-family': '"Signika",sans-serif',
        'title-tooltip': variables_info.find(ft => ft.id === d).name,
        x: rScale(maxValue * cfg.labelFactor) * math_cos(angleSlice * i - HALF_PI),
        y: rScale(maxValue * cfg.labelFactor) * math_sin(angleSlice * i - HALF_PI),
      }))
      .styles(d => ({
        'font-size': '14px',
        fill: (self.inversedAxis.has(d) ? 'red' : 'black'),
      }))
      .text(d => d);

    gp_axis_label.append('image')
      .attrs({
        class: 'img_reverse',
        width: 15,
        height: 15,
        'xlink:href': 'img/reverse_plus.png',
        title: 'Inverser l\'ordre de classement de l\'indicateur',
      })
      .styles({ cursor: 'pointer', display: 'none' });

    gp_axis_label.append('image')
      .attrs({
        width: 25,
        height: 10,
        'xlink:href': 'img/rotation_arrow.png',
        class: 'img_reverse2',
        title: 'Inverser l\'ordre des axes sur le graphique',
        transform: 'rotate(0, 0, 0)',
      })
      .styles({ cursor: 'pointer', display: 'none' });

    texts.call(d => this.wrap(d, cfg.wrapWidth));

    gp_axis_label
      .on('mouseover', function () {
        clearTimeout(tm);
        d3.select(this)
          .selectAll('image')
          .style('display', null)
          .attr('y', function () {
            return +this.parentNode.querySelector('tspan').getAttribute('y') + 15;
          });
        tm = setTimeout(() => {
          d3.select(this)
            .selectAll('image')
            .style('display', 'none');
        }, 5000);
      })
      .on('mouseout', function () {
        clearTimeout(tm);
        tm = setTimeout(() => {
          d3.select(this)
            .selectAll('image')
            .style('display', 'none');
        }, 250);
      });

    this.g.selectAll('.gridCircle')
      .on('mousemove mouseover', () => {
        clearTimeout(tm);
        d3.selectAll('.gp_axis_label').selectAll('image').style('display', 'none');
      });

    // Filter for the outside glow
    const filter = g.append('defs')
      .append('filter')
      .attr('id', 'glow');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '2.5')
      .attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    this.axisGrid = axisGrid;
  }

  makeTooltips() {
    const self = this;
    this.g.selectAll('.radarInvisibleCircle')
      .on('mouseover', () => {
        clearTimeout(t);
        this.tooltip.style('display', null);
      })
      .on('mouseout', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          this.tooltip.style('display', 'none').selectAll('p').html('');
        }, 250);
      })
      .on('mousemove mousedown', (d) => {
        if (isContextMenuDisplayed()) return;
        clearTimeout(t);
        const code_variable = d.axis;
        const id_feature = d.id;
        const direction = self.inversedAxis.has(code_variable)
          ? 'inférieure' : 'supérieure';
        const { scrollX, scrollY } = getScrollValue();
        self.tooltip.select('.title')
          .attr('class', d.id === app.current_config.my_region ? 'title myRegion' : 'title')
          .html([app.feature_names[id_feature], ' (', id_feature, ')'].join(''));
        self.tooltip.select('.content')
          .attr('class', 'content')
          .html([
            `${code_variable} : ${formatNumber(d.raw_value, 1)} ${d.raw_value_unit}`,
            `Rang : ${formatNumber(d.value, 1)}/100`,
            `${formatNumber(100 - d.value, 1)} ${self.cfg.unit} des régions ont une valeur ${direction}`,
          ].join('<br>'));
        self.tooltip
          .styles({
            display: null,
            left: `${d3.event.pageX - scrollX - 5}px`,
            top: `${d3.event.pageY - scrollY - self.tooltip.node().getBoundingClientRect().height - 5}px`,
          });
      });
  }

  updateLegend() {
    const self = this;
    const menu_selection = d3.select('#menu_selection');
    menu_selection.selectAll('div').remove();
    menu_selection.append('div')
      .attr('class', 'mini-legend-line noselect redline')
      .style('margin', 'auto')
      .html(`<div class="mini-legend-item">
<p class="color_square" style="background-image:url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAXCAYAAAD+4+QTAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAVYAAAFWABqGegqwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAACaSURBVEiJ7ZO7CYVAEADnHq8DC7ABEwMrEGOxDiMDCxCsQTC3ksPA3E8PdqCIrMEGV4G84N0mOwwLE60REeHl+bwd8JE/jhgpSyHPIcvU9D3Ms3LTQBDAdUFVqQtDqGvlaYJhUC4KSFPlroNtU25bvlgLceyy6wrWKh+H7vt2Lorc7b47nyTOLwuMo/J5Yvwz+oiP+IiP/DDyAKfDL75QM0o+AAAAAElFTkSuQmCC')"></p>
<span>Médiane de l'espace d'étude</span></div>`);

    menu_selection.selectAll('div')
      .data(this.data.map(a => a.name), d => d)
      .enter()
      .append('div')
      .attr('class', 'mini-legend-line noselect')
      .style('margin', 'auto')
      .html(d => (
        d === this.id_my_region
          ? `<div class="mini-legend-item"><p class="color_square" style="background-color:${app.colors[d]}"></p><span>${app.feature_names[d]}</span></div>`
          : `<div class="mini-legend-item"><p class="color_square" style="background-color:${app.colors[d]}"></p><span>${app.feature_names[d]}</span></div><span value="ft_${d}" class="btn_delete_mini">✘</span>`));
    menu_selection.selectAll('.btn_delete_mini')
      .style('cursor', 'pointer')
      .on('click', function () {
        const id = this.getAttribute('value').slice(3);
        if (id === app.current_config.my_region) {
          return;
        }
        app.colors[id] = null;
        self.g.selectAll(`#${id}.radarWrapper`).remove();
        self.g.selectAll(`#${id}.radarCircleWrapper`).remove();
        const ix = self.data.map((_d, i) => [i, _d.name === id]).find(_d => _d[1] === true)[0];
        self.data.splice(ix, 1);
        self.displayed_ids = self.data.map(_d => _d.name);
        self.update();
        self.updateMapRegio();
      });
  }

  drawArea() {
    const cfg = this.cfg;
    const g = this.g;
    const rScale = this.rScale;
    const angleSlice = this.angleSlice;

    // Create a wrapper for the blobs
    const blobWrapper = g.selectAll('.radarWrapper')
      .data(this.data, d => d.name)
      .enter()
      .append('g')
      .attr('id', d => (d.name.indexOf(' ') > -1 ? 'ctx' : d.name))
      .attr('class', 'radarWrapper');

    // Append the backgrounds
    blobWrapper
      .append('path')
      .attrs(d => ({
        class: 'radarArea',
        d: this.radarLine(d.axes),
      }))
      .styles(d => ({
        fill: app.colors[d.name],
        'fill-opacity': cfg.opacityArea,
      }))
      .on('mouseover', function () {
        // Dim all blobs
        g.selectAll('.radarArea')
          .transition().duration(200)
          .style('fill-opacity', 0.1);
        // Bring back the hovered over blob
        d3.select(this)
          .transition().duration(200)
          .style('fill-opacity', 0.7);
      })
      .on('mouseout', () => {
        g.selectAll('.radarArea')
          .transition().duration(200)
          .style('fill-opacity', cfg.opacityArea);
      });

    // Create the outlines
    blobWrapper.append('path')
      .attrs(d => ({
        class: 'radarStroke',
        d: this.radarLine(d.axes),
      }))
      .styles(d => ({
        fill: 'none',
        stroke: app.colors[d.name],
        filter: 'url(#glow)',
        'stroke-width': `${cfg.strokeWidth}px`,
      }));

    // Append the circles
    blobWrapper.selectAll('.radarCircle')
      .data(d => d.axes)
      .enter()
      .append('circle')
      .attrs((d, i) => ({
        class: 'radarCircle',
        r: cfg.dotRadius,
        cx: rScale(d.value) * math_cos(angleSlice * i - HALF_PI),
        cy: rScale(d.value) * math_sin(angleSlice * i - HALF_PI),
      }))
      .styles(d => ({
        fill: app.colors[d.id],
        'fill-opacity': 0.8,
      }));

    // ///////////////////////////////////////////////////////
    // ////// Append invisible circles for tooltip ///////////
    // ///////////////////////////////////////////////////////

    // Wrapper for the invisible circles on top
    const blobCircleWrapper = g.selectAll('.radarCircleWrapper')
      .data(this.data, d => d.name)
      .enter()
      .append('g')
      .attrs(d => ({
        id: (d.name.indexOf(' ') > -1 ? 'ctx' : d.name),
        class: 'radarCircleWrapper',
      }));

    // Append a set of invisible circles on top for the mouseover pop-up
    blobCircleWrapper.selectAll('.radarInvisibleCircle')
      .data(d => d.axes)
      .enter()
      .append('circle')
      .attrs((d, i) => ({
        class: 'radarInvisibleCircle',
        r: cfg.dotRadius * 1.5,
        cx: rScale(d.value) * math_cos(angleSlice * i - HALF_PI),
        cy: rScale(d.value) * math_sin(angleSlice * i - HALF_PI),
      }))
      .styles({
        fill: 'none',
        'pointer-events': 'all',
      });

    this.makeTooltips();
  }

  update() {
    const rScale = this.rScale;
    const maxValue = this.maxValue;
    const cfg = this.cfg;
    const angleSlice = this.angleSlice;
    this.allAxis = this.data[0].axes.map(elem => elem.axis);
    const update_axis = this.axisGrid.selectAll('.axis')
      .data(this.allAxis);

    const tn = this.g.selectAll('.radarWrapper')
      .transition()
      .duration(225);

    const _g = update_axis.select('g');
    _g.select('.rectlabel').attr('class', 'rectlabel');
    _g.select('.img_reverse')
      .attr('xlink:href', d => (this.inversedAxis.has(d) ? 'img/reverse_moins.png' : 'img/reverse_plus.png'))
      .style('display', 'none');
    _g.select('.img_reverse2').style('display', 'none');
    _g.select('text.legend')
      .attrs((d, i) => ({
        'title-tooltip': variables_info.find(ft => ft.id === d).name,
        id: i,
        x: rScale(maxValue * cfg.labelFactor) * math_cos(angleSlice * i - HALF_PI),
        y: rScale(maxValue * cfg.labelFactor) * math_sin(angleSlice * i - HALF_PI),
      }))
      .styles(d => ({
        fill: this.inversedAxis.has(d) ? 'red' : 'black',
      }))
      .text(d => d)
      .call(d => this.wrap(d, cfg.wrapWidth));

    const update_blobWrapper = this.g.selectAll('.radarWrapper')
      .data(this.data, d => d.name);

    update_blobWrapper.select('.radarArea')
      .transition(tn)
      .attr('d', d => this.radarLine(d.axes));

    update_blobWrapper.select('.radarStroke')
      .transition(tn)
      .attr('d', d => this.radarLine(d.axes));

    const circle = update_blobWrapper.selectAll('.radarCircle')
      .data(d => d.axes);
    circle
      .transition(tn)
      .attrs((d, i) => ({
        cx: rScale(d.value) * math_cos(angleSlice * i - HALF_PI),
        cy: rScale(d.value) * math_sin(angleSlice * i - HALF_PI),
      }))
      .styles(d => ({
        fill: app.colors[d.id],
        'fill-opacity': 0.8,
      }));

    const update_blobCircleWrapper = this.g.selectAll('.radarCircleWrapper')
      .data(this.data, d => d.name);

    const invisibleCircle = update_blobCircleWrapper.selectAll('.radarInvisibleCircle')
      .data(d => d.axes);
    invisibleCircle
      .transition(tn)
      .attrs((d, i) => ({
        cx: rScale(d.value) * math_cos(angleSlice * i - HALF_PI),
        cy: rScale(d.value) * math_sin(angleSlice * i - HALF_PI),
      }));

    this.updateLegend();
  }

  round_stroke(val) {
    if (val === undefined) {
      return this.cfg.roundStrokes;
    } else if (val !== this.cfg.roundStrokes) {
      this.cfg.roundStrokes = val;
      this.radarLine = d3.radialLine()
        .curve(this.cfg.roundStrokes ? d3.curveCardinalClosed : d3.curveLinearClosed)
        .radius(d => this.rScale(d.value))
        .angle((d, i) => i * this.angleSlice);
      this.update();
    }
    return val;
  }

  bindMap(map_elem) {
    this.map_elem = map_elem;
    this.map_elem.resetColors(this.current_ids);
    this.map_elem.displayLegend(2);
    this.updateMapRegio();
  }

  remove() {
    this.table_stats.remove();
    this.table_stats = null;
    this.map_elem.layers.selectAll('.cloned').remove();
    this.map_elem.unbindBrushClick();
    this.map_elem = null;
    d3.select('#svg_bar').text('').html('');
  }

  // eslint-disable-next-line class-methods-use-this
  getElemBelow(e) {
    const elems = getElementsFromPoint(e.clientX, e.clientY);
    const elem = elems.find(el => el.className.baseVal === 'radarArea');
    return elem && elem.__data__ ? elem.__data__.name : null;
  }


  updateChangeRegion() {
    this.changeStudyZone();
  }

  changeStudyZone() {
    const old_my_region = this.id_my_region;
    const other_features = this.displayed_ids.filter(d => d !== old_my_region);
    this.g.remove();
    this.g = svg_bar.append('g')
      .attr('id', 'RadarGrp')
      .attr('transform', `translate(${this.cfg.w / 2 + this.cfg.margin.left},${this.cfg.h / 2 + this.cfg.margin.top})`);

    this.id_my_region = app.current_config.my_region;
    this.prepareData(app.current_data);
    Array.prototype.slice.call(this.inversedAxis).forEach((v) => { this.inverse_data(v); });
    this.drawAxisGrid();
    this.drawArea();
    other_features.forEach((id) => {
      if (this.current_ids.indexOf(id) > -1 && id !== this.id_my_region) {
        const a = prepare_data_radar_ft(this.ref_data, this.variables, id);
        this.add_element(a);
      }
    });
    this.updateMapRegio();
    this.updateCompletude();
    this.updateTableStat();
    this.updateLegend();
  }

  // eslint-disable-next-line no-unused-vars
  addVariable(code_variable) {
    const other_features = this.displayed_ids.filter(d => d !== this.id_my_region);
    this.g.remove();
    this.g = svg_bar.append('g')
      .attr('id', 'RadarGrp')
      .attr('transform', `translate(${this.cfg.w / 2 + this.cfg.margin.left},${this.cfg.h / 2 + this.cfg.margin.top})`);

    this.prepareData(app.current_data);
    Array.prototype.slice.call(this.inversedAxis).forEach((v) => { this.inverse_data(v); });
    this.drawAxisGrid();
    this.drawArea();
    other_features.forEach((id) => {
      if (this.current_ids.indexOf(id) > -1) {
        const a = prepare_data_radar_ft(this.ref_data, this.variables, id);
        this.add_element(a);
      }
    });
    this.updateCompletude();
    this.updateMapRegio();
    this.updateTableStat();
    this.updateLegend();
    Tooltipsify('[title-tooltip]');
  }

  // eslint-disable-next-line no-unused-vars
  removeVariable(code_variable) {
    const other_features = this.displayed_ids.filter(d => d !== this.id_my_region);
    this.g.remove();
    this.g = svg_bar.append('g')
      .attr('id', 'RadarGrp')
      .attr('transform', `translate(${this.cfg.w / 2 + this.cfg.margin.left},${this.cfg.h / 2 + this.cfg.margin.top})`);

    this.prepareData(app.current_data);
    Array.prototype.slice.call(this.inversedAxis).forEach((v) => { this.inverse_data(v); });
    this.drawAxisGrid();
    this.drawArea();
    other_features.forEach((id) => {
      const a = prepare_data_radar_ft(this.ref_data, this.variables, id);
      this.add_element(a);
    });
    this.updateCompletude();
    this.updateMapRegio();
    this.updateTableStat();
    Tooltipsify('[title-tooltip]');
  }

  prepareTableStat() {
    const all_values = this.variables.map(v => this.ref_data.map(d => d[v]));
    const my_region = this.ref_data.find(d => d.id === this.id_my_region);
    const features = all_values.map((values, i) => ({
      Min: d3.min(values),
      Max: d3.max(values),
      Moy: getMean2(this.ref_data, this.variables[i], variables_info),
      Med: d3.median(values),
      id: this.variables[i],
      Variable: this.variables[i],
      'Ma région': my_region[this.variables[i]],
    }));
    return features;
  }

  handleClickMap(d, parent) { // eslint-disable-line no-unused-vars
    const id = d.id;
    if (this.current_ids.indexOf(id) < 0 || id === this.id_my_region) return;
    if (this.displayed_ids.indexOf(id) < 0) {
      if (this.data.length > 6) {
        alertify.warning('Le nombre maximal de régions sélectionnées est atteint.');
        return;
      }
      const a = prepare_data_radar_ft(this.ref_data, this.variables, id);
      this.add_element(a);
      this.update();
    } else {
      app.colors[id] = null;
      this.g.selectAll(`#${id}.radarWrapper`).remove();
      this.g.selectAll(`#${id}.radarCircleWrapper`).remove();
      const ix = this.data.map((_d, i) => [i, _d.name === id]).find(_d => _d[1] === true)[0];
      this.data.splice(ix, 1);
      this.displayed_ids = this.data.map(_d => _d.name);
      this.update();
    }
    this.updateMapRegio();
  }

  updateCompletude() {
    this.completude.update(
      calcCompletudeSubset(app, this.variables, 'array'),
      calcPopCompletudeSubset(app, this.variables));
  }

  updateMapRegio() {
    if (!this.map_elem) return;
    this.map_elem.target_layer.selectAll('path')
      .attr('fill', (d) => {
        if (d.id === this.id_my_region) {
          return color_highlight;
        } else if (this.current_ids.indexOf(d.id) > -1) {
          if (this.displayed_ids.indexOf(d.id) > -1) {
            return app.colors[d.id];
          }
          return color_countries;
        }
        return color_disabled;
      });
  }

  updateTableStat() {
    this.table_stats.removeAll();
    this.table_stats.addFeatures(this.prepareTableStat());
  }

  makeTableStat() {
    const features = this.prepareTableStat();
    this.table_stats = new TableResumeStat(features);
  }

  // eslint-disable-next-line class-methods-use-this
  getHelpMessage() {
    return `
<h3>Position - 3 indicateurs</h3>
<b>Aide générale</b>

Ce graphique en radar permet de comparer la situation d’une région sélectionnée en fonction d’un jeu de <b>3 indicateurs et plus</b>. Afin de rendre comparables les indicateurs exprimés dans des ordres de grandeur et des unités de mesure hétérogènes, ceux-ci sont préalablement normalisés au regard du rang des régions sur chacun des indicateurs sélectionnés. Ainsi, pour un indicateur donné, une valeur d’indice sera comprise entre 0 et 100. Par exemple, une valeur de 60 signifiera que 60 % des régions sont caractérisées par des valeurs inférieures sur cet indicateur et 40 % par des valeurs supérieures.
Le rang normalisé X’ d’une région i est calculé en effectuant le rapport entre la valeur du rang absolu et le nombre total d’observations multiplié par 100 :
<p id="formula" style="text-align: center; font-size: 0.9em;">
$Rang\\ Normalisé\\ X’ (Région\\ i) = {Rang\\ X\\ (Région\\ i) - 1 \\over {N - 1}} * 100$
</p>
<small>
Avec :
X : Indicateur X
Rang : position décroissante dans la distribution (croissant lorsque l’indicateur est inversé)
N : Nombre total de régions de l’espace d’étude
</small>
Cette méthode permet de rendre comparables les positions relatives des régions sur différents indicateurs en termes de rangs, mais elle ne restitue pas d’information sur l’ampleur des écarts entre ces régions.
A partir de ces indices, on peut construire un graphique en radar qui correspond à un graphique multidimensionnel de rangs relatifs.

<br><p style="text-align: center;"><a class="buttonDownload" href="data/Doc_methodo_pos_3ind.pdf">Aide détaillée (.pdf)</a></p>`;
  }

  getTemplateHelp() {
    const info_var = {};
    this.variables.forEach((v, i) => {
      info_var[i + 1] = variables_info.find(ft => ft.id === v);
    });
    const my_region_pretty_name = app.current_config.my_region_pretty_name;
    const name_territorial_mesh = territorial_mesh
      .find(d => d.id === app.current_config.current_level).name;
    // eslint-disable-next-line no-nested-ternary
    const name_study_zone = !app.current_config.filter_key
      ? 'UE28' : app.current_config.filter_key instanceof Array
        ? ['UE28 (Régions dans un voisinage de ', document.getElementById('dist_filter').value, 'km)'].join('')
        : study_zones.find(d => d.id === app.current_config.filter_key).name;
    const help1 = [];
    this.variables.forEach((v, i) => {
      help1.push(`<b>Indicateur ${i + 1}</b> : ${info_var[i + 1].name} (<i>${info_var[i + 1].id}</i>)<br>`);
    });
    help1.push(`<b>Maillage territorial d'analyse</b> : ${territorial_mesh.find(d => d.id === app.current_config.current_level).name}<br>`);
    if (app.current_config.my_category) {
      help1.push(
        `<b>Espace d'étude</b> : Régions de même ${name_study_zone}<br><b>Catégorie</b> : ${app.current_config.my_category}`);
    } else if (app.current_config.filter_key) {
      help1.push(
        `<b>Espace d'étude</b> : UE28 (Régions dans un voisinage de ${document.getElementById('dist_filter').value} km)`);
    } else {
      help1.push( // eslint-disable-next-line quotes
        `<b>Espace d'étude</b> : UE28`);
    }
    const my_region = this.data[0];
    let compl = calcCompletudeSubset(app, this.variables, 'array');
    compl = compl[0] === compl[1] ? 'la totalité des' : `${compl[0]} des ${compl[1]}`;
    // const o_my_region = app.full_dataset.find(d => d.id === my_region.id);
    const sup_median = my_region.axes.filter(d => d.value > 50);
    const inf_median = my_region.axes.filter(d => d.value <= 50);

    const help2 = [`Ce graphique en radar permet de visualiser la situation de l'unité territoriale <b>${my_region_pretty_name}</b> en fonction d'un jeu de <b>${this.variables.length} indicateurs</b> :<br>`];
    this.variables.forEach((v, i) => {
      help2.push(` - ${v} : ${info_var[i + 1].name}<br>`);
    });
    help2.push(`
      Les données sont disponibles pour ${compl} unités territoriales de l’espace d’étude ${name_study_zone},
      au niveau ${name_territorial_mesh}, soit ${formatNumber(calcPopCompletudeSubset(app, this.variables), 0)}% de la population de l’espace d’étude.<br>
      <br>`);
    help2.push(`
      Afin de rendre comparables les indicateurs exprimés dans des ordres de grandeur et des unités de mesure hétérogènes,
      ceux-ci sont préalablement normalisés au regard du rang des unités territoriales sur chacun des indicateurs sélectionnés.
      Ainsi, pour un indicateur donné, une valeur d’indice (rang) sera comprise entre 0 et 100.
      Par exemple, une valeur de 60 signifiera que 60 % des unités territoriales sont caractérisées par des valeurs inférieures sur cet indicateur et 40 % par des valeurs supérieures.
      <br><br>`);
    if (sup_median.length > 0) {
      help2.push(
        `Pour l’espace d’étude <b>${name_study_zone}</b> et au maillage ${name_territorial_mesh},
        l’unité territoriale <b>${my_region_pretty_name}</b> se positionne <b>au-dessus de la valeur médiane (50)</b> pour les indicateurs suivants (position jugée favorable) :<br>`);
      sup_median.forEach((v) => {
        help2.push(` - ${v.axis}, ${formatNumber(v.raw_value, 1)} ${v.raw_value_unit} (rang ${formatNumber(v.value, 1)}/100)<br>`);
      });
    } else {
      help2.push('Cette unité territoriale n\'est positionnée <b>au-dessus de la valeur médiane</b> pour aucun de ces indicateurs.<br>');
    }
    if (inf_median.length > 0) {
      help2.push('<br>Cette unité territoriale se positionne <b>sous la valeur médiane</b> pour les indicateurs suivants (position jugée défavorable) :<br>');
      inf_median.forEach((v) => {
        help2.push(` - ${v.axis}, ${formatNumber(v.raw_value, 1)} ${v.raw_value_unit} (rang ${formatNumber(v.value, 1)}/100)<br>`);
      });
    } else {
      help2.push('<br>Cette unité territoriale n\'est positionnée <b>sous la valeur médiane</b> pour aucun de ces indicateurs.<br>');
    }

    if (this.data.length > 1) {
      help2.push('<div style="font-size:0.9em;">');
      this.data.forEach((region, i) => {
        if (i > 0) {
          const id_region = region.name;
          const o_region = app.full_dataset.find(d => d.id === id_region);
          help2.push('<br>');
          const _inf_my_reg = region.axes.filter((d, j) => d.value <= my_region.axes[j].value);
          const _sup_my_reg = region.axes.filter((d, j) => d.value > my_region.axes[j].value);
          if (_inf_my_reg.length > 0) {
            help2.push(
              `En comparaison à l’unité territoriale <b>${o_region.name}</b> (${o_region.UNIT_SUP}), l’unité territoriale <b>${app.current_config.my_region_pretty_name}</b> est caractérisée par des valeurs plus favorable pour les indicateurs suivants :<br>`);
            _inf_my_reg.forEach((v) => {
              // const my_region_axis = my_region.axes.find(vv => vv.axis === v.axis).
              help2.push(` - ${v.axis} (écart de rang : ${formatNumber(my_region.axes.find(vv => vv.axis === v.axis).value - v.value, 1)})<br>`);
            });
          } else {
            help2.push(`
              Par rapport à l'unité territoriale ${o_region.name}, l'unité territoriale ${app.current_config.my_region_pretty_name} se situe dans une position favorable pour l'ensemble des indicateurs.
              `);
          }
          if (_sup_my_reg.length > 0) {
            help2.push(`Inversement, l’unité territoriale <b>${app.current_config.my_region_pretty_name}</b> est caractérisée par des valeurs moins importantes pour ces indicateurs :<br>`);
            _sup_my_reg.forEach((v) => {
              help2.push(` - ${v.axis} (écart de rang : ${formatNumber(my_region.axes.find(vv => vv.axis === v.axis).value - v.value, 1)})<br>`);
            });
          } else {
            help2.push(`
              Par rapport à l'unité territoriale ${o_region.name}, l'unité territoriale ${app.current_config.my_region_pretty_name} se situe dans une position défavorable pour l'ensemble des indicateurs.
              `);
          }
        }
      });
      help2.push('</div>');
    }
    const source = this.variables
      .map((v, i) => `<b>Indicateur ${i + 1}</b> : ${info_var[i + 1].source} (Date de téléchargement de la donnée : ${info_var[i + 1].last_update})`)
      .join('<br>');

    const lgd = document.getElementById('menu_selection').outerHTML.replace(/✘/g, '');
    const extra_css = `.mini-legend-item { display: inline-block; }
.mini-legend-item > p.color_square {width: 1.1em;height: 1.1em;margin: auto;display: inline-block;vertical-align: text-top;border-radius: 10%;}
.mini-legend-item > span {padding: 0 5px;}`;
    return {
      section_selection: help1.join(''),
      section_help: help2.join(''),
      section_source: source,
      section_optional: lgd,
      extra_css,
    };
  }
}
