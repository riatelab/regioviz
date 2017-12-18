import debug from 'debug';
import { comp, math_round, math_abs, Rect, prepareTooltip2, getMean, svgPathToCoords, getElementsFromPoint, formatNumber } from './../helpers';
import { color_disabled, color_countries, color_sup, color_inf, color_highlight } from './../options';
import { calcPopCompletudeSubset, calcCompletudeSubset } from './../prepare_data';
import { app, resetColors, variables_info } from './../../main';
import TableResumeStat from './../tableResumeStat';
import CompletudeSection from './../completude';
import ContextMenu from './../contextMenu';

const log = debug('App:BarChart');
debug.enable('*');
let svg_bar = d3.select('svg#svg_bar');
let margin = { top: 10, right: 20, bottom: 100, left: 45 };
let margin2 = { top: 430, right: 20, bottom: 15, left: 45 };
let bbox_svg = svg_bar.node().getBoundingClientRect();
let width = +bbox_svg.width - margin.left - margin.right;
let height = +bbox_svg.height - margin.top - margin.bottom;
let height2 = +bbox_svg.height - margin2.top - margin2.bottom;
let svg_container;

let nbFt;
let current_range_brush = [0, 0];
let current_range = [0, 0];
let displayed;

function updateDimensions() {
  svg_bar = d3.select('svg#svg_bar');
  bbox_svg = svg_bar.node().getBoundingClientRect();
  margin = {
    top: 10,
    right: 20,
    bottom: (500 * app.ratioToWide) / 5,
    left: 45,
  };
  margin2 = {
    top: (500 * app.ratioToWide) * 0.86,
    right: 20,
    bottom: (500 * app.ratioToWide) / 40,
    left: 45,
  };
  width = (+bbox_svg.width || (500 * app.ratioToWide)) - margin.left - margin.right;
  height = 500 * app.ratioToWide - margin.top - margin.bottom;
  svg_bar.attrs({
    height: `${500 * app.ratioToWide}px`, width: `${+bbox_svg.width || (500 * app.ratioToWide)}px`,
  });
  height2 = 500 * app.ratioToWide - margin2.top - margin2.bottom;
  svg_container = svg_bar.append('g').attr('class', 'container');
}

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

let t;

export default class BarChart1 {
  constructor(ref_data) {
    this.brushed = () => {
      if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'zoom') return; // ignore brush-by-zoom
      if (!this.x) {
        log('a');
        return;
      }
      const s = d3.event.selection || this.x2.range();
      context_left_handle.attr('x', s[0] - 12);
      context_right_handle.attr('x', s[1] - 7);
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
      const ratio_to_use = this.ratio_to_use;
      const ref_value = this.ref_value;

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
        app.colors = {};
        this._focus.selectAll('.bar')
          .style('fill', (d, i) => {
            if (d.id === app.current_config.my_region) {
              app.colors[d.id] = color_highlight;
              return color_highlight;
            } else if (i > current_range_brush[0] && i < current_range_brush[1]) {
              const color = comp(d[ratio_to_use], ref_value, this.serie_inversed);
              app.colors[d.id] = color;
              return color;
            }
            return color_countries;
          });
        // this.update();
        if (this.reset_state_button === true) {
          d3.selectAll('#menu_selection > button').attr('class', 'button_blue');
        }
        this.updateMapRegio();
      } else {
        if (d3_event && !d3_event.selection
            && d3_event.sourceEvent && d3_event.sourceEvent.detail !== undefined) {
          this.map_elem.removeRectBrush();
          app.colors = {};
          app.colors[app.current_config.my_region] = color_highlight;
          this.updateMapRegio();
        }
        this._focus.selectAll('.bar')
          .style('fill', d => app.colors[d.id] || color_countries);
        if (this.reset_state_button === true) {
          d3.selectAll('#menu_selection > button').attr('class', 'button_blue');
        }
      }
    };
    updateDimensions();
    app.chartDrawRatio = app.ratioToWide;
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
    this.mean_value = getMean(this.data.map(d => d[ratio_to_use]));
    this.ref_value = this.data.filter(
      ft => ft.id === app.current_config.my_region)[0][ratio_to_use];
    svg_container.append('defs')
      .append('clipPath')
      .attr('id', 'clip')
      .append('rect')
      .attrs({ width, height });

    const focus = svg_container.append('g')
      .attrs({
        class: 'focus',
        transform: `translate(${margin.left}, ${margin.top})`,
      });

    const context = svg_container.append('g')
      .attrs({
        class: 'context',
        transform: `translate(${margin2.left}, ${margin2.top})`,
      });

    this._focus = focus;
    this.context = context;

    x.domain(this.current_ids);
    y.domain([
      0,
      d3.max(this.data, d => d[ratio_to_use]),
    ]);
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
        const content = ['Moyenne de l\'espace d\'étude'];
        let _h = 65;
        if (app.current_config.my_category) {
          content.push('<br>', ' (', app.current_config.my_category, ')');
          _h += 20;
        }
        self.tooltip.select('.title')
          .attr('class', 'title red')
          .html(content.join(''));
        self.tooltip.select('.content')
          .html(['Valeur : ', formatNumber(self.mean_value, 1), ' ', self.unit].join(''));
        self.tooltip
          .styles({
            display: null,
            left: `${d3.event.pageX - 5}px`,
            top: `${d3.event.pageY - _h}px`,
          });
      });

    this.updateMiniBars();

    const g_brush_bottom = context.append('g')
      .attr('class', 'brush_bottom')
      .call(brush_bottom);

    const context_left_handle = g_brush_bottom.insert('image', '.handle')
      .attrs({
        width: 20,
        height: height2,
        x: x2(this.current_ids[0]) - 12,
        'xlink:href': 'img/left-handle.png',
      });

    const context_right_handle = g_brush_bottom.insert('image', '.handle')
      .attrs({
        width: 20,
        height: height2,
        x: x2(this.current_ids[this.current_ids.length - 1]) - 7,
        'xlink:href': 'img/right-handle.png',
      });

    g_brush_top.call(brush_top.move, null);
    g_brush_bottom.call(brush_bottom.move, x.range());

    this.completude = new CompletudeSection();
    this.completude.update(
      calcCompletudeSubset(app, [this.ratio_to_use], 'array'),
      calcPopCompletudeSubset(app, [this.ratio_to_use]));

    svg_container.append('image')
      .attrs({
        x: width + margin.left + 5,
        y: 385,
        width: 15,
        height: 15,
        'xlink:href': 'img/reverse_plus.png',
        id: 'img_reverse',
      })
      .on('click', () => {
        // this.data = app.current_data.slice();
        if (!this.serie_inversed) {
          this.title_variable
            .classed('inversed', true)
            .attr('title-tooltip', `${this.title_variable.attr('title-tooltip')} (axe inversé)`);
          this.data.sort((a, b) => b[this.ratio_to_use] - a[this.ratio_to_use]);
        } else {
          this.title_variable
            .classed('inversed', false)
            .attr('title-tooltip',
              `${this.title_variable.attr('title-tooltip')}`.replace(' (axe inversé)', ''));
          this.data.sort((a, b) => a[this.ratio_to_use] - b[this.ratio_to_use]);
        }
        this.current_ids = this.data.map(d => d.id);
        this.serie_inversed = !this.serie_inversed;
        x.domain(this.data.slice(current_range[0], current_range[1]).map(ft => ft.id));
        x2.domain(this.data.map(ft => ft.id));
        // svg_container.select(".zoom").call(zoom.transform, d3.zoomIdentity
        //     .scale(width / (current_range[1] - current_range[0]))
        //     .translate(-current_range[0], 0));
        this.update();
        // this.updateMiniBars();
        this.updateContext(current_range[0], current_range[1]);
        svg_container.select('.brush_top').call(brush_top.move, null);
        this.map_elem.removeRectBrush();
        svg_container.select('.brush_bottom').call(brush_bottom.move, x.range());
      });

    // Prepare the tooltip displayed on mouseover:
    this.tooltip = prepareTooltip2(d3.select(svg_bar.node().parentElement), null);

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

    menu_selection.append('button')
      .attrs({ class: 'button_blue', id: 'btn_above_mean' })
      .text('inférieures à la moyenne')
      .on('click', function () {
        menu_selection.selectAll('button').attr('class', 'button_blue');
        this.classList.add('pressed');
        self.selectBelowMean();
      });

    menu_selection.append('button')
      .attrs({ class: 'button_blue', id: 'btn_above_my_region' })
      .text('inférieurs à ma région')
      .on('click', function () {
        menu_selection.selectAll('button').attr('class', 'button_blue');
        this.classList.add('pressed');
        self.selectBelowMyRegion();
      });

    menu_selection.append('button')
      .attrs({ class: 'button_blue', id: 'btn_below_mean' })
      .text('supérieures à la moyenne')
      .on('click', function () {
        menu_selection.selectAll('button').attr('class', 'button_blue');
        this.classList.add('pressed');
        self.selectAboveMean();
      });

    menu_selection.append('button')
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
      d3.selectAll('#menu_selection > button').attr('class', 'button_blue');
    }

    bar
      .attrs(d => ({
        x: this.x(d.id),
        y: this.y(d[ratio_to_use]),
        width: this.x.bandwidth(),
        height: height - this.y(d[ratio_to_use]),
      }))
      .style('fill', d => app.colors[d.id] || color_countries)
      .style('display', (d) => {
        const to_display = this.x(d.id) != null;
        if (to_display) {
          displayed += 1;
          return 'initial';
        }
        return 'none';
      });

    bar.enter()
      .insert('rect', '.mean')
      .attrs(d => ({
        class: 'bar',
        x: this.x(d.id),
        y: this.y(d[ratio_to_use]),
        width: this.x.bandwidth(),
        height: height - this.y(d[ratio_to_use]),
      }));

    bar.exit().remove();

    this._focus.select('.axis--y')
      .call(this.yAxis);

    const axis_x = this._focus.select('.axis--x')
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
      .style('text-anchor', () => (displayed > 20 ? 'end' : 'middle'));

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
        clearTimeout(t);
        self.tooltip.select('.title')
          .attr('class', 'title')
          .html([d.name, ' (', d.id, ')'].join(''));
        self.tooltip.select('.content')
          .html([
            self.ratio_to_use, ' : ', formatNumber(d[self.ratio_to_use], 1), ' ', self.unit, '<br>',
            'Rang : ', self.current_ids.indexOf(d.id) + 1, '/', self.current_ids.length,
          ].join(''));
        self.tooltip
          .styles({
            display: null,
            left: `${d3.event.pageX - 5}px`,
            top: `${d3.event.pageY - 85}px`,
          });
      });

    svg_container.select('.brush_top')
      .on('mousemove mousedown', () => {
        const elems = getElementsFromPoint(d3.event.pageX, d3.event.pageY);
        const elem = elems.find(e => e.className.baseVal === 'bar' || e.className.baseVal === 'transp_mean_line');
        if (elem) {
          const new_click_event = new MouseEvent('mousemove', {
            pageX: d3.event.pageX,
            pageY: d3.event.pageY,
            clientX: d3.event.clientX,
            clientY: d3.event.clientY,
            bubbles: true,
            cancelable: true,
            view: window,
          });
          elem.dispatchEvent(new_click_event);
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
    const ratio_to_use = this.ratio_to_use;
    const ref_value = this.ref_value;
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
    app.colors = {};
    self.map_elem.target_layer.selectAll('path')
      .attr('fill', function (d) {
        const id = d.id;
        if (id === app.current_config.my_region) {
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
            const value = d.properties[ratio_to_use];
            const color = comp(value, ref_value, this.serie_inversed);
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
      const color = comp(
        d.properties[this.ratio_to_use],
        this.ref_value,
        this.serie_inversed);
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
    this.mean_value = getMean(this.data.map(d => d[ratio_to_use]));
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
    this.update();
    this.updateContext(0, this.data.length);

    svg_bar.select('.brush_bottom').call(this.brush_bottom.move, this.x2.range());
    this.map_elem.removeRectBrush();
    app.colors = {};
    app.colors[app.current_config.my_region] = color_highlight;
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
    const values = this.data.map(d => d[this.ratio_to_use]);
    return {
      Min: d3.min(values),
      Max: d3.max(values),
      Moy: getMean(values),
      Med: d3.median(values),
      id: this.ratio_to_use,
      Variable: this.ratio_to_use,
      'Ma région': this.ref_value,
    };
  }

  makeTableStat() {
    const feature = this.prepareTableStat();
    this.table_stats = new TableResumeStat([feature]);
  }

  getHelpMessage() {
    return `
<h3>Position – 1 Indicateur</h3>

<b>Aide générale</b>
Ce graphique représente l’indicateur sélectionné ordonné de la valeur minimale à la valeur maximale (barres bleues) pour l’espace d’étude et le maillage territorial d’analyse sélectionné. La valeur de l’unité territoriale sélectionnée apparaît en surbrillance (jaune). La ligne représentée par un tireté rouge représente la moyenne de l’espace d’étude (non pondérée).

Sur ce graphique, il est possible d’inverser l’ordre de classement de l’indicateur (appuyer sur le « + »).

La carte et le graphique sont interactifs dans la mesure où l’utilisateur peut choisir de sélectionner des unités territoriales (clic gauche appuyé de la souris) et visualiser leur positionnement simultanément sur la carte (localisation géographique) ou sur le diagramme de distribution (positionnement statistique). Il peut aussi en un clic choisir de visualiser les unités territoriales ayant des valeurs inférieures/supérieures à la moyenne de l’espace d’étude ou inférieures/supérieures à la valeur de l’unité territoriale de référence (« ma région »).`;
  }
}
