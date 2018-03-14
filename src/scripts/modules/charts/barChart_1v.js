import {
  comp, math_round, math_abs, math_max, Rect, getScrollValue,
  getMean2, svgPathToCoords, getElementsFromPoint, formatNumber,
  svgContextMenu, isContextMenuDisplayed,
} from './../helpers';
import { color_disabled, color_countries, color_sup, color_inf, color_highlight, fixed_dimension } from './../options';
import { calcPopCompletudeSubset, calcCompletudeSubset } from './../prepare_data';
import { app, resetColors, variables_info, study_zones, territorial_mesh } from './../../main';
import TableResumeStat from './../tableResumeStat';
import CompletudeSection from './../completude';
import ContextMenu from './../contextMenu';
import { prepareTooltip } from './../tooltip';

let svg_bar;
let margin;
let margin2;
let width;
let height;
let height2;
let svg_container;
let t;
let nbFt;
let current_range_brush = [0, 0];
let current_range = [0, 0];
let displayed;

function updateDimensions() {
  svg_bar = d3.select('svg#svg_bar')
    .attr('viewBox', `0 0 ${fixed_dimension.chart.width} ${fixed_dimension.chart.height}`)
    .on('contextmenu', () => { svgContextMenu(app.chart, svg_bar, app.map); });
  margin = {
    top: 10,
    right: 20,
    bottom: 100,
    left: 60,
  };
  margin2 = {
    top: math_round(fixed_dimension.chart.height - margin.top - margin.bottom + 45),
    right: 20,
    bottom: 12.5,
    left: 60,
  };
  width = fixed_dimension.chart.width - margin.left - margin.right;
  height = fixed_dimension.chart.height - margin.top - margin.bottom;
  height2 = fixed_dimension.chart.height - margin2.top - margin2.bottom;
  const width_value = document.getElementById('bar_section').getBoundingClientRect().width * 0.98;
  d3.select('.cont_svg.cchart').style('padding-top', `${(fixed_dimension.chart.height / fixed_dimension.chart.width) * width_value}px`);
  svg_container = svg_bar.append('g').attr('class', 'container');
}

/**
* Get the rank corresponding to the mean value
* (or any value for which we may be interested in knowning its rank)
*
* @param {Number} mean_value - The mean value.
* @param {String} ratio_to_use - The name of the variable currently in use.
* @return {Number} - The rank corresponding to the input value.
*
*/
function getMeanRank(mean_value, ratio_to_use) {
  let mean_rank = app.current_data.map(
    (d, i) => [d[ratio_to_use], math_abs(mean_value - d[ratio_to_use]), i]);
  mean_rank.sort((a, b) => a[1] - b[1]);
  mean_rank = mean_rank[0];
  if (mean_rank[1] > mean_value) {
    mean_rank = mean_rank[2] - 1;
  } else {
    mean_rank = mean_rank[2];
  }
  return mean_rank;
}

/** Class representing a scatterplot */
export default class BarChart1 {
  /**
   * Create a bar chart on the `svg_bar` svg element previously defined.
   *
   * @param {Array} ref_data - A reference to the subset of the dataset to be used
   * to create the scatterplot (should contain at least one field flagged as ratio
   * in the `app.current_config.ratio` Object).
   */

  constructor(ref_data) {
    this.brushed = () => {
      if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'zoom') return; // ignore brush-by-zoom
      if (!this.x) {
        return;
      }
      const s = d3.event.selection || this.x2.range();
      this.context_left_handle.attr('x', s[0] - 12);
      this.context_right_handle.attr('x', s[1] - 7);
      current_range = [math_round(s[0] / (width / nbFt)), math_round(s[1] / (width / nbFt))];
      this.x.domain(this.data.slice(current_range[0], current_range[1]).map(ft => ft.id));
      svg_container.select('.zoom').call(this.zoom.transform, d3.zoomIdentity
        .scale(width / (current_range[1] - current_range[0]))
        .translate(-current_range[0], 0));
      this.update();
      this.updateContext(current_range[0], current_range[1]);
      svg_container.select('.brush_top').call(this.brush_top.move, null);
      // this.brushed_top();
    };

    this.brushed_top = () => {
      if (!this._focus || !this.map_elem) return;

      const d3_event = d3.event;
      const my_region = app.current_config.my_region;

      // const elems = document.elementsFromPoint(
      //   d3_event.sourceEvent.pageX, d3_event.sourceEvent.pageY);
      // const elem = elems.find(e => e.className.baseVal === 'bar');
      // if (elem) {
      //   const new_click_event = new MouseEvent('mousedown', {
      //     pageX: d3_event.sourceEvent.pageX,
      //     pageY: d3_event.sourceEvent.pageY,
      //     clientX: d3_event.sourceEvent.clientX,
      //     clientY: d3_event.sourceEvent.clientY,
      //     bubbles: true,
      //     cancelable: true,
      //     view: window
      //   });
      //   elem.dispatchEvent(new_click_event);
      // } else {
      clearTimeout(t);
      t = setTimeout(() => { this.tooltip.style('display', 'none').selectAll('p').html(''); }, 5);
      // }

      // if (d3_event && d3_event.selection
      //       && d3_event.sourceEvent
      //       && d3_event.sourceEvent.target === document.querySelector(
      //         '.brush_top > rect.overlay')) {
      if (d3_event && d3_event.selection && d3_event.sourceEvent && d3_event.sourceEvent.target) {
        this.map_elem.removeRectBrush();
        const s = d3_event.selection;
        current_range_brush = [
          current_range[0] + math_round(s[0] / (width / displayed)) - 1,
          current_range[0] + math_round(s[1] / (width / displayed)),
        ];
        // this.x.domain(this.data.slice(current_range_brush[0] + 1, current_range_brush[1])
        //   .map(ft => ft.id));
        const ix_ref = this.data.findIndex(d => d.id === my_region);
        app.colors = {};
        this._focus.selectAll('.bar')
          .style('fill', (d, i) => {
            if (d.id === my_region) {
              app.colors[d.id] = color_highlight;
              return color_highlight;
            } else if (i > current_range_brush[0] && i < current_range_brush[1]) {
              const color = comp(i, ix_ref, this.serie_inversed);
              app.colors[d.id] = color;
              return color;
            }
            return color_countries;
          });
        // this.update();
        if (this.reset_state_button === true) {
          d3.select('#menu_selection').selectAll('button').attr('class', 'button_blue');
        }
        this.updateMapRegio();
      } else {
        if (d3_event && !d3_event.selection
            && d3_event.sourceEvent && d3_event.sourceEvent.detail !== undefined) {
          this.map_elem.removeRectBrush();
          app.colors = {};
          app.colors[my_region] = color_highlight;
          this.updateMapRegio();
        }
        this._focus.selectAll('.bar')
          .style('fill', d => app.colors[d.id] || color_countries);
        if (this.reset_state_button === true) {
          d3.select('#menu_selection').selectAll('button').attr('class', 'button_blue');
        }
      }
    };
    updateDimensions();
    // Set the minimum number of variables to keep selected for this kind of chart:
    app.current_config.nb_var = 1;
    const x = d3.scaleBand().range([0, width]).padding(0.1);
    const x2 = d3.scaleBand().range([0, width]).padding(0.1);
    const y = d3.scaleLinear().range([height, 0]);
    const y2 = d3.scaleLinear().range([height2, 0]);

    const xAxis = d3.axisBottom(x);
    const xAxis2 = d3.axisBottom(x2);
    const yAxis = d3.axisLeft(y);

    this.x = x;
    this.x2 = x2;
    this.y = y;
    this.y2 = y2;
    this.xAxis = xAxis;
    this.yAxis = yAxis;
    this.xAxis2 = xAxis2;
    const self = this;
    const available_ratios = app.current_config.ratio;
    const ratio_to_use = available_ratios[0];
    this.ratio_to_use = ratio_to_use;
    this.unit = variables_info.find(ft => ft.id === ratio_to_use).unit;
    this.data = ref_data.filter(ft => !!ft[ratio_to_use]);
    this.data.sort((a, b) => a[ratio_to_use] - b[ratio_to_use]);
    this.current_ids = this.data.map(d => d.id);
    resetColors();
    this.current_ranks = this.data.map((d, i) => i + 1);
    nbFt = this.data.length;
    this.mean_value = getMean2(this.data, ratio_to_use, variables_info);
    this.ref_value = this.data.filter(
      ft => ft.id === app.current_config.my_region)[0][ratio_to_use];
    svg_container.append('defs')
      .append('clipPath')
      .attr('id', 'clip')
      .append('rect')
      .attrs({ width, height });

    // Focus is the 'big' bar chart, located on the top:
    const focus = svg_container.append('g')
      .attrs({
        class: 'focus',
        transform: `translate(${margin.left}, ${margin.top})`,
      });

    // Focus is the 'small' bar chart, located on the bottom:
    const context = svg_container.append('g')
      .attrs({
        class: 'context',
        transform: `translate(${margin2.left}, ${margin2.top})`,
      });

    this._focus = focus;
    this.context = context;
    let min_serie = d3.min(this.data, d => d[ratio_to_use]);
    min_serie = min_serie >= 0 ? 0 : min_serie + min_serie / 10;
    const max_serie = d3.max(this.data, d => d[ratio_to_use]);
    x.domain(this.current_ids);
    y.domain([min_serie, max_serie]);
    x2.domain(x.domain());
    y2.domain(y.domain());

    const brush_bottom = d3.brushX()
      .extent([[0, 0], [width, height2]])
      .on('brush end', this.brushed);

    const brush_top = d3.brushX()
      .extent([[0, 0], [width, height]])
      .on('brush end', this.brushed_top);

    const zoom = d3.zoom()
      .scaleExtent([1, Infinity])
      .translateExtent([[0, 0], [width, height]])
      .extent([[0, 0], [width, height]]);
      // .on("zoom", zoomed);
    this.brush_top = brush_top;
    this.brush_bottom = brush_bottom;
    this.zoom = zoom;

    focus.append('g')
      .attrs({ class: 'axis axis--x', transform: `translate(0, ${height})` })
      .call(xAxis);

    focus.select('.axis--x')
      .selectAll('text')
      .style('text-anchor', 'end')
      .attrs({ dx: '-0.8em', dy: '0.15em', transform: 'rotate(-65)' });

    focus.append('g')
      .attr('class', 'axis axis--y')
      .call(yAxis.tickFormat(formatNumber));

    this.g_bar = focus.append('g');

    const g_brush_top = focus.append('g')
      .attr('class', 'brush_top')
      .call(brush_top);

    const groupe_line_mean = focus.append('g').attr('class', 'mean');

    groupe_line_mean.append('line')
      .attrs({
        x1: 0,
        x2: width,
        y1: y(this.mean_value),
        y2: y(this.mean_value),
        'stroke-dasharray': '10, 5',
        'stroke-width': '2px',
        class: 'mean_line',
      })
      .style('stroke', 'red');

    groupe_line_mean.append('line')
      .attrs({ x1: 0, x2: width, y1: y(this.mean_value), y2: y(this.mean_value), 'stroke-width': '14px', class: 'transp_mean_line' })
      .style('stroke', 'transparent')
      .on('mouseover', () => {
        clearTimeout(t);
        t = setTimeout(() => { this.tooltip.style('display', 'none').select('.title').attr('class', 'title').html(''); }, 250);
        // this.tooltip.style('display', null).select('.title').attr('class', 'title red');
      })
      .on('mouseout', () => {
        clearTimeout(t);
        t = setTimeout(() => { this.tooltip.style('display', 'none').select('.title').attr('class', 'title').html(''); }, 250);
      })
      .on('mousemove mousedown', () => {
        clearTimeout(t);
        if (isContextMenuDisplayed()) return;
        const content = ['Moyenne de l\'espace d\'étude'];
        let _h = 65;
        if (app.current_config.my_category) {
          content.push('<br>', ' (', app.current_config.my_category, ')');
          _h += 20;
        } else if (app.current_config.filter_key) {
          content.push(
            '<br>',
            ' (Régions dans un voisinage de ',
            document.getElementById('dist_filter').value,
            'km)');
          _h += 20;
        }
        // const { scrollX, scrollY } = getScrollValue();
        self.tooltip.select('.title')
          .attr('class', 'title red')
          .html(content.join(''));
        self.tooltip.select('.content')
          .html(['Valeur : ', formatNumber(self.mean_value, 1), ' ', self.unit].join(''));
        self.tooltip
          .styles({
            display: null,
            left: `${d3.event.clientX - 5}px`,
            top: `${d3.event.clientY - _h}px`,
          });
      });

    this.updateMiniBars();

    const g_brush_bottom = context.append('g')
      .attr('class', 'brush_bottom')
      .call(brush_bottom);

    this.context_left_handle = g_brush_bottom.insert('image', '.handle')
      .attrs({
        width: 20,
        height: height2,
        x: x2(this.current_ids[0]) - 12,
        'xlink:href': 'img/left-handle2.png',
      })
      .styles({
        cursor: 'col-resize',
        'pointer-events': 'none',
      });

    this.context_right_handle = g_brush_bottom.insert('image', '.handle')
      .attrs({
        width: 20,
        height: height2,
        x: x2(this.current_ids[this.current_ids.length - 1]) - 7,
        'xlink:href': 'img/right-handle2.png',
      })
      .styles({
        cursor: 'col-resize',
        'pointer-events': 'none',
      });

    g_brush_top.call(brush_top.move, null);
    g_brush_bottom.call(brush_bottom.move, x.range());

    this.completude = new CompletudeSection();
    this.completude.update(
      calcCompletudeSubset(app, [this.ratio_to_use], 'array'),
      calcPopCompletudeSubset(app, [this.ratio_to_use]));

    svg_container.append('image')
      .attrs({
        x: width + margin.left + 2.5,
        y: 385,
        width: 15,
        height: 15,
        'xlink:href': 'img/reverse_plus.png',
        id: 'img_reverse',
        title: 'Inverser l\'ordre de classement de l\'indicateur',
      })
      .style('cursor', 'pointer')
      .on('click', function () {
        // this.data = app.current_data.slice();
        if (!self.serie_inversed) {
          this.setAttributeNS(d3.namespaces.xlink, 'xlink:href', 'img/reverse_moins.png');
          self.title_variable
            .classed('inversed', true)
            .attr('title-tooltip', `${self.title_variable.attr('title-tooltip')} (axe inversé)`);
          self.data.sort((a, b) => b[self.ratio_to_use] - a[self.ratio_to_use]);
        } else {
          this.setAttributeNS(d3.namespaces.xlink, 'xlink:href', 'img/reverse_plus.png');
          self.title_variable
            .classed('inversed', false)
            .attr('title-tooltip',
              `${self.title_variable.attr('title-tooltip')}`.replace(' (axe inversé)', ''));
          self.data.sort((a, b) => a[self.ratio_to_use] - b[self.ratio_to_use]);
        }
        self.current_ids = self.data.map(d => d.id);
        self.serie_inversed = !self.serie_inversed;
        x.domain(self.data.slice(current_range[0], current_range[1]).map(ft => ft.id));
        x2.domain(self.data.map(ft => ft.id));
        // svg_container.select(".zoom").call(zoom.transform, d3.zoomIdentity
        //     .scale(width / (current_range[1] - current_range[0]))
        //     .translate(-current_range[0], 0));
        self.update();
        // this.updateMiniBars();
        self.updateContext(current_range[0], current_range[1]);
        svg_container.select('.brush_top').call(brush_top.move, null);
        self.map_elem.removeRectBrush();
        svg_container.select('.brush_bottom').call(brush_bottom.move, x.range());
      });

    // Prepare the tooltip displayed on mouseover:
    this.tooltip = prepareTooltip(d3.select(svg_bar.node().parentNode), null);

    // // Deactivate the brush rect selection on the map + on the chart
    // // when he user press the Ctrl key:
    // document.onkeydown = (event) => {
    //   if (event && event.key === 'Control') {
    //     svg_container.select('.brush_top')
    //       .selectAll('.selection, .overlay')
    //       .style('display', 'none');
    //     svg_map.select('.brush_map')
    //       .selectAll('.selection, .overlay')
    //       .style('display', 'none');
    //   }
    // };
    // document.onkeyup = (event) => {
    //   if (event && event.key === 'Control') {
    //     svg_container.select('.brush_top')
    //       .selectAll('.selection, .overlay')
    //       .style('display', null);
    //     svg_map.select('.brush_map')
    //       .selectAll('.selection, .overlay')
    //       .style('display', null);
    //   }
    // };

    const header_bar_section = d3.select('#header_chart');

    this.menu_var = new ContextMenu();
    this.items_menu = available_ratios.map((elem, i) => {
      const code_variable = elem;
      let name_variable = app.current_config.ratio_pretty_name[i];
      const unit = variables_info.find(ft => ft.id === code_variable).unit;
      const year = name_variable.match(/\([^)]*\)$/)[0];
      const unit_year = `${year.slice(0, 1)}${unit}, ${year.slice(1, 6)}`;
      name_variable = name_variable.replace(year, unit_year);
      return {
        name: name_variable,
        code: code_variable,
        action: () => {
          this.changeVariable(code_variable, name_variable);
          this.changeStudyZone();
          this.updateCompletude();
        },
      };
    });

    this.title_variable = header_bar_section.append('span')
      .attrs({
        class: 'title_variable',
        'title-tooltip': app.current_config.ratio_pretty_name[0],
      })
      .html(`${this.items_menu[0].name.replace(/\(/, '&&&').split('&&&').join('<br>(')}  &#x25BE;`)
      .on('click', function () {
        const bbox = this.getBoundingClientRect();
        const items = self.items_menu.filter(el => el.code !== self.ratio_to_use);
        if (items.length > 0) {
          self.menu_var.showMenu(
            d3.event,
            document.body,
            items,
            [bbox.left - 5, bbox.bottom + 2.5]);
        }
      });

    // Create the menu under the chart allowing to use some useful selections
    // (above or below the mean value and above or below my_region)
    const menu_selection = d3.select('#bar_section')
      .append('div')
      .attr('id', 'menu_selection')
      .styles({ padding: '0 10px 10px 10px', 'text-align': 'center', color: '#4f81bd' });

    menu_selection.append('p')
      .attr('id', 'selection_subtitle')
      .styles({ margin: '10px 0px 2px 0px' })
      .html('Sélection des régions ayant des valeurs...');

    menu_selection.append('div')
      .attr('class', 'cont_btn')
      .append('button')
      .attrs({ class: 'button_blue', id: 'btn_above_mean' })
      .text('inférieures à la moyenne')
      .on('click', function () {
        menu_selection.selectAll('button').attr('class', 'button_blue');
        this.classList.add('pressed');
        self.selectBelowMean();
      });

    menu_selection.append('div')
      .attr('class', 'cont_btn')
      .append('button')
      .attrs({ class: 'button_blue', id: 'btn_above_my_region' })
      .text('inférieurs à ma région')
      .on('click', function () {
        menu_selection.selectAll('button').attr('class', 'button_blue');
        this.classList.add('pressed');
        self.selectBelowMyRegion();
      });

    menu_selection.append('div')
      .attr('class', 'cont_btn')
      .append('button')
      .attrs({ class: 'button_blue', id: 'btn_below_mean' })
      .text('supérieures à la moyenne')
      .on('click', function () {
        menu_selection.selectAll('button').attr('class', 'button_blue');
        this.classList.add('pressed');
        self.selectAboveMean();
      });

    menu_selection.append('div')
      .attr('class', 'cont_btn')
      .append('button')
      .attrs({ class: 'button_blue', id: 'btn_below_my_region' })
      .text('supérieures à ma région')
      .on('click', function () {
        menu_selection.selectAll('button').attr('class', 'button_blue');
        this.classList.add('pressed');
        self.selectAboveMyRegion();
      });

    this.makeTableStat();
  }

  updateCompletude() {
    this.completude.update(
      calcCompletudeSubset(app, [this.ratio_to_use], 'array'),
      calcPopCompletudeSubset(app, [this.ratio_to_use]));
  }

  updateContext(min, max) {
    this.context.selectAll('.bar')
      .style('fill-opacity', (_, i) => (i >= min && i < max ? '1' : '0.3'));
  }

  update() {
    displayed = 0;
    const ratio_to_use = this.ratio_to_use;
    const self = this;
    const bar = this.g_bar.selectAll('.bar')
      .data(this.data);

    if (this.reset_state_button === true) {
      d3.select('#menu_selection').selectAll('button').attr('class', 'button_blue');
    }

    bar
      .attrs(d => ({
        x: this.x(d.id),
        y: this.y(math_max(0, d[ratio_to_use])),
        width: this.x.bandwidth(),
        height: math_abs(this.y(0) - this.y(d[ratio_to_use])),
      }))
      .styles((d) => {
        let to_display = this.x(d.id) != null;
        if (to_display) {
          displayed += 1;
          to_display = 'initial';
        } else {
          to_display = 'none';
        }
        return {
          display: to_display,
          fill: app.colors[d.id] || color_countries,
        };
      });

    bar.enter()
      .insert('rect', '.mean')
      .attrs(d => ({
        class: 'bar',
        x: this.x(d.id),
        y: this.y(math_max(0, d[ratio_to_use])),
        width: this.x.bandwidth(),
        height: math_abs(this.y(0) - this.y(d[ratio_to_use])),
      }))
      .styles((d) => {
        let to_display = this.x(d.id) != null;
        if (to_display) {
          displayed += 1;
          to_display = 'initial';
        } else {
          to_display = 'none';
        }
        return {
          display: to_display,
          fill: app.colors[d.id] || color_countries,
        };
      });


    bar.exit().remove();

    this._focus.select('.axis--y')
      .call(this.yAxis);

    const axis_x = this._focus.select('.axis--x')
      // .attr('transform', `translate(0, ${this.y(0)})`)
      .attr('font-size', () => (displayed > 75 ? 6 : 10))
      .call(this.xAxis);
    axis_x
      .selectAll('text')
      .attrs(() => {
        if (displayed > 100) {
          return { dx: '-0.8em', dy: '0.15em', transform: 'rotate(-65)' };
        } else if (displayed > 20) {
          return { dx: '-0.8em', dy: '0.15em', transform: 'rotate(-65)' };
        }
        return { dx: '0', dy: '0.71em', transform: null };
      })
      .style('text-anchor', () => (displayed > 20 ? 'end' : 'middle'))
      .styles(() => {
        if (displayed > 100) {
          return {
            'text-anchor': 'end',
            'font-size': displayed > 170 ? '6px' : '7px',
          };
        } else if (displayed > 20) {
          return {
            'text-anchor': 'end',
            'font-size': '10px',
          };
        }
        return {
          'text-anchor': 'middle',
          'font-size': '11px',
        };
      });

    this.g_bar.selectAll('.bar')
      .on('mouseover', () => {
        clearTimeout(t);
        this.tooltip.style('display', null).select('.title').attr('class', 'title');
      })
      .on('mouseout', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          this.tooltip.style('display', 'none').select('.title').attr('class', 'title').html('');
        }, 250);
      })
      .on('mousemove mousedown', (d) => {
        if (isContextMenuDisplayed()) return;
        clearTimeout(t);
        const { scrollX, scrollY } = getScrollValue();
        self.tooltip.select('.title')
          .attr('class', d.id === app.current_config.my_region ? 'title myRegion' : 'title')
          .html([d.name, ' (', d.id, ')'].join(''));
        self.tooltip.select('.content')
          .html([
            self.ratio_to_use, ' : ', formatNumber(d[self.ratio_to_use], 1), ' ', self.unit, '<br>',
            'Rang : ', nbFt - self.current_ids.indexOf(d.id), '/', self.current_ids.length,
          ].join(''));
        self.tooltip
          .styles({
            display: null,
            left: `${d3.event.pageX - scrollX - 5}px`,
            top: `${d3.event.pageY - scrollY - 85}px`,
          });
      });

    svg_container.select('.brush_top')
      .on('mousemove mousedown', () => {
        if (isContextMenuDisplayed()) return;
        // const elems = getElementsFromPoint(d3.event.clientX, d3.event.clientY);
        const elem = getElementsFromPoint(d3.event.clientX, d3.event.clientY)
          .find(e => e.className.baseVal === 'bar' || e.className.baseVal === 'transp_mean_line');
        if (elem) {
          const new_event = new MouseEvent('mousemove', {
            pageX: d3.event.pageX,
            pageY: d3.event.pageY,
            clientX: d3.event.clientX,
            clientY: d3.event.clientY,
            bubbles: true,
            cancelable: true,
            view: window,
          });
          elem.dispatchEvent(new_event);
        } else {
          clearTimeout(t);
          t = setTimeout(() => { self.tooltip.style('display', 'none').selectAll('p').html(''); }, 250);
        }
      })
      .on('mouseout', () => {
        clearTimeout(t);
        t = setTimeout(() => { self.tooltip.style('display', 'none').selectAll('p').html(''); }, 250);
      });

    this.updateMiniBars();
  }


  updateMiniBars() {
    const ratio_to_use = this.ratio_to_use;
    const mini_bars = this.context.selectAll('.bar')
      .data(this.data);

    mini_bars
      .attrs(d => ({
        x: this.x2(d.id),
        y: this.y2(d[ratio_to_use]),
        width: this.x2.bandwidth(),
        height: height2 - this.y2(d[ratio_to_use]),
      }))
      .style('fill', d => (d.id !== app.current_config.my_region ? color_countries : color_highlight));

    mini_bars
      .enter()
      .insert('rect')
      .attrs(d => ({
        class: 'bar',
        x: this.x2(d.id),
        y: this.y2(d[ratio_to_use]),
        width: this.x2.bandwidth(),
        height: height2 - this.y2(d[ratio_to_use]),
      }))
      .style('fill', d => (d.id !== app.current_config.my_region ? color_countries : color_highlight));
    mini_bars.exit().remove();
  }

  updateMapRegio() {
    this.map_elem.target_layer.selectAll('path')
      .attr('fill', d => (this.current_ids.indexOf(d.id) > -1
        ? (app.colors[d.id] || color_countries)
        : color_disabled));
  }

  selectAboveMyRegion() {
    const my_rank = this.data.map((d, i) => [d.id, i])
      .filter(d => d[0] === app.current_config.my_region)[0][1];
    app.colors = {};
    app.colors[app.current_config.my_region] = color_highlight;
    if (!this.serie_inversed) {
      current_range_brush = [my_rank, this.data.length];
      this.data
        .filter((d, i) => i > my_rank)
        .map(d => d.id)
        .forEach((ft) => { app.colors[ft] = color_sup; });
    } else {
      current_range_brush = [0, my_rank];
      this.data
        .filter((d, i) => i < my_rank)
        .map(d => d.id)
        .forEach((ft) => { app.colors[ft] = color_inf; });
    }
    this.reset_state_button = false;
    svg_container.select('.brush_bottom').call(
      this.brush_bottom.move, this.x2.range());
    this.update();
    // svg_container.select('.brush_top')
    //   .call(this.brush_top.move, current_range_brush.map(d => d * (width / nbFt)));
    this.map_elem.removeRectBrush();
    this.updateMapRegio();
    this.reset_state_button = true;
  }

  selectBelowMyRegion() {
    const my_rank = this.data.map((d, i) => [d.id, i])
      .filter(d => d[0] === app.current_config.my_region)[0][1];

    app.colors = {};
    app.colors[app.current_config.my_region] = color_highlight;
    if (!this.serie_inversed) {
      current_range_brush = [0, my_rank];
      this.data
        .filter((d, i) => i < my_rank)
        .map(d => d.id)
        .forEach((ft) => { app.colors[ft] = color_inf; });
    } else {
      current_range_brush = [my_rank, this.data.length];
      this.data
        .filter((d, i) => i > my_rank)
        .map(d => d.id)
        .forEach((ft) => { app.colors[ft] = color_sup; });
    }
    this.reset_state_button = false;
    svg_container.select('.brush_bottom').call(
      this.brush_bottom.move, this.x2.range());
    this.update();
    // svg_bar.select('.brush_top')
    //   .call(this.brush_top.move, current_range_brush.map(d => d * (width / nbFt)));
    this.map_elem.removeRectBrush();
    this.updateMapRegio();
    this.reset_state_button = true;
  }

  selectAboveMean() {
    const mean_rank = getMeanRank(this.mean_value, this.ratio_to_use);
    const ratio_to_use = this.ratio_to_use;
    const ref_value = this.ref_value;

    app.colors = {};
    app.colors[app.current_config.my_region] = color_highlight;
    if (!this.serie_inversed) {
      current_range_brush = [mean_rank, this.data.length];
      this.data.filter(d => d[ratio_to_use] > this.mean_value).forEach((ft) => {
        if (ft[ratio_to_use] > ref_value) app.colors[ft.id] = color_sup;
        else app.colors[ft.id] = color_inf;
      });
    } else {
      current_range_brush = [0, mean_rank + 1];
      this.data.filter(d => d[ratio_to_use] > this.mean_value).forEach((ft) => {
        if (ft[ratio_to_use] > ref_value) app.colors[ft.id] = color_inf;
        else app.colors[ft.id] = color_sup;
      });
    }
    app.colors[app.current_config.my_region] = color_highlight;
    this.reset_state_button = false;
    svg_bar.select('.brush_bottom').call(
      this.brush_bottom.move, this.x2.range());
    this.update();
    this.map_elem.removeRectBrush();
    // svg_bar.select('.brush_top')
    //   .call(this.brush_top.move, current_range_brush.map(d => d * (width / nbFt)));
    this.updateMapRegio();
    this.reset_state_button = true;
  }

  selectBelowMean() {
    const mean_rank = getMeanRank(this.mean_value, this.ratio_to_use);
    const ratio_to_use = this.ratio_to_use;
    const ref_value = this.ref_value;
    app.colors = {};
    if (!this.serie_inversed) {
      current_range_brush = [0, mean_rank];
      this.data.filter(d => d[ratio_to_use] < this.mean_value).forEach((ft) => {
        if (ft[ratio_to_use] < ref_value) app.colors[ft.id] = color_inf;
        else app.colors[ft.id] = color_sup;
      });
    } else {
      current_range_brush = [mean_rank + 1, this.data.length];
      this.data.filter(d => d[ratio_to_use] < this.mean_value).forEach((ft) => {
        if (ft[ratio_to_use] < ref_value) app.colors[ft.id] = color_sup;
        else app.colors[ft.id] = color_inf;
      });
    }
    app.colors[app.current_config.my_region] = color_highlight;
    this.reset_state_button = false;
    svg_bar.select('.brush_bottom').call(
      this.brush_bottom.move, this.x2.range());
    this.update();
    this.map_elem.removeRectBrush();
    // svg_bar.select('.brush_top')
    //   .call(this.brush_top.move, current_range_brush.map(d => d * (width / nbFt)));
    this.updateMapRegio();
    this.reset_state_button = true;
  }

  handle_brush_map(event) {
    if (!event || !event.selection) {
      this.last_map_selection = undefined;
      return;
    }
    this.map_elem.tooltip.style('display', 'none');
    const my_region = app.current_config.my_region;
    const self = this;
    svg_bar.select('.brush_top').call(self.brush_top.move, null);
    const [topleft, bottomright] = event.selection;
    this.last_map_selection = [topleft, bottomright];
    // const transform = svg_map.node().__zoom;
    // topleft[0] = (topleft[0] - transform.x) / transform.k;
    // topleft[1] = (topleft[1] - transform.y) / transform.k;
    // bottomright[0] = (bottomright[0] - transform.x) / transform.k;
    // bottomright[1] = (bottomright[1] - transform.y) / transform.k;
    const rect = new Rect(topleft, bottomright);
    const ix_ref = this.data.findIndex(d => d.id === my_region);
    app.colors = {};
    self.map_elem.target_layer.selectAll('path')
      .attr('fill', function (d) {
        const id = d.id;
        if (id === my_region) {
          app.colors[id] = color_highlight;
          return color_highlight;
        } else if (self.current_ids.indexOf(id) < 0) {
          return color_disabled;
        }
        if (!this._pts) {
          this._pts = svgPathToCoords(this.getAttribute('d'), app.type_path);
        }
        const pts = this._pts;
        for (let ix = 0, nb_pts = pts.length; ix < nb_pts; ix++) {
          if (rect.contains(pts[ix])) {
            const _ix_regio = self.data.findIndex(_ft => _ft.id === id);
            const color = comp(_ix_regio, ix_ref, self.serie_inversed);
            app.colors[id] = color;
            return color;
          }
        }
        return color_countries;
      });
    self._focus.selectAll('.bar')
      .style('fill', d => app.colors[d.id] || color_countries);
    const ids = Object.keys(app.colors);
    const ranks = ids.map(d => this.current_ids.indexOf(d.id) > -1).map(d => this.current_ranks[d]);
    if (ranks.length > 1) {
      const c1 = ranks[0] - 1;
      const c2 = ranks[ranks.length - 1];
      if (c1 < current_range[0] || c2 > current_range[1]) {
        current_range = [
          ranks[0] - 1,
          ranks[ranks.length - 1],
        ];
        svg_bar.select('.brush_bottom').call(
          self.brush_bottom.move,
          [current_range[0] * (width / nbFt), current_range[1] * (width / nbFt)]);
      }
    } else {
      current_range = [0, this.data.length];
      svg_bar.select('.brush_bottom').call(
        self.brush_bottom.move, self.x.range());
    }
  }

  handleClickMap(d, parent) {
    const id = d.id;
    if (this.current_ids.indexOf(id) < 0 || id === app.current_config.my_region) return;
    if (app.colors[id] !== undefined) {
      app.colors[id] = undefined;
      d3.select(parent).attr('fill', color_countries);
    } else {
      const ix_ref = this.data.findIndex(_d => _d.id === app.current_config.my_region);
      const ix_ft = this.data.findIndex(_d => _d.id === id);
      const color = comp(ix_ft, ix_ref, this.serie_inversed);
      app.colors[id] = color;
      d3.select(parent).attr('fill', color);
    }
    this.update();
  }

  updateChangeRegion() {
    if (app.current_config.filter_key !== undefined) {
      this.changeStudyZone();
    } else {
      this.ref_value = this.data.find(
        ft => ft.id === app.current_config.my_region)[this.ratio_to_use];
      this.update();
      this.updateContext(0, this.data.length);
      this.updateMapRegio();
      this.updateTableStats();
      svg_bar.select('.brush_bottom').call(this.brush_bottom.move, this.x.range());
      this.map_elem.removeRectBrush();
      this.map_elem.updateLegend();
    }
  }

  updateMeanValue() {
    const y = this.y;
    const ratio_to_use = this.ratio_to_use;
    const grp_mean = this._focus.select('.mean');
    this.mean_value = getMean2(this.data, ratio_to_use, variables_info);
    grp_mean.select('text')
      .attr('y', y(this.mean_value) + 20)
      .text(`Valeur moyenne : ${formatNumber(this.mean_value, 1)} ${this.unit}`);
    grp_mean.select('.mean_line')
      .attrs({ y1: y(this.mean_value), y2: y(this.mean_value) });
    grp_mean.select('.transp_mean_line')
      .attrs({ y1: y(this.mean_value), y2: y(this.mean_value) });
  }

  changeStudyZone() {
    const ratio_to_use = this.ratio_to_use;
    this.data = app.current_data.filter(ft => !!ft[ratio_to_use]);
    this.ref_value = this.data.find(
      ft => ft.id === app.current_config.my_region)[ratio_to_use];
    this.current_ranks = this.data.map((d, i) => i + 1);
    if (this.serie_inversed) {
      this.data.sort((a, b) => b[ratio_to_use] - a[ratio_to_use]);
    } else {
      this.data.sort((a, b) => a[ratio_to_use] - b[ratio_to_use]);
    }
    this.current_ids = this.data.map(d => d.id);
    nbFt = this.data.length;
    this.ref_value = this.data.find(
      ft => ft.id === app.current_config.my_region)[ratio_to_use];
    this.x.domain(this.current_ids);
    let min_serie = d3.min(this.data, d => d[ratio_to_use]);
    min_serie = min_serie >= 0 ? 0 : min_serie + min_serie / 10;
    const max_serie = d3.max(this.data, d => d[ratio_to_use]);
    // const offset_y = (max_serie - min_serie) / 20;
    this.y.domain([
      // min_serie - offset_y, max_serie,
      min_serie, max_serie,
    ]);
    this.x2.domain(this.x.domain());
    this.y2.domain(this.y.domain());
    this.updateMeanValue();
    svg_bar.select('.brush_bottom').call(this.brush_bottom.move, this.x2.range());
    this.map_elem.removeRectBrush();
    app.colors = {};
    app.colors[app.current_config.my_region] = color_highlight;
    this.update();
    this.updateContext(0, this.data.length);
    this.updateTableStats();
    this.updateCompletude();
    this.updateMapRegio();
  }

  addVariable(code_variable) {
    // Fetch the unit for this indicator:
    const { name, unit } = variables_info.find(d => d.id === code_variable);
    const year = name.match(/\([^)]*\)$/)[0];
    const unit_year = `${year.slice(0, 1)}${unit}, ${year.slice(1, 6)}`;
    const name_var = name.replace(year, unit_year);
    // Add the variable to the input element allowing to choose variables:
    this.items_menu.push({
      name: name_var,
      code: code_variable,
      action: () => {
        this.changeVariable(code_variable, name_var);
        this.changeStudyZone();
        this.updateCompletude();
      },
    });
    // And use it immediatly:
    this.items_menu[this.items_menu.length - 1].action();
  }

  removeVariable(code_variable) {
    // Remove the variable from the list of items:
    for (let i = this.items_menu.length - 1; i > -1; i--) {
      if (this.items_menu[i].code === code_variable) {
        this.items_menu.splice(i, 1);
        break;
      }
    }
    if (this.ratio_to_use === code_variable) {
      this.items_menu[0].action();
    }
  }

  changeVariable(code_variable, name_variable) {
    this.ratio_to_use = code_variable;
    this.unit = variables_info.find(ft => ft.id === code_variable).unit;
    const content_tooltip = this.serie_inversed
      ? `${name_variable} (axe inversé)`
      : name_variable;
    this.title_variable
      .attr('title-tooltip', content_tooltip)
      .html(
        `${name_variable.replace(/\(/, '&&&').split('&&&').join('<br>(')} &#x25BE;`);
  }

  // eslint-disable-next-line class-methods-use-this
  getElemBelow(e) {
    const elem = getElementsFromPoint(e.clientX, e.clientY)
      .find(el => el.className.baseVal === 'bar');
    return elem && elem.__data__ ? elem.__data__.id : null;
  }

  remove() {
    this._focus.remove();
    this.context.remove();
    this.title_variable.remove();
    this.table_stats.remove();
    this.table_stats = null;
    this.map_elem.unbindBrushClick();
    this.map_elem = null;
    d3.select('#svg_bar').text('').html('');
  }

  bindMap(map_elem) {
    this.map_elem = map_elem;
    this.map_elem.resetColors(this.current_ids);
    this.map_elem.displayLegend(0);
  }

  updateTableStats() {
    this.table_stats.removeAll();
    this.table_stats.addFeature(this.prepareTableStat());
  }

  prepareTableStat() {
    const ratio_to_use = this.ratio_to_use;
    const values = this.data.map(d => d[ratio_to_use]);
    return {
      Min: d3.min(values),
      Max: d3.max(values),
      Moy: getMean2(this.data, ratio_to_use, variables_info),
      Med: d3.median(values),
      id: ratio_to_use,
      Variable: ratio_to_use,
      'Ma région': this.ref_value,
    };
  }

  makeTableStat() {
    const feature = this.prepareTableStat();
    this.table_stats = new TableResumeStat([feature]);
  }

  // eslint-disable-next-line class-methods-use-this
  getHelpMessage() {
    return `
<h3>Position - 1 Indicateur</h3>
<b>Aide générale</b>

Ce graphique en bâtons (<i>bar-plot</i>) permet de comparer la situation de la région sélectionnée sur <b>un indicateur</b>, pour un espace d’étude et un maillage territorial d’analyse donné.

L’utilisateur est invité à renseigner l’indicateur qu’il souhaite voir apparaître sur le graphique.
Par défaut, les rangs sont calculés de façon décroissante (premier rang : valeur maximale ; dernier rang : valeur minimale). Il est possible d’inverser cet ordre de classement.

Ce graphique rend également possible le positionnement des régions au regard de la moyenne.

<br><p style="text-align: center;"><a class="buttonDownload" href="data/Doc_methodo_pos_1ind.pdf">Aide détaillée (.pdf)</a></p>`;
  }

  getTemplateHelp() {
    const my_region_pretty_name = app.current_config.my_region_pretty_name;
    const [, my_rank] = this.data.map((d, i) => [d.id, i])
      .find(d => d[0] === app.current_config.my_region);
    const values = this.data.map(d => d[this.ratio_to_use]).sort((a, b) => a - b);
    const info_var = variables_info.find(ft => ft.id === this.ratio_to_use);
    let inf = 0;
    let sup = 0;
    const my_value = this.ref_value;
    values.forEach((v) => {
      if (v < my_value) {
        inf += 1;
      } else {
        sup += 1;
      }
    });
    let compl = calcCompletudeSubset(app, [this.ratio_to_use], 'array');
    compl = compl[0] === compl[1] ? 'la totalité des' : `${compl[0]} des ${compl[1]}`;
    // eslint-disable-next-line no-nested-ternary
    const name_study_zone = !app.current_config.filter_key
      ? 'UE28' : app.current_config.filter_key instanceof Array
        ? ['Régions dans un voisinage de ', document.getElementById('dist_filter').value, 'km'].join('')
        : study_zones.find(d => d.id === app.current_config.filter_key).name;
    const name_territorial_mesh = territorial_mesh
      .find(d => d.id === app.current_config.current_level).name;
    const help1 = [`<b>Indicateur 1</b> : ${info_var.name} (<i>${info_var.id}</i>)<br>
<b>Maillage territorial d'analyse</b> : ${name_territorial_mesh}<br>`];
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
    const help2 = `
Ce graphique en bâtons (<i>bar-plot</i>) permet de visualiser la situation de l'unité territoriale <b>${my_region_pretty_name}</b> sur l'indicateur ${info_var.name} <i>(${this.ratio_to_use})</i> par rapport à l'espace d'étude <b>${name_study_zone}</b> et au maillage <b>${name_territorial_mesh}</b>.
Les données sont disponibles pour <b>${compl} unités territoriales</b> de l'espace d'étude, soit ${formatNumber(calcPopCompletudeSubset(app, [this.ratio_to_use]), 0)}% de la population de l'espace d'étude.
<br><br>
L’unité territoriale <b>${my_region_pretty_name}</b> a une valeur de <b>${formatNumber(this.ref_value, 1)} ${info_var.unit}</b> pour l’indicateur <i>${this.ratio_to_use}</i> (rang ${my_rank} de la distribution).
<b>${sup}</b> unités territoriales ont donc une valeur supérieure et <b>${inf}</b> unités territoriales ont une valeur inférieure au sein de l'espace d'étude <b>${name_study_zone}</b>.
<br><br>
La moyenne de l'espace d'étude <b>${name_study_zone}</b> s'élève à <b>${formatNumber(this.mean_value, 1)} ${info_var.unit}</b>. L'unité territoriale ${my_region_pretty_name} se situe donc <b>${formatNumber(Math.abs(this.ref_value > this.mean_value ? this.ref_value / this.mean_value : this.mean_value / this.ref_value), 1)}%</b> ${this.ref_value > this.mean_value ? 'au dessus' : 'en-dessous'} de la moyenne de l’espace d’étude (${formatNumber(this.mean_value, 1)} ${info_var.unit}).
`;
    const source = `<b>Indicateur 1</b> : ${info_var.source} (Date de téléchargement de la donnée : ${info_var.last_update})`;
    return { section_selection: help1.join(''), section_help: help2, section_source: source };
  }
}
