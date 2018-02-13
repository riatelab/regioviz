import {
  comp, math_round, math_abs, math_sqrt, math_pow, math_max, PropSizer, getMean2, getStdDev, _isNaN,
  formatNumber, svgContextMenu, getElementsFromPoint, isContextMenuDisplayed, Rect, svgPathToCoords } from './../helpers';
import { color_disabled, color_countries, color_default_dissim,
  color_highlight, fixed_dimension, color_q1, color_q2, color_q3, color_q4 } from './../options';
import { calcPopCompletudeSubset, calcCompletudeSubset } from './../prepare_data';
import { app, resetColors, variables_info } from './../../main';
import TableResumeStat from './../tableResumeStat';
import CompletudeSection from './../completude';
import { prepareTooltip, Tooltipsify } from './../tooltip';

let svg_bar;
let margin;
let width;
let height;
let svg_container;
let t;

const updateDimensions = () => {
  svg_bar = d3.select('svg#svg_bar')
    .attr('viewBox', `0 0 ${fixed_dimension.chart.width} ${fixed_dimension.chart.height}`)
    .on('contextmenu', () => { svgContextMenu(app.chart, svg_bar, app.map); })
    .on('wheel', () => { d3.event.preventDefault(); });
  margin = { top: 20, right: 20, bottom: 40, left: 50 };
  width = fixed_dimension.chart.width - margin.left - margin.right;
  height = fixed_dimension.chart.height - margin.top - margin.bottom;
  const width_value = document.getElementById('bar_section').getBoundingClientRect().width * 0.98;
  d3.select('.cont_svg.cchart').style('padding-top', `${(fixed_dimension.chart.height / fixed_dimension.chart.width) * width_value}px`);
  svg_container = svg_bar.append('g').attr('class', 'container');
};

export default class Similarity1plus {
  constructor(ref_data) {
    updateDimensions();
    this.handle_brush_map = this._handle_brush_map;
    // Set the minimum number of variables to keep selected for this kind of chart:
    app.current_config.nb_var = 1;
    this.ratios = app.current_config.ratio;
    this.nums = app.current_config.num;
    this.data = ref_data.filter(ft => this.ratios.map(v => !!ft[v]).every(v => v === true)).slice();
    this.prepareData();
    this.type = 'global';
    resetColors();
    this.highlight_selection = [];
    this.highlighted = [];
    this.serie_inversed = false;
    this.proportionnal_symbols = false;
    this.draw_group = svg_container
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Prepare the tooltip displayed on mouseover:
    this.tooltip = prepareTooltip(d3.select(svg_bar.node().parentNode), null);

    this.completude = new CompletudeSection();
    this.completude.update(
      calcCompletudeSubset(app, this.ratios, 'array'),
      calcPopCompletudeSubset(app, this.ratios));

    // Brush behavior (only used for beeswarm):
    this.brush = d3.brushX()
      .extent([[0, 0], [width, height]])
      .on('brush end', () => this.brushed());

    // To decide wether to inverse the positive/negative color for an axis
    this.inversedAxis = new Set();

    // Create the section containing the input element allowing to chose
    // how many "close" regions we want to highlight.
    const menu_selection = d3.select('#bar_section')
      .append('div')
      .attr('id', 'menu_selection')
      .styles({ position: 'relative', color: '#4f81bd', 'text-align': 'center' });

    const chart_type = menu_selection.append('p');

    chart_type.append('span')
      .attrs({
        id: 'ind_dist_global',
        class: 'choice_ind active noselect',
      })
      .text('Ressemblance globale');

    chart_type.append('span')
      .attrs({
        id: 'ind_dist_detailled',
        class: 'choice_ind noselect',
      })
      .text('Par indicateur');

    const selection_close = menu_selection.append('p')
      .attr('class', 'selection_display')
      .style('display', 'none');
    selection_close.append('span')
      .html('Sélection de la');
    selection_close.append('input')
      .attrs({ class: 'nb_select', type: 'number' })
      .styles({ color: '#4f81bd', 'margin-left': '1px' })
      .property('value', 1);
    selection_close.append('span')
      .html('<sup>ème</sup> région la plus proche');

    const section = menu_selection.append('div')
      .append('section')
      .attr('class', 'slider-checkbox');
    section.append('input')
      .attrs({ type: 'checkbox', id: 'check_prop' });
    section.append('label')
      .attrs({ class: 'label not_selected noselect', for: 'check_prop' })
      .text('Cercles proportionnels à la population');

    this.bindMenu();
    this.makeTableStat();
  }

  brushed() {
    const e = d3.event;
    if (!e.selection && e.type === 'end' && !this.last_selection && !e.sourceEvent.sourceEvent) {
      this.map_elem.removeRectBrush();
      const elems = getElementsFromPoint(e.sourceEvent.clientX, e.sourceEvent.clientY);
      const elem = elems.find(el => el.className.baseVal === 'polygon' || el.className.baseVal === 'circle');
      if (elem) {
        const new_click_event = new MouseEvent('click', {
          pageX: e.sourceEvent.pageX,
          pageY: e.sourceEvent.pageY,
          clientX: e.sourceEvent.clientX,
          clientY: e.sourceEvent.clientY,
          bubbles: true,
          cancelable: true,
          view: window,
        });
        elem.dispatchEvent(new_click_event);
      }
    } else if (e.sourceEvent.sourceEvent) {
      this.draw_group.selectAll('.circle')
        .style('fill', d => app.colors[d.data.id]);
      this.map_elem.target_layer.selectAll('path')
        .attr('fill', (d) => {
          const _id = d.id;
          if (_id === app.current_config.my_region) {
            return color_highlight;
          } else if (this.current_ids.indexOf(_id) > -1) {
            if (app.colors[_id]) return app.colors[_id];
            return color_countries;
          }
          return color_disabled;
        });
      this.last_selection = null;
    } else {
      this.map_elem.removeRectBrush();
      this.map_elem.layers.selectAll('.cloned').remove();
      if (!e.selection || e.selection.length < 2) { return; }
      const selection = [e.selection[0] - 1, e.selection[1] + 1.5];
      this.highlighted = [];
      this.draw_group.selectAll('.circle')
        .style('fill', (d) => {
          if (d.data.id === app.current_config.my_region) {
            return color_highlight;
          } else if (d.data.x >= selection[0] && d.data.x <= selection[1]) {
            this.highlighted.push(d.data.id);
            return 'purple';
          }
          return app.colors[d.data.id];
        });

      this.map_elem.target_layer.selectAll('path')
        .attr('fill', (d) => {
          const _id = d.id;
          if (_id === app.current_config.my_region) {
            return color_highlight;
          } else if (this.highlighted.indexOf(_id) > -1) {
            return 'purple';
          } else if (this.current_ids.indexOf(_id) > -1) {
            if (app.colors[_id]) return app.colors[_id];
            return color_countries;
          }
          return color_disabled;
        });
      this.last_selection = selection;
    }
  }

  applySelection(nb) {
    app.colors = {};
    if (nb > 0) {
      this.data.forEach((ft) => {
        // eslint-disable-next-line no-param-reassign
        ft.dist = math_sqrt(this.ratios.map(v => `dist_${v}`)
          .map(v => math_pow(ft[v], 2)).reduce((a, b) => a + b));
      });
      this.data.sort((a, b) => a.dist - b.dist);
      this.data.forEach((el, i) => { el.globalrank = i; }); // eslint-disable-line no-param-reassign
      this.highlight_selection = this.data.slice(1, nb + 1);
    } else {
      this.highlight_selection = [];
    }
    this.removeLines();
    this.update();
    this.updateMapRegio();
  }

  /* eslint-disable no-loop-func */
  update() {
    const self = this;
    const data = self.data;
    this.draw_group.select('.brush').remove();
    this.draw_group.select('#axis-title-global-dist').remove();
    this.draw_group.selectAll('.overlayrect').remove();
    if (self.type === 'detailled') {
      const highlight_selection = self.highlight_selection;
      const nb_variables = self.ratios.length;
      const offset = height / nb_variables + 1;
      let height_to_use = offset / 2;
      const trans = d3.transition().duration(125);
      for (let i = 0; i < nb_variables; i++) {
        const ratio_name = self.ratios[i];
        const selector_ratio_name = `l_${ratio_name}`;
        const ratio_pretty_name = app.current_config.ratio_pretty_name[i];
        // const num_name = self.nums[i];
        const num_name = app.current_config.pop_field;
        const my_region_value = self.my_region[ratio_name];
        let g = this.draw_group.select(`#${selector_ratio_name}`);
        let axis = this.draw_group.select(`g.axis--x.${selector_ratio_name}`);
        let layer_other;
        let layer_highlighted;
        let layer_top;
        if (!g.node()) {
          g = this.draw_group
            .append('g')
            .attrs({
              id: selector_ratio_name,
              num: num_name,
              class: 'grp_var',
            });
          axis = g.append('g')
            .attrs({
              class: `axis axis--x ${selector_ratio_name}`,
              transform: 'translate(0, 10)',
            });

          g.append('text')
            .attrs({
              // x: 0,
              x: 20,
              y: -7.5,
              class: `title_axis ${selector_ratio_name} noselect`,
              fill: '#4f81bd',
              'font-size': '14px',
              'font-weight': 'bold',
              'font-family': '"Signika",sans-serif',
              'title-tooltip': ratio_pretty_name,
            })
            .text(ratio_name);

          g.append('image')
            .attrs({
              x: 0,
              y: -18,
              width: 14,
              height: 14,
              'xlink:href': 'img/reverse_plus.png',
              id: 'img_reverse',
            })
            .style('cursor', 'pointer')
            .on('click', function () {
              if (self.inversedAxis.has(ratio_name)) {
                this.setAttributeNS(d3.namespaces.xlink, 'xlink:href', 'img/reverse_plus.png');
                const title_ax = this.previousSibling;
                title_ax.setAttribute('title-tooltip', ratio_pretty_name);
                title_ax.setAttribute('fill', '#4f81bd');
                self.inversedAxis.delete(ratio_name);
              } else {
                this.setAttributeNS(d3.namespaces.xlink, 'xlink:href', 'img/reverse_moins.png');
                self.inversedAxis.add(ratio_name);
                const title_ax = this.previousSibling;
                title_ax.setAttribute('title-tooltip', `${ratio_pretty_name} (axe inversé)`);
                title_ax.setAttribute('fill', 'red');
              }
              self.update();
            });

          g.append('image')
            .attrs({
              // x: txt.node().getBoundingClientRect().width + 22.5,
              x: -19,
              y: -6,
              width: 12,
              height: 15,
              'xlink:href': 'img/Up-Arrow.svg',
              id: 'up_arrow',
              title: 'Changer l\'ordre des axes (vers le haut)',
            })
            .style('cursor', 'pointer')
            .on('mousedown', function () {
              this.classList.add('arrow-shadow');
            })
            .on('mouseup mouseout', function () {
              this.classList.remove('arrow-shadow');
            })
            .on('click', function () {
              const that_ratio = this.parentNode.id.slice(2);
              const current_position = self.ratios.indexOf(that_ratio);
              if (current_position === 0) { return; }
              self.ratios.splice(current_position, 1);
              self.ratios.splice(current_position - 1, 0, that_ratio);
              self.removeLines();
              self.update();
            });

          g.append('image')
            .attrs({
              // x: txt.node().getBoundingClientRect().width + 22.5,
              x: -19,
              y: 13,
              width: 12,
              height: 15,
              'xlink:href': 'img/Down-Arrow.svg',
              id: 'down_arrow',
              title: 'Changer l\'ordre des axes (vers le bas)',
            })
            .style('cursor', 'pointer')
            .on('mousedown', function () {
              this.classList.add('arrow-shadow');
            })
            .on('mouseup mouseout', function () {
              this.classList.remove('arrow-shadow');
            })
            .on('click', function () {
              const that_ratio = this.parentNode.id.slice(2);
              const current_position = self.ratios.indexOf(that_ratio);
              if (current_position === self.ratios.length) { return; }
              self.ratios.splice(current_position, 1);
              self.ratios.splice(current_position + 1, 0, that_ratio);
              self.removeLines();
              self.update();
            });

          layer_other = g.append('g').attr('class', 'otherfeature');
          layer_highlighted = g.append('g').attr('class', 'highlighted');
          layer_top = g.append('g').attr('class', 'top');
        } else {
          layer_other = g.select('g.otherfeature');
          layer_highlighted = g.select('g.highlighted');
          layer_top = g.select('g.top');
        }
        // g.attr('transform', `translate(0, ${height_to_use})`);
        // const _trans = this.draw_group.select(`#${selector_ratio_name}`)
        //   .transition()
        //   .duration(125);
        g = this.draw_group.select(`#${selector_ratio_name}`)
          .transition(trans)
          .attr('transform', `translate(0, ${height_to_use})`);
        g.select('#up_arrow')
          // .transition(_trans)
          .style('display', i === 0 ? 'none' : '');
        g.select('#down_arrow')
          // .transition(_trans)
          .style('display', i === nb_variables - 1 ? 'none' : '');
        let _min;
        let _max;
        this.data.sort((a, b) => b[`dist_${ratio_name}`] - a[`dist_${ratio_name}`]);
        this.data.forEach((ft, _ix) => {
          ft[`rank_${ratio_name}`] = _ix; // eslint-disable-line no-param-reassign
        });
        this.data.splice(this.data.indexOf(this.my_region), 1);
        this.data.push(this.my_region);
        if (highlight_selection.length > 0) {
          const dist_axis = math_max(
            math_abs(my_region_value - +d3.min(highlight_selection, d => d[ratio_name])),
            math_abs(+d3.max(highlight_selection, d => d[ratio_name]) - my_region_value));
          const margin_min_max = math_round(dist_axis) / 8;
          _min = my_region_value - dist_axis - margin_min_max;
          _max = my_region_value + dist_axis + margin_min_max;
          if (_min === _max) {
            const _dist_axis = ((
              my_region_value + this.data[this.data.length - 2][ratio_name])
              - (my_region_value - this.data[this.data.length - 2][ratio_name])) / 2;
            _min = my_region_value - _dist_axis - _dist_axis / 8;
            _max = my_region_value + _dist_axis + _dist_axis / 8;
          }
        } else {
          const ratio_values = this.data.map(d => d[ratio_name]);
          const dist_axis = math_max(
            math_abs(my_region_value - d3.min(ratio_values)),
            math_abs(d3.max(ratio_values) - my_region_value));
          const margin_min_max = math_round(dist_axis) / 8;
          _min = my_region_value - dist_axis - margin_min_max;
          _max = my_region_value + dist_axis + margin_min_max;
        }
        this.highlight_selection.forEach((elem) => {
          app.colors[elem.id] = comp(
            elem[ratio_name], my_region_value, !self.inversedAxis.has(ratio_name));
        });

        app.colors[app.current_config.my_region] = color_highlight;

        const size_func = this.proportionnal_symbols
          ? new PropSizer(d3.max(data, d => d[num_name]), 30).scale
          : () => 7.5;
        const xScale = d3.scaleLinear()
          .domain([_min, _max])
          .range([0, width]);

        axis
          .transition(trans)
          .call(d3.axisBottom(xScale).tickFormat(formatNumber));

        const bubbles1 = layer_other.selectAll('.bubble')
          .data(data.filter(d => app.colors[d.id] === undefined), d => d.id);

        bubbles1
          .transition(trans)
          .attrs((d) => {
            let x_value = xScale(d[ratio_name]);
            if (x_value > width) x_value = width + 200;
            else if (x_value < 0) x_value = -200;
            return {
              globalrank: d.globalrank,
              cx: x_value,
              cy: 10,
              r: size_func(d[num_name]),
            };
          })
          .styles({
            fill: color_countries,
            'fill-opacity': 0.1,
            stroke: 'darkgray',
            'stroke-width': 0.75,
            'stroke-opacity': 0.75,
          });

        bubbles1
          .enter()
          .insert('circle')
          .styles({
            fill: color_countries,
            'fill-opacity': 0.1,
            stroke: 'darkgray',
            'stroke-width': 0.75,
            'stroke-opacity': 0.75,
          })
          .transition(trans)
          .attrs((d) => {
            let x_value = xScale(d[ratio_name]);
            if (x_value > width) x_value = width + 200;
            else if (x_value < 0) x_value = -200;
            return {
              globalrank: d.globalrank,
              id: d.id,
              class: 'bubble',
              cx: x_value,
              cy: 10,
              r: size_func(d[num_name]),
            };
          });

        bubbles1.exit().transition(trans).remove();

        const bubbles2 = layer_highlighted.selectAll('.bubble').data(data.filter(
          d => d.id !== app.current_config.my_region && app.colors[d.id] !== undefined), d => d.id);

        bubbles2
          .transition(trans)
          .attrs((d) => {
            let x_value = xScale(d[ratio_name]);
            if (x_value > width) x_value = width + 200;
            else if (x_value < 0) x_value = -200;
            return {
              globalrank: d.globalrank,
              cx: x_value,
              cy: 10,
              r: size_func(d[num_name]),
            };
          })
          .styles(d => ({
            fill: app.colors[d.id],
            'fill-opacity': d.globalrank === self.highlight_selection.length ? 0.85 : 0.5,
            stroke: d.globalrank === self.highlight_selection.length ? 'black' : 'darkgray',
            'stroke-width': d.globalrank === self.highlight_selection.length ? 0.9 : 0.75,
            'stroke-opacity': d.globalrank === self.highlight_selection.length ? 0.95 : 0.75,
          }));

        bubbles2
          .enter()
          .insert('circle')
          .styles(d => ({
            fill: app.colors[d.id],
            'fill-opacity': d.globalrank === self.highlight_selection.length ? 0.85 : 0.5,
            stroke: d.globalrank === self.highlight_selection.length ? 'black' : 'darkgray',
            'stroke-width': d.globalrank === self.highlight_selection.length ? 0.9 : 0.75,
            'stroke-opacity': d.globalrank === self.highlight_selection.length ? 0.95 : 0.75,
          }))
          .transition(trans)
          .attrs((d) => {
            let x_value = xScale(d[ratio_name]);
            if (x_value > width) x_value = width + 200;
            else if (x_value < 0) x_value = -200;
            return {
              globalrank: d.globalrank,
              id: d.id,
              class: 'bubble',
              cx: x_value,
              cy: 10,
              r: size_func(d[num_name]),
            };
          });

        bubbles2.exit().transition(trans).remove();

        const bubbles3 = layer_top.selectAll('.bubbleMyRegion')
          .data(data.filter(d => d.id === app.current_config.my_region), d => d.id);

        bubbles3
          .transition(trans)
          .attrs((d) => {
            let x_value = xScale(d[ratio_name]);
            if (x_value > width) x_value = width + 200;
            else if (x_value < 0) x_value = -200;
            return {
              globalrank: d.globalrank,
              cx: x_value,
              cy: 10,
              r: size_func(d[num_name]),
            };
          })
          .styles(d => ({
            fill: app.colors[d.id],
            'fill-opacity': 1,
            stroke: 'darkgray',
            'stroke-width': 0.75,
            'stroke-opacity': 0.75,
          }));

        bubbles3
          .enter()
          .insert('circle')
          .styles(d => ({
            fill: app.colors[d.id],
            'fill-opacity': 1,
            stroke: 'darkgray',
            'stroke-width': 0.75,
            'stroke-opacity': 0.75,
          }))
          .transition(trans)
          .attrs((d) => {
            let x_value = xScale(d[ratio_name]);
            if (x_value > width) x_value = width + 200;
            else if (x_value < 0) x_value = -200;
            return {
              globalrank: d.globalrank,
              id: d.id,
              class: 'bubbleMyRegion',
              cx: x_value,
              cy: 10,
              r: size_func(d[num_name]),
            };
          });

        bubbles3.exit().transition(trans).remove();
        height_to_use += offset;
        // setTimeout(() => {
        //   bubbles1.order();
        //   bubbles2.order();
        // }, 225);
      }
      setTimeout(() => { this.makeTooltips(); }, 200);
    } else if (self.type === 'global') {
      data.sort((a, b) => a.dist - b.dist);
      const values = data.map(ft => ft.dist);
      const _values = values.slice().splice(2);
      const num_name = app.current_config.pop_field;
      self.makeClassifColors(_values);
      const size_func = self.proportionnal_symbols
        ? new PropSizer(d3.max(data, d => +d[num_name]), 30).scale
        : () => 4.5;
      const collide_margin = self.proportionnal_symbols ? 1.5 : 1;
      this.x = d3.scaleLinear().rangeRound([0, width]);
      const xAxis = d3.axisBottom(this.x).ticks(10, '');
      this.x.domain(d3.extent(values));

      const simulation = d3.forceSimulation(data)
        .force('x', d3.forceX(d => this.x(d.dist)).strength(9))
        .force('y', d3.forceY(height / 2).strength(d => (d.id === app.current_config.my_region ? 1 : 0.06)))
        .force('collide', d3.forceCollide(d => size_func(+d[num_name]) + collide_margin))
        .stop();

      for (let i = 0; i < 125; ++i) {
        simulation.tick();
      }

      const voro = d3.voronoi()
        .extent([
          [-margin.left, -margin.top * 2],
          [width + margin.right, height + margin.top * 2]])
        .x(d => d.x)
        .y(d => d.y)
        .polygons(data);
      this.draw_group.append('text')
        .attrs({
          x: width / 2,
          y: height + 40,
          id: 'axis-title-global-dist',
        })
        .styles({
          'text-anchor': 'middle',
          'font-size': '14px',
          'font-family': '"Signika",sans-serif',
        })
        .text('Indice de similarité');

      let g = this.draw_group.select('#global_dist');
      if (!g.node()) {
        g = this.draw_group
          .append('g')
          .attrs({
            id: 'global_dist',
            class: 'global_dist',
          });

        g.append('g')
          .attrs({
            class: 'axis-top-v axis--x',
            transform: `translate(0,${height})`,
          })
          .call(xAxis);

        const cell = g.append('g')
          .attr('class', 'cells')
          .selectAll('g.cell')
          .data(voro, d => d.data.id)
          .enter()
          .append('g')
          .attrs(d => ({
            class: 'cell',
            id: `c_${d.data.id}`,
          }));
        cell.append('circle')
          .attrs(d => ({
            class: 'circle',
            r: size_func(+d.data[num_name]),
            cx: d.data.x,
            cy: d.data.y,
          }))
          .styles(d => ({
            fill: app.colors[d.data.id] || 'black',
            'stroke-width': 0.45,
            stroke: 'darkgray',
          }));

        cell.append('path')
          .attr('class', 'polygon')
          .attr('d', d => `M${d.join('L')}Z`)
          .style('fill', 'none');
      } else {
        g.selectAll('.axis-top-v')
          .transition()
          .duration(125)
          .call(xAxis);

        const cells = g.select('.cells')
          .selectAll('g.cell')
          .data(voro, d => d.data.id);

        cells.select('.circle')
          // .data(voro, d => d.data.id)
          .transition()
          .duration(125)
          .attrs(d => ({
            class: 'circle',
            r: size_func(+d.data[num_name]),
            cx: d.data.x,
            cy: d.data.y,
          }))
          .styles(d => ({
            fill: app.colors[d.data.id] || 'black',
            'stroke-width': 0.45,
            stroke: 'darkgray',
          }));

        cells.select('.polygon')
          .transition()
          .duration(125)
          // .data(voro, d => d.data.id)
          .attr('d', d => `M${d.join('L')}Z`)
          .style('fill', 'none');

        const a = cells.enter()
          .insert('g')
          .attrs(d => ({
            class: 'cell',
            id: `c_${d.data.id}`,
          }));

        a.append('circle')
          .attrs(d => ({
            class: 'circle',
            r: size_func(+d.data[num_name]),
            cx: d.data.x,
            cy: d.data.y,
          }))
          .styles(d => ({
            fill: app.colors[d.data.id] || 'black',
            'stroke-width': 0.45,
            stroke: 'darkgray',
          }));

        a.append('path')
          .attrs(d => ({
            class: 'polygon',
            d: `M${d.join('L')}Z`,
          }))
          .style('fill', 'none');

        cells.exit().remove();
      }
      setTimeout(() => {
        self.makeTooltips();
        self.appendOverlayRect();
      }, 200);
    }
  }
  /* eslint-enable no-loop-func */

  updateCompletude() {
    this.completude.update(
      calcCompletudeSubset(app, this.ratios, 'array'),
      calcPopCompletudeSubset(app, this.ratios));
  }

  updateMapRegio() {
    if (!this.map_elem) return;
    this.map_elem.target_layer.selectAll('path')
      .attr('fill', (d) => {
        const _id = d.id;
        if (_id === app.current_config.my_region) {
          return color_highlight;
        } else if (this.current_ids.indexOf(_id) > -1) {
          if (app.colors[_id] && this.type === 'detailled') return color_default_dissim;
          else if (app.colors[_id] && this.type === 'global') return app.colors[_id];
          return color_countries;
        }
        return color_disabled;
      });
  }

  makeClassifColors(_values) {
    const q1 = d3.quantile(_values, 0.25);
    const q2 = d3.quantile(_values, 0.5);
    const q3 = d3.quantile(_values, 0.75);
    app.colors = {};
    this.data.forEach((ft, i) => {
      if (ft.id === app.current_config.my_region) {
        app.colors[app.current_config.my_region] = color_highlight;
      } else if (i === 1) {
        app.colors[ft.id] = color_default_dissim;
      } else if (ft.dist < q1) {
        app.colors[ft.id] = color_q1;
      } else if (ft.dist < q2) {
        app.colors[ft.id] = color_q2;
      } else if (ft.dist < q3) {
        app.colors[ft.id] = color_q3;
      } else {
        app.colors[ft.id] = color_q4;
      }
    });
  }

  handleClickMap(d, parent) {
    if (this.type === 'detailled') {
      let to_display = false;
      const id = d.id;
      if (this.current_ids.indexOf(id) < 0 || id === app.current_config.my_region) return;
      if (app.colors[id] !== undefined) {
        // Remove the clicked feature from the colored selection on the chart:
        const id_to_remove = this.highlight_selection
          .map((ft, i) => (ft.id === id ? i : null)).filter(ft => ft)[0];
        this.highlight_selection.splice(id_to_remove, 1);
        // Change its color in the global colors object:
        app.colors[id] = undefined;
        // Change the color on the map:
        d3.select(parent).attr('fill', color_countries);
      } else {
        app.colors[id] = color_default_dissim;
        // Change the color on the map:
        d3.select(parent).attr('fill', color_default_dissim);
        // Add the clicked feature on the colored selection on the chart:
        const obj = this.data.find(el => el.id === id);
        this.highlight_selection.push(obj);
        to_display = true;
      }
      this.highlight_selection.sort((a, b) => a.dist - b.dist);
      this.removeLines();
      this.update();
      if (to_display) setTimeout(() => { this.displayLine(id); }, 150);
    } else if (this.type === 'global') {
      const id = d.id;
      if (this.current_ids.indexOf(id) < 0 || id === app.current_config.my_region) return;
      if (this.highlighted.indexOf(id) > -1) {
        this.highlighted.splice(this.highlighted.indexOf(id), 1);
        d3.select(parent).attr('fill', _d => app.colors[_d.id]);
        this.draw_group.select(`#c_${id}.cell > circle`)
          .style('fill', _d => app.colors[_d.data.id]);
      } else {
        this.highlighted.push(id);
        d3.select(parent).attr('fill', 'purple');
        this.draw_group.select(`#c_${id}.cell > circle`)
          .style('fill', 'purple');
      }
    }
  }

  makeTooltips() {
    const self = this;
    // Tooltip used for the title of each axis:
    Tooltipsify('[title-tooltip]');
    // Tooltips for bubble on detailled distance:
    this.draw_group.selectAll('g.grp_var')
      .selectAll('circle')
      .on('mouseover', () => {
        clearTimeout(t);
        this.tooltip.style('display', null);
      })
      .on('mouseout', () => {
        clearTimeout(t);
        t = setTimeout(() => { this.tooltip.style('display', 'none').selectAll('p').html(''); }, 250);
      })
      .on('mousemove mousedown', function (d) {
        if (isContextMenuDisplayed()) return;
        clearTimeout(t);
        const content = [];
        let _h = 75;
        const ratio_n = this.parentNode.parentNode.id.replace('l_', '');
        const unit_ratio = variables_info.find(ft => ft.id === ratio_n).unit;
        const globalrank = +this.getAttribute('globalrank');
        const indic_rank = self.current_ids.length - +d[`rank_${ratio_n}`];
        content.push(`${ratio_n} : ${formatNumber(d[ratio_n], 1)} ${unit_ratio}`);
        if (self.proportionnal_symbols) {
          _h += 25;
          const num_n = this.parentNode.parentNode.getAttribute('num');
          const o = variables_info.find(ft => ft.id === num_n);
          const unit_num = o.unit;
          let coef = +o.formula;
          coef = _isNaN(coef) || coef === 0 ? 1 : coef;
          content.push(`${num_n} (numérateur) : ${formatNumber(d[num_n] * coef, 1)} ${unit_num}`);
        }
        if (+globalrank > 0) { // No need to display that part if this is "my region":
          _h += 30;
          // content.push(
          //   `Écart absolu normalisé : ${formatNumber(
          //     math_abs(100 *
          //       (d[ratio_n] - self.my_region[ratio_n]) / self.my_region[ratio_n]), 1)} %`);
          if (+indic_rank === 2) {
            content.push('<br><b>Région la plus proche</b> sur cet indicateur');
          } else {
            content.push(`<br><b>${indic_rank - 1}ème</b> région la plus proche sur cet indicateur`);
          }
        }
        if (!_isNaN(globalrank)) {
          _h += 30;
          if (+globalrank === 0) {
            content.push('<br><b>Ma région</b>');
          } else if (+globalrank === 1) {
            content.push(`<b>Région la plus proche</b> sur ces <b>${self.ratios.length}</b> indicateurs`);
          } else {
            content.push(`<b>${globalrank}ème</b> région la plus proche sur ces <b>${self.ratios.length}</b> indicateurs`);
          }
        }
        self.tooltip.select('.title')
          .attr('class', d.id === app.current_config.my_region ? 'title myRegion' : 'title')
          .html([d.name, ' (', d.id, ')'].join(''));
        self.tooltip.select('.content')
          .html(content.join('<br>'));
        self.tooltip
          .styles({
            display: null,
            left: `${d3.event.pageX - window.scrollX - 5}px`,
            top: `${d3.event.pageY - window.scrollY - _h}px`,
          });
      })
      .on('click', function (d) {
        if (this.style.fill !== color_countries) {
          self.displayLine(d.id);
        }
        self.map_elem.target_layer
          .selectAll('path')
          .each(function (ft) {
            if (ft.id === d.id) {
              const cloned = this.cloneNode();
              cloned.style.fill = 'red';
              cloned.style.stroke = 'orange';
              cloned.style.strokeWidth = '1.25px';
              cloned.classList.add('cloned');
              self.map_elem.layers.select('#temp').node().appendChild(cloned);
              setTimeout(() => { cloned.remove(); }, 10000);
            }
          });
      });

    if (this.type === 'detailled') return;

    this.draw_group.selectAll('g.cell')
      .selectAll('.polygon')
      .on('mouseover.tooltip', function () {
        self.draw_group.selectAll('circle')
          .styles({ stroke: 'darkgray', 'stroke-width': '0.45' });
        const circle = this.previousSibling;
        circle.style.stroke = 'black';
        circle.style.strokeWidth = '2';
        clearTimeout(t);
        self.tooltip.style('display', null);
      })
      .on('mouseout.tooltip', function () {
        const circle = this.previousSibling;
        circle.style.stroke = 'darkgray';
        circle.style.strokeWidth = '0.45';
        clearTimeout(t);
        t = setTimeout(() => {
          self.tooltip.style('display', 'none').selectAll('p').html('');
          circle.style.stroke = 'darkgray';
          circle.style.strokeWidth = '0.45';
        }, 250);
      })
      .on('mousemove.tooltip', function (d) {
        if (isContextMenuDisplayed()) return;
        clearTimeout(t);
        self.draw_group.selectAll('circle')
          .styles({ stroke: 'darkgray', 'stroke-width': '0.45' });
        const circle = this.previousSibling;
        circle.style.stroke = 'black';
        circle.style.strokeWidth = '2';
        const content = [];
        const globalrank = d.data.globalrank;
        if (!_isNaN(globalrank)) {
          if (+globalrank === 0) {
            content.push('<b>Ma région</b>');
          } else if (+globalrank === 1) {
            content.push(`Indice de similarité : ${formatNumber(d.data.dist, 2)}`);
            content.push(`<b>Région la plus proche</b> sur ces <b>${self.ratios.length}</b> indicateurs`);
          } else {
            content.push(`Indice de similarité : ${formatNumber(d.data.dist, 2)}`);
            content.push(`<b>${globalrank}ème</b> région la plus proche sur ces <b>${self.ratios.length}</b> indicateurs`);
          }
        }
        self.tooltip.select('.title')
          .attr('class', d.data.id === app.current_config.my_region ? 'title myRegion' : 'title')
          .html(`${d.data.name} (${d.data.id})`);
        self.tooltip.select('.content')
          .html(content.join('<br>'));
        self.tooltip
          .styles({
            display: null,
            left: `${d3.event.pageX - window.scrollX - 5}px`,
            top: `${d3.event.pageY - window.scrollY - 75}px`,
          });
      })
      .on('click', function (d) {
        const id = d.data.id;
        const circle = this.parentNode.querySelector('circle');
        if (self.highlighted.indexOf(id) > -1) {
          self.highlighted.splice(self.highlighted.indexOf(id), 1);
          self.map_elem.target_layer
            .selectAll('path')
            .each(function (ft) {
              if (ft.id === id) {
                circle.style.fill = app.colors[id];
                this.setAttribute('fill', app.colors[id]);
              }
            });
        } else {
          self.highlighted.push(id);
          self.map_elem.target_layer
            .selectAll('path')
            .each(function (ft) {
              if (ft.id === id) {
                circle.style.fill = 'purple';
                // circle.style.stroke = 'black';
                // circle.style.strokeWidth = '2';
                this.setAttribute('fill', 'purple');
              }
            });
        }
      });

    this.draw_group.append('g')
      .attr('class', 'brush')
      .call(this.brush)
      .on('dblclick', () => {
        self.highlighted = [];
        self.draw_group.selectAll('.circle')
          .style('fill', d => app.colors[d.data.id]);
        self.map_elem.target_layer.selectAll('path')
          .attr('fill', (d) => {
            const _id = d.id;
            if (_id === app.current_config.my_region) {
              return color_highlight;
            } else if (self.current_ids.indexOf(_id) > -1) {
              if (app.colors[_id]) return app.colors[_id];
              return color_countries;
            }
            return color_disabled;
          });
      })
      .on('mousemove mousedown mouseover', () => {
        if (isContextMenuDisplayed()) return;
        const elems = getElementsFromPoint(d3.event.clientX, d3.event.clientY);
        const elem = elems.find(e => e.className.baseVal === 'polygon' || e.className.baseVal === 'circle');
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
  }

  appendOverlayRect() {
    let miny = Infinity;
    let maxy = -Infinity;
    this.draw_group.selectAll('circle')
      .each(function () {
        const cy = +this.getAttribute('cy');
        if (cy > maxy) maxy = cy;
        if (cy < miny) miny = cy;
      });
    miny -= 45;
    maxy += 45;
    if (miny > 0) {
      this.draw_group.append('rect')
        .attrs({
          class: 'overlayrect',
          x: 0,
          y: 0,
          width: width,
          height: miny,
          fill: 'white',
        });
    }
    if ((height - maxy) > 0) {
      this.draw_group.append('rect')
        .attrs({
          class: 'overlayrect',
          x: 0,
          y: maxy,
          width: width,
          height: height - maxy,
          fill: 'white',
        });
    }
    this.draw_group.selectAll('.overlayrect')
      .on('mouseover', () => {
        this.draw_group.selectAll('circle')
          .styles({ stroke: 'darkgray', 'stroke-width': '0.45' });
      })
      .on('click dblclick', () => {
        this.draw_group.select('.brush').call(this.brush.move, [[0, 0], [0, 0]]);
      });
  }

  displayLine(id_region) {
    if (this.ratios.length === 1) return;
    const coords = [];
    Array.prototype.forEach.call(
      document.querySelectorAll('.grp_var'),
      (el) => {
        const ty = +el.getAttribute('transform').split('translate(0')[1].replace(',', '').replace(')', '').trim();
        const bubble = el.querySelector(`#${id_region}`);
        coords.push([bubble.cx.baseVal.value, bubble.cy.baseVal.value + ty]);
      });
    coords.sort((a, b) => a[1] - b[1]);
    const l = this.draw_group.append('path')
      .datum(coords)
      .attrs({
        class: 'regio_line',
        fill: 'none',
        stroke: 'steelblue',
        'stroke-linejoin': 'round',
        'stroke-linecap': 'round',
        'stroke-width': 1.5,
        d: d3.line().x(_d => _d[0]).y(_d => _d[1]),
      });
    setTimeout(() => {
      l.remove();
    }, 5000);
  }

  updateChangeRegion() {
    this.removeLines();
    if (app.current_config.filter_key !== undefined) {
      this.changeStudyZone();
    } else {
      this.map_elem.updateLegend();
      this.prepareData();
      this.updateCompletude();
      this.updateTableStat();
      this.updateMapRegio();
      this.applySelection(+d3.select('#menu_selection').select('.nb_select').property('value'));
    }
  }

  changeStudyZone() {
    this.removeLines();
    this.map_elem.updateLegend();
    this.ratios = app.current_config.ratio;
    this.nums = app.current_config.num;
    this.data = app.current_data.filter(
      ft => this.ratios.map(v => !!ft[v]).every(v => v === true)).slice();
    this.prepareData();
    const temp = this.highlight_selection.length;
    this.highlight_selection = [];
    this.updateTableStat();
    this.updateCompletude();
    this.applySelection(temp);
    this.updateMapRegio();
  }

  prepareData() {
    this.means = {};
    this.stddevs = {};
    this.ratios.forEach((v) => {
      const values = this.data.map(ft => +ft[v]);
      const mean = getMean2(this.data, v, variables_info);
      this.means[v] = mean;
      this.stddevs[v] = getStdDev(values, mean);
    });
    this.data
      .forEach((ft) => {
        this.ratios.forEach((v) => {
          // eslint-disable-next-line no-param-reassign
          ft[`cr_${v}`] = (+ft[v] - this.means[v]) / this.stddevs[v];
          // // eslint-disable-next-line no-param-reassign
          // ft[`dist_${v}`] = math_abs(+ft[v] - +this.my_region[v]);
        });
      });
    this.my_region = this.data.find(d => d.id === app.current_config.my_region);
    this.data
      .forEach((ft) => {
        this.ratios.forEach((v) => {
          // eslint-disable-next-line no-param-reassign
          ft[`dist_${v}`] = math_abs(+ft[`cr_${v}`] - +this.my_region[`cr_${v}`]);
        });
      });
    this.current_ids = this.data.map(d => d.id);
    this.data.forEach((ft) => {
      // eslint-disable-next-line no-param-reassign, no-restricted-properties
      ft.dist = math_sqrt(this.ratios.map(_v => `dist_${_v}`)
        .map(_v => math_pow(ft[_v], 2)).reduce((a, b) => a + b));
    });
    this.data.sort((a, b) => a.dist - b.dist);
    // eslint-disable-next-line no-param-reassign
    this.data.forEach((el, i) => { el.globalrank = i; });
  }

  addVariable(code_variable) {
    this.removeLines();
    this.ratios = app.current_config.ratio.slice();
    this.nums = app.current_config.num.slice();
    this.data = app.current_data.filter(
      ft => this.ratios.map(v => !!ft[v]).every(v => v === true)).slice();
    this.prepareData();
    // To keep the same selection :
    // this.highlight_selection = this.highlight_selection.map((d) => {
    //   return this.data.find(el => el.id === d.id);
    // }).filter(d => !!d);
    // this.update();

    // To use a new selection according to 'nb_select' value:
    this.applySelection(+d3.select('#menu_selection').select('.nb_select').property('value'));
    this.updateCompletude();
    this.updateTableStat();
    this.updateMapRegio();
  }

  removeVariable(code_variable) {
    this.removeLines();
    this.ratios = app.current_config.ratio.slice();
    this.nums = app.current_config.num.slice();
    this.data = app.current_data.filter(
      ft => this.ratios.map(v => !!ft[v]).every(v => v === true)).slice();
    this.prepareData();

    this.draw_group.select(`g#l_${code_variable}`).remove();

    // And use it immediatly:
    this.updateCompletude();
    this.updateTableStat();
    this.updateMapRegio();
    // To use a new selection according to 'nb_select' value:
    this.applySelection(+d3.select('#menu_selection').select('.nb_select').property('value'));
  }

  bindMenu() {
    const self = this;
    const menu = d3.select('#menu_selection');
    let ts;
    const applychange = function () {
      // self.map_elem.removeRectBrush();
      const value = +this.value;
      if (value < 1) {
        this.value = 1;
        return;
      }
      clearTimeout(ts);
      ts = setTimeout(() => { self.applySelection(value); clearTimeout(ts); }, 75);
    };
    menu.select('.nb_select')
      .on('change', applychange);
    menu.select('.nb_select')
      .on('wheel', applychange);
    menu.select('.nb_select')
      .on('keyup', applychange);
    menu.select('#check_prop')
      .on('change', function () {
        if (this.checked) {
          menu.select('.slider-checkbox > .label').attr('class', 'label noselect');
          self.proportionnal_symbols = true;
        } else {
          menu.select('.slider-checkbox > .label').attr('class', 'label noselect not_selected');
          self.proportionnal_symbols = false;
        }
        self.update();
      });

    menu.select('#ind_dist_global')
      .on('click', function () {
        if (this.classList.contains('active')) {
          return;
        }
        self.handle_brush_map = self._handle_brush_map;
        self.removeLines();
        self.type = 'global';
        this.classList.add('active');
        menu.select('#ind_dist_detailled').attr('class', 'choice_ind noselect');
        menu.select('.selection_display').style('display', 'none');
        self.draw_group.selectAll('g').remove();
        self.map_elem.unbindBrushClick();
        self.map_elem.bindBrushClick(self);
        self.update();
        self.updateMapRegio();
        self.map_elem.displayLegend(4);
      });

    menu.select('#ind_dist_detailled')
      .on('click', function () {
        if (this.classList.contains('active')) {
          return;
        }
        self.handle_brush_map = null;
        self.type = 'detailled';
        this.classList.add('active');
        menu.select('#ind_dist_global').attr('class', 'choice_ind noselect');
        menu.select('.selection_display').style('display', null);
        self.draw_group.selectAll('g').remove();
        self.map_elem.unbindBrushClick();
        self.map_elem.bindBrushClick(self);
        self.applySelection(+d3.select('#menu_selection').select('.nb_select').property('value'));
        self.map_elem.displayLegend(2);
      });
  }

  removeLines() {
    this.draw_group.selectAll('.regio_line').remove();
  }

  getElemBelow(e) {
    if (this.type === 'global') {
      const elems = getElementsFromPoint(e.clientX, e.clientY);
      const elem_overlay = elems.find(el => el.className.baseVal === 'overlayrect');
      if (elem_overlay) return null;
      const elem = elems.find(el => el.className.baseVal === 'polygon' || el.className.baseVal === 'circle');
      return elem && elem.__data__ ? elem.__data__.data.id : null;
    }
    // if this.type === 'detailled' :
    const elems = getElementsFromPoint(e.clientX, e.clientY);
    const elem = elems.find(el => el.className.baseVal === 'bubble');
    return elem && elem.__data__ ? elem.__data__.id : null;
  }

  _handle_brush_map(event) {
    if (!event || !event.selection) {
      this.last_map_selection = null;
      this.last_selection = null;
      return;
    }
    this.map_elem.tooltip.style('display', 'none');
    svg_container.select('.brush').call(this.brush.move, null);
    const self = this;
    const [topleft, bottomright] = event.selection;
    this.last_map_selection = [topleft, bottomright];
    this.highlighted = [];
    this.last_selection = null;
    const rect = new Rect(topleft, bottomright);
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
            self.highlighted.push(id);
            return 'purple';
          }
        }
        if (app.colors[id]) return app.colors[id];
        return color_countries;
      });

    this.draw_group.selectAll('.circle')
      .style('fill', (d) => {
        const _id = d.data.id;
        if (_id === app.current_config.my_region) {
          return color_highlight;
        } else if (this.highlighted.indexOf(_id) > -1) {
          return 'purple';
        }
        return app.colors[_id];
      });
  }

  remove() {
    this.map_elem.layers.selectAll('.cloned').remove();
    this.map_elem.unbindBrushClick();
    this.map_elem = null;
    this.table_stats.remove();
    this.table_stats = null;
    svg_bar.text('').html('');
  }

  bindMap(map_elem) {
    this.map_elem = map_elem;
    this.map_elem.resetColors(this.current_ids);
    this.map_elem.displayLegend(4);
    this.applySelection(1);
  }

  prepareTableStat() {
    const ratios = this.ratios;
    const all_values = ratios.map(v => this.data.map(d => +d[v]));
    const my_region = this.my_region;
    const features = all_values.map((values, i) => ({
      Min: d3.min(values),
      Max: d3.max(values),
      Moy: getMean2(this.data, this.ratios[i], variables_info),
      Med: d3.median(values),
      id: this.ratios[i],
      Variable: this.ratios[i],
      'Ma région': my_region[this.ratios[i]],
    }));
    return features;
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
<h3>Ressemblances</h3>
<b>Aide générale</b>

Les graphiques de ressemblance permettent de visualiser pour un indicateur et plus 1 les régions les plus proches statistiquement d’une région de référence. Cette proximité statistique est évaluée selon une méthode classique : la distance euclidienne (ou distance à vol d’oiseau) prenant en compte des données préalablement standardisées. Si la valeur de l’indice équivaut à 0, la similarité est totale entre ces deux unités territoriales. Plus la valeur de la distance est élevée, moins la similarité est importante.
L’interface Regioviz propose deux niveaux pour la visualisation de ces ressemblances : la ressemblance globale et la ressemblance détaillée indicateur par indicateur.
L’option de distance globale propose une visualisation synthétique de l’éloignement statistique existant entre « ma région » et les autres régions de l’espace d’étude sur les n indicateurs sélectionnés. Ce module est composé d’un graphique de Beeswarm qui permet de visualiser graphiquement le degré de ressemblance statistique existant entre ma région et les autres régions de l’espace d’étude. La carte associée à la représentation graphique rend compte de l’organisation spatiale de ces proximités statistiques : les 25 % des indices de similarité les plus faibles (régions les plus ressemblantes) apparaissent dans des tonalités rouges, les 25 % les plus importantes (régions les moins ressemblantes) sont représentées par des tonalités bleues.
Pour comprendre quel est le poids de chaque indicateur dans la mesure de ressemblance globale, Regioviz propose systématiquement une représentation graphique permettant d’évaluer visuellement le degré de similarité indicateur par indicateur (ressemblances par indicateur). Par défaut, l’application décompose cette ressemblance pour l’unité territoriale qui ressemble le plus à « ma région » de référence d’après la mesure globale de ressemblance. Libre ensuite à l’utilisateur de choisir plus ou moins d’unités territoriales de comparaison (les n unités les plus ressemblantes) en fonction de ses objectifs d’analyse.

<br><p style="text-align: center;"><a class="buttonDownload" href="data/Doc_methodo_ressemblances.pdf">Aide détaillée (.pdf)</a></p>`;
  }

  // eslint-disable-next-line class-methods-use-this
  getTemplateHelp() {
    return '';
  }
}
