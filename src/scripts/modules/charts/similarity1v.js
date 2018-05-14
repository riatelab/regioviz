import {
  comp, math_round, math_abs, math_sqrt, math_pow, math_max, PropSizer, getMean2,
  getNameStudyZone, getStdDev, _isNaN, execWithWaitingOverlay,
  formatNumber, svgContextMenu, getElementsFromPoint, isContextMenuDisplayed, Rect,
  svgPathToCoords, getScrollValue,
} from './../helpers';
import {
  color_disabled, color_countries, color_default_dissim,
  color_highlight, fixed_dimension, color_q1, color_q2,
  color_q3, color_q4,
} from './../options';
import { calcPopCompletudeSubset, calcCompletudeSubset } from './../prepare_data';
import { app, resetColors, variables_info, territorial_mesh } from './../../main';
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
    .on('contextmenu', () => {
      const selec = app.chart.type === 'global' ? app.chart.highlighted : null;
      svgContextMenu(app.chart, svg_bar, app.map, selec);
    })
    .on('wheel', () => { d3.event.preventDefault(); });
  margin = {
    top: 45,
    right: 20,
    bottom: 40,
    left: 50,
  };
  width = fixed_dimension.chart.width - margin.left - margin.right;
  height = fixed_dimension.chart.height - margin.top - margin.bottom;
  const width_value = document.getElementById('bar_section').getBoundingClientRect().width * 0.98;
  d3.select('.cont_svg.cchart')
    .style(
      'padding-top',
      `${(fixed_dimension.chart.height / fixed_dimension.chart.width) * width_value}px`,
    );
  svg_bar.append('defs')
    .append('svg:clipPath')
    .attr('id', 'clip')
    .append('svg:rect')
    .attrs({
      width: fixed_dimension.chart.width + 10,
      height: fixed_dimension.chart.height + 4,
      x: -20,
      y: -2,
    });
  svg_container = svg_bar.append('g').attr('class', 'container');
};

export default class Similarity1plus {
  constructor(ref_data) {
    this._id = Symbol('Similarity1plus');
    updateDimensions();
    this.handle_brush_map = this._handle_brush_map;
    // Set the minimum number of variables to keep selected for this kind of chart:
    app.current_config.nb_var = 1;
    this.ratios = app.current_config.ratio;
    this.nums = app.current_config.num;
    this.data = ref_data
      .filter(ft => this.ratios.map(v => !!ft[v]).every(v => v === true))
      .slice();
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
      calcPopCompletudeSubset(app, this.ratios),
    );

    // Brush behavior (only used for beeswarm):
    this.brush = d3.brushX()
      .extent([[0, 0], [width, height - 50]])
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
      .html('<sup>ème</sup> territoire le plus proche');

    const section = menu_selection.append('div')
      .append('section')
      .attr('class', 'slider-checkbox scprop');
    section.append('input')
      .attrs({ type: 'checkbox', id: 'check_prop' });
    section.append('label')
      .attrs({ class: 'label not_selected noselect', for: 'check_prop' })
      .text('Cercles proportionnels à la population');

    const section2 = menu_selection.append('div')
      .append('section')
      .attr('class', 'slider-checkbox scsorted')
      .style('display', 'none');
    section2.append('input')
      .attrs({ type: 'checkbox', id: 'check_sorted_axis' });
    section2.append('label')
      .attrs({ class: 'label not_selected noselect', for: 'check_sorted_axis' })
      .text('Classement par degré de ressemblance');

    const menu_distance = d3.select('#bar_section')
      .insert('div', '.cont_svg.cchart')
      .attr('id', 'type_dist');

    menu_distance.append('p').html('Type de similarité:');

    const dist_norm_rank = menu_distance.append('div')
      .append('label')
      .attr('class', 'cont_radio');

    const dist_eucl = menu_distance.append('div')
      .append('label')
      .attr('class', 'cont_radio');

    dist_norm_rank.append('input')
      .attrs({
        type: 'radio',
        name: 'radio_dist',
        value: 'rank_norm',
      })
      .property('checked', 'checked');
    dist_norm_rank.append('span')
      .attr('class', 'checkmark');
    dist_norm_rank.append('span')
      .html('Rangs normalisés');

    dist_eucl.append('input')
      .attrs({
        type: 'radio',
        name: 'radio_dist',
        value: 'eucl',
      });
    dist_eucl.append('span')
      .attr('class', 'checkmark');
    dist_eucl.append('span')
      .html('Distance euclidienne');

    this.bindMenu();
    this.makeTableStat();
  }

  brushed() {
    const e = d3.event;
    if (!e.selection && e.type === 'end' && !this.last_selection && !e.sourceEvent.sourceEvent) {
      app.map.removeRectBrush();
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
      app.map.target_layer.selectAll('path')
        .attr('fill-opacity', 1)
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
      app.map.removeRectBrush();
      this.removeMapClonedFeatures();
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

      app.map.target_layer.selectAll('path')
        .attr('fill-opacity', 1)
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
        ft.dist2 = this.ratios.map(_v => `rank_${_v}`)
          .map(_v => ft[_v])
          .reduce((pv, cv) => pv + cv, 0) / this.ratios.length;
        // eslint-disable-next-line no-param-reassign
        ft.dist = math_sqrt(this.ratios.map(v => `dist_${v}`)
          .map(v => math_pow(ft[v], 2)).reduce((a, b) => a + b));
      });

      const field_distance = this.type_distance === 'euclidienne'
        ? 'dist' : 'dist2';
      this.data.sort((a, b) => a[field_distance] - b[field_distance]);

      for (let i = 0, nb_features = this.data.length; i < nb_features; i++) {
        this.data[i].globalrank = i;
      }

      this.highlight_selection = this.data.slice(1, nb + 1);
    } else {
      this.highlight_selection = [];
    }
    this.removeLines();
    this.removeMapClonedFeatures();
    this.update();
    this.updateMapRegio(nb);
  }

  update() {
    if (document.getElementById('overlay').style.display === 'none') {
      execWithWaitingOverlay(() => { this._update(); });
    } else {
      this._update();
    }
  }

  /* eslint-disable no-loop-func */
  _update() {
    const self = this;
    const data = self.data;
    const field_distance = this.type_distance === 'euclidienne'
      ? 'dist' : 'dist2';
    this.draw_group.select('.brush').remove();
    this.draw_group.selectAll('.axis-title-global-dist').remove();
    this.draw_group.selectAll('.overlayrect').remove();
    if (self.type === 'detailled') {
      let ratios;
      if (self.sorted_axis) {
        const highlighted_region = +d3.select('#menu_selection').select('.nb_select').property('value');
        ratios = self.ratios.slice();
        ratios.sort((a, b) => data[highlighted_region][`rank_${b}`] - data[highlighted_region][`rank_${a}`]);
      } else {
        ratios = self.ratios;
      }

      this.draw_group.attr('clip-path', 'url(#clip)');
      const highlight_selection = self.highlight_selection;
      const nb_variables = ratios.length;
      const offset = height / nb_variables + 1;
      let height_to_use = offset / 2;
      // const trans = d3.transition().duration(125);
      for (let i = 0; i < nb_variables; i++) {
        const ratio_name = ratios[i];
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
              d3.select(this).attr('class', 'arrow-shadow');
            })
            .on('mouseup mouseout', function () {
              d3.select(this).attr('class', '');
            })
            .on('click', function () {
              if (self.sorted_axis) return;
              const that_ratio = this.parentNode.id.slice(2);
              const current_position = self.ratios.indexOf(that_ratio);
              if (current_position === 0) { return; }
              self.ratios.splice(current_position, 1);
              self.ratios.splice(current_position - 1, 0, that_ratio);
              self.removeLines();
              self.removeMapClonedFeatures();
              self.update();
            });

          g.append('image')
            .attrs({
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
              d3.select(this).attr('class', 'arrow-shadow');
            })
            .on('mouseup mouseout', function () {
              d3.select(this).attr('class', '');
            })
            .on('click', function () {
              if (self.sorted_axis) return;
              const that_ratio = this.parentNode.id.slice(2);
              const current_position = self.ratios.indexOf(that_ratio);
              if (current_position === self.ratios.length) { return; }
              self.ratios.splice(current_position, 1);
              self.ratios.splice(current_position + 1, 0, that_ratio);
              self.removeLines();
              self.removeMapClonedFeatures();
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
          // .transition(trans)
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
        // this.data.forEach((ft, _ix) => {
        //   ft[`rank_${ratio_name}`] = _ix; // eslint-disable-line no-param-reassign
        // });
        this.data.splice(this.data.indexOf(this.my_region), 1);
        this.data.push(this.my_region);
        if (highlight_selection.length > 0) {
          const dist_axis = math_max(
            math_abs(my_region_value - +d3.min(highlight_selection, d => d[ratio_name])),
            math_abs(+d3.max(highlight_selection, d => d[ratio_name]) - my_region_value),
          );
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
            math_abs(d3.max(ratio_values) - my_region_value),
          );
          const margin_min_max = math_round(dist_axis) / 8;
          _min = my_region_value - dist_axis - margin_min_max;
          _max = my_region_value + dist_axis + margin_min_max;
        }
        this.highlight_selection.forEach((elem) => {
          app.colors[elem.id] = comp(
            elem[ratio_name],
            my_region_value,
            !self.inversedAxis.has(ratio_name),
          );
        });

        app.colors[app.current_config.my_region] = color_highlight;

        const size_func = this.proportionnal_symbols
          ? new PropSizer(d3.max(data, d => d[num_name]), 40).scale
          : () => 7;
        const xScale = d3.scaleLinear()
          .domain([_min, _max])
          .range([0, width]);

        axis
          // .transition(trans)
          .call(d3.axisBottom(xScale).tickFormat(formatNumber));

        const bubbles1 = layer_other.selectAll('.bubble')
          .data(data.filter(d => app.colors[d.id] === undefined), d => d.id);

        bubbles1
          // .transition(trans)
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
          // .transition(trans)
          .attrs((d) => {
            let x_value = xScale(d[ratio_name]);
            if (x_value > width) x_value = width + 200;
            else if (x_value < 0) x_value = -200;
            return {
              globalrank: d.globalrank,
              id: `b_${d.id}`,
              class: 'bubble',
              cx: x_value,
              cy: 10,
              r: size_func(d[num_name]),
            };
          });

        bubbles1.exit()
          // .transition(trans)
          .remove();

        const bubbles2 = layer_highlighted.selectAll('.bubble').data(
          data.filter(d => d.id !== app.current_config.my_region && app.colors[d.id] !== undefined),
          d => d.id,
        );

        bubbles2
          // .transition(trans)
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
          // .transition(trans)
          .attrs((d) => {
            let x_value = xScale(d[ratio_name]);
            if (x_value > width) x_value = width + 200;
            else if (x_value < 0) x_value = -200;
            return {
              globalrank: d.globalrank,
              id: `b_${d.id}`,
              class: 'bubble',
              cx: x_value,
              cy: 10,
              r: size_func(d[num_name]),
            };
          });

        bubbles2.exit()
          // .transition(trans)
          .remove();

        const bubbles3 = layer_top.selectAll('.bubbleMyRegion')
          .data(data.filter(d => d.id === app.current_config.my_region), d => d.id);

        bubbles3
          // .transition(trans)
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
          // .transition(trans)
          .attrs((d) => {
            let x_value = xScale(d[ratio_name]);
            if (x_value > width) x_value = width + 200;
            else if (x_value < 0) x_value = -200;
            return {
              globalrank: d.globalrank,
              id: `b_${d.id}`,
              class: 'bubbleMyRegion',
              cx: x_value,
              cy: 10,
              r: size_func(d[num_name]),
            };
          });

        bubbles3.exit()
          // .transition(trans)
          .remove();
        height_to_use += offset;
        // setTimeout(() => {
        //   bubbles1.order();
        //   bubbles2.order();
        // }, 225);
      }
      setTimeout(() => { this.makeTooltips(); }, 200);
    } else if (self.type === 'global') {
      this.draw_group.attr('clip-path', null);
      data.sort((a, b) => a[field_distance] - b[field_distance]);
      const values = data.map(ft => ft[field_distance]);
      const _values = values.slice().splice(2);
      const num_name = app.current_config.pop_field;
      self.makeClassifColors(_values);
      const size_func = self.proportionnal_symbols
        ? new PropSizer(d3.max(data, d => +d[num_name]), 40).scale
        : () => (data.length < 400 ? 4 : data.length < 800 ? 2.8 : 1.8);
      const collide_margin = self.proportionnal_symbols ? 1.5 : 1;
      this.x = d3.scaleLinear().rangeRound([0, width]).domain(d3.extent(values));
      // const xAxis = d3.axisBottom(this.x).ticks(10, '');
      const simulation = d3.forceSimulation(data)
        .force('x', d3.forceX(d => this.x(d[field_distance])).strength(9))
        .force('y', d3.forceY(height / 2)/* .strength(d => (d.id === app.current_config.my_region ? 1 : 0.06)) */)
        .force('collide', d3.forceCollide(d => size_func(+d[num_name]) + collide_margin))
        .stop();

      let _vt;
      if (values.length <= 300) {
        _vt = 125;
      } else if (values.length > 300 && values.length < 100) {
        _vt = Math.round(values.length * 0.33);
      } else {
        _vt = 350;
      }
      for (let i = 0; i < _vt; ++i) {
        simulation.tick();
      }
      const voro = d3.voronoi()
        .extent([
          [-margin.left, -margin.top * 2],
          [width + margin.right, height + margin.top * 2 - 50]])
        .x(d => d.x)
        .y(d => d.y)
        .polygons(data);
      // this.draw_group.append('text')
      //   .attrs({
      //     x: width / 2,
      //     y: height + 40,
      //     id: 'axis-title-global-dist',
      //   })
      //   .styles({
      //     'text-anchor': 'middle',
      //     'font-size': '14px',
      //     'font-family': '"Signika",sans-serif',
      //   })
      //   .text('Indice de similarité');
      let g = this.draw_group.select('#global_dist');
      if (!g.node()) {
        g = this.draw_group
          .append('g')
          .attrs({
            id: 'global_dist',
            class: 'global_dist',
          });

        // const _axis = g.append('g')
        //   .attrs({
        //     class: 'axis-top-v axis--x',
        //     transform: `translate(0,${height})`,
        //   })
        //   .call(xAxis);
        // _axis.selectAll('text')
        //   .style('display', 'none');

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
        // g.selectAll('.axis-top-v')
        //   // .transition()
        //   // .duration(125)
        //   .call(xAxis);

        const cells = g.select('.cells')
          .selectAll('g.cell')
          .data(voro, d => d.data.id);

        cells.select('.circle')
          // .transition()
          // .duration(125)
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
          // .transition()
          // .duration(125)
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
        self.drawAxisTitle();
      }, 75);
    }
    this.data.sort((a, b) => a[field_distance] - b[field_distance]);
  }
  /* eslint-enable no-loop-func */

  updateCompletude() {
    this.completude.update(
      calcCompletudeSubset(app, this.ratios, 'array'),
      calcPopCompletudeSubset(app, this.ratios),
    );
  }

  updateMapRegio(ix_last_selec) {
    // if (!app.map) return;
    const target_id = ix_last_selec && this.data[ix_last_selec]
      ? this.data[ix_last_selec].id
      : null;
    app.map.target_layer.selectAll('path')
      .attr('fill-opacity', 1)
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
    if (this.type === 'detailled' && target_id) {
      app.map.target_layer.selectAll('path')
        .attr('fill-opacity', d => (
          (app.colors[d.id] && !(d.id === target_id || d.id === app.current_config.my_region))
            ? 0.6
            : 1));
    }
  }

  makeClassifColors(_values) {
    const field_distance = this.type_distance === 'euclidienne'
      ? 'dist' : 'dist2';
    const q1 = d3.quantile(_values, 0.25);
    const q2 = d3.quantile(_values, 0.5);
    const q3 = d3.quantile(_values, 0.75);
    app.colors = {};
    this.data.forEach((ft, i) => {
      if (ft.id === app.current_config.my_region) {
        app.colors[app.current_config.my_region] = color_highlight;
      } else if (i === 1) {
        app.colors[ft.id] = color_default_dissim;
      } else if (ft[field_distance] < q1) {
        app.colors[ft.id] = color_q1;
      } else if (ft[field_distance] < q2) {
        app.colors[ft.id] = color_q2;
      } else if (ft[field_distance] < q3) {
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
      this.removeMapClonedFeatures();
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
        const { scrollX, scrollY } = getScrollValue();
        let _h = 75;
        const ratio_n = this.parentNode.parentNode.id.replace('l_', '');
        const unit_ratio = variables_info.find(ft => ft.id === ratio_n).unit;
        const globalrank = +this.getAttribute('globalrank');
        let indic_rank = self.current_ids.length - +d[`rank_${ratio_n}`];
        indic_rank = indic_rank === 0 ? 1 : indic_rank;
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
            content.push('<br><b>Territoire le plus proche</b> sur cet indicateur');
          } else {
            content.push(`<br><b>${indic_rank - 1}ème</b> territoire le plus proche sur cet indicateur`);
          }
        }
        if (!_isNaN(globalrank)) {
          _h += 30;
          if (+globalrank === 0) {
            content.push('<br><b>Mon territoire</b>');
          } else if (+globalrank === 1) {
            content.push(`<b>Territoire le plus proche</b> sur ces <b>${self.ratios.length}</b> indicateurs`);
          } else {
            content.push(`<b>${globalrank}ème</b> territoire le plus proche sur ces <b>${self.ratios.length}</b> indicateurs`);
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
            left: `${d3.event.pageX - scrollX - 5}px`,
            top: `${d3.event.pageY - scrollY - _h}px`,
          });
      })
      .on('click', function (d) {
        if (this.style.fill !== color_countries) {
          self.displayLine(d.id);
        }
        app.map.target_layer
          .selectAll('path')
          .each(function (ft) {
            if (ft.id === d.id) {
              const cloned = this.cloneNode();
              app.map.layers.select('#temp').node().appendChild(cloned);
              const _cloned = d3.select(cloned)
                .attr('class', 'cloned')
                .styles({
                  fill: 'red',
                  stroke: 'orange',
                  'stroke-width': '1.25px',
                });
              setTimeout(() => { _cloned.remove(); }, 7500);
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
        const { scrollX, scrollY } = getScrollValue();
        self.draw_group.selectAll('circle')
          .styles({ stroke: 'darkgray', 'stroke-width': '0.45' });
        const circle = this.previousSibling;
        circle.style.stroke = 'black';
        circle.style.strokeWidth = '2';
        const content = [];
        const globalrank = d.data.globalrank;
        const field_distance = self.type_distance === 'euclidienne'
          ? 'dist' : 'dist2';
        if (!_isNaN(globalrank)) {
          if (+globalrank === 0) {
            content.push('<b>Mon territoire</b>');
          } else if (+globalrank === 1) {
            content.push(`Indice de similarité : ${formatNumber(d.data[field_distance], 2)}`);
            content.push(`<b>Territoire le plus proche</b> sur ces <b>${self.ratios.length}</b> indicateurs`);
          } else {
            content.push(`Indice de similarité : ${formatNumber(d.data[field_distance], 2)}`);
            content.push(`<b>${globalrank}ème</b> territoire le plus proche sur ces <b>${self.ratios.length}</b> indicateurs`);
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
            left: `${d3.event.pageX - scrollX - 5}px`,
            top: `${d3.event.pageY - scrollY - 75}px`,
          });
      })
      .on('click', function (d) {
        const id = d.data.id;
        const circle = this.parentNode.querySelector('circle');
        if (self.highlighted.indexOf(id) > -1) {
          self.highlighted.splice(self.highlighted.indexOf(id), 1);
          app.map.target_layer
            .selectAll('path')
            .each(function (ft) {
              if (ft.id === id) {
                circle.style.fill = app.colors[id];
                this.setAttribute('fill', app.colors[id]);
              }
            });
        } else {
          self.highlighted.push(id);
          app.map.target_layer
            .selectAll('path')
            .each(function (ft) {
              if (ft.id === id) {
                circle.style.fill = 'purple';
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
        app.map.target_layer.selectAll('path')
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
    miny -= 20;
    maxy += 20;
    if (miny > 0) {
      this.draw_group.insert('rect')
        .attrs({
          class: 'overlayrect',
          x: -60,
          y: -30,
          width: width + 120,
          height: miny + 30,
          fill: 'white',
        });
    }
    if ((height - maxy) > 0) {
      this.draw_group.append('rect')
        .attrs({
          class: 'overlayrect',
          x: -60,
          y: maxy,
          width: width + 120,
          height: height + 50 - maxy,
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

  drawAxisTitle() {
    const _axis = this.draw_group.append('g')
      .attrs({
        class: 'axis-top-v axis--x',
        transform: `translate(0,${height})`,
      })
      .call(d3.axisBottom(this.x).ticks(10, ''));

    _axis.selectAll('text')
      .style('display', 'none');

    const axis_title_g = this.draw_group.append('g')
      .styles({ 'font-family': '"Signika",sans-serif', 'font-size': '13px' });

    axis_title_g.append('text')
      .attrs({
        x: 0,
        y: height + 20,
        class: 'axis-title-global-dist',
      })
      .style('text-anchor', 'start')
      .text('Forte');

    axis_title_g.append('text')
      .attrs({
        x: 0,
        y: height + 32,
        class: 'axis-title-global-dist',
      })
      .style('text-anchor', 'start')
      .text('similarité');

    axis_title_g.append('text')
      .attrs({
        x: width,
        y: height + 20,
        class: 'axis-title-global-dist',
      })
      .style('text-anchor', 'end')
      .text('Faible');

    axis_title_g.append('text')
      .attrs({
        x: width,
        y: height + 32,
        class: 'axis-title-global-dist',
      })
      .style('text-anchor', 'end')
      .text('similarité');
  }

  displayLine(id_region) {
    if (this.ratios.length === 1) return;
    const coords = [];
    Array.prototype.forEach.call(
      document.querySelectorAll('.grp_var'),
      (el) => {
        const ty = +el.getAttribute('transform').split('translate(0')[1].replace(',', '').replace(')', '').trim();
        const bubble = el.querySelector(`#b_${id_region}`);
        coords.push([bubble.cx.baseVal.value, bubble.cy.baseVal.value + ty]);
      },
    );
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
    }, 7500);
  }

  updateChangeRegion() {
    this.removeLines();
    this.removeMapClonedFeatures();
    if (app.current_config.filter_key !== undefined) {
      this.changeStudyZone();
    } else {
      app.map.updateLegend();
      this.prepareData();
      this.updateCompletude();
      this.updateTableStat();
      // this.updateMapRegio();
      this.applySelection(+d3.select('#menu_selection').select('.nb_select').property('value'));
    }
  }

  changeStudyZone() {
    this.removeLines();
    this.removeMapClonedFeatures();
    app.map.updateLegend();
    this.ratios = app.current_config.ratio;
    this.nums = app.current_config.num;
    this.data = app.current_data
      .filter(ft => this.ratios.map(v => !!ft[v]).every(v => v === true))
      .slice();
    this.prepareData();
    let temp;
    if (this.type !== 'global'
          && (this.data.length > +d3.select('#menu_selection').select('.nb_select').property('value')
          || this.data.length > this.highlight_selection.length)) {
      d3.select('#menu_selection').select('.nb_select').property('value', 1);
      temp = 1;
    } else {
      temp = this.highlighted.length;
    }
    this.highlight_selection = [];
    this.updateTableStat();
    this.updateCompletude();
    this.applySelection(temp);
  }

  prepareData() {
    const data = this.data;
    const nb_features = data.length;
    const nb_ratios = this.ratios.length;
    this.means = {};
    this.stddevs = {};
    this.current_ids = [];
    // this.ratios.forEach((v) => {
    //   const values = this.data.map(ft => +ft[v]);
    //   const mean = getMean2(this.data, v, variables_info);
    //   this.means[v] = mean;
    //   this.stddevs[v] = getStdDev(values, mean);
    // });
    for (let i = 0; i < nb_ratios; i++) {
      const v = this.ratios[i];
      const values = data.map(ft => +ft[v]);
      const mean = getMean2(data, v, variables_info);
      this.means[v] = mean;
      this.stddevs[v] = getStdDev(values, mean);
    }

    // this.data
    //   .forEach((ft) => {
    //     this.ratios.forEach((v) => {
    //       // eslint-disable-next-line no-param-reassign
    //       ft[`cr_${v}`] = (+ft[v] - this.means[v]) / this.stddevs[v];
    //       // // eslint-disable-next-line no-param-reassign
    //       // ft[`dist_${v}`] = math_abs(+ft[v] - +this.my_region[v]);
    //     });
    //   });
    // this.current_ids = this.data.map(d => d.id);
    for (let i = 0; i < nb_features; i++) {
      const ft = data[i];
      this.current_ids.push(ft.id);
      for (let j = 0; j < nb_ratios; j++) {
        const v = this.ratios[j];
        ft[`cr_${v}`] = (+ft[v] - this.means[v]) / this.stddevs[v];
      }
    }

    this.my_region = data.find(d => d.id === app.current_config.my_region);
    // this.data
    //   .forEach((ft) => {
    //     this.ratios.forEach((v) => {
    //       // eslint-disable-next-line no-param-reassign
    //       ft[`dist_${v}`] = math_abs(+ft[`cr_${v}`] - +this.my_region[`cr_${v}`]);
    //     });
    //   });
    for (let i = 0; i < nb_features; i++) {
      const ft = data[i];
      for (let j = 0; j < nb_ratios; j++) {
        const v = this.ratios[j];
        // eslint-disable-next-line no-param-reassign
        ft[`dist_${v}`] = math_abs(+ft[`cr_${v}`] - +this.my_region[`cr_${v}`]);
      }
    }

    // this.ratios.forEach((ratio_name) => {
    //   this.data.sort((a, b) => b[`dist_${ratio_name}`] - a[`dist_${ratio_name}`]);
    //   this.data.forEach((ft, _ix) => {
    //     ft[`rank_${ratio_name}`] = _ix; // eslint-disable-line no-param-reassign
    //   });
    // });
    for (let j = 0; j < nb_ratios; j++) {
      const ratio_name = this.ratios[j];
      data.sort((a, b) => a[`dist_${ratio_name}`] - b[`dist_${ratio_name}`]);
      for (let i = 0; i < nb_features; i++) {
        data[i][`rank_${ratio_name}`] = i;
      }
    }

    // this.data.forEach((ft) => {
    //   ft.dist2 = this.ratios
    //     .map(_v => `rank_${_v}`)
    //     .map(_v => ft[_v])
    //     .reduce((pv, cv) => pv + cv, 0) / this.ratios.length;
    //   // eslint-disable-next-line no-param-reassign, no-restricted-properties
    //   ft.dist = math_sqrt(this.ratios.map(_v => `dist_${_v}`)
    //     .map(_v => math_pow(ft[_v], 2)).reduce((a, b) => a + b));
    // });

    for (let i = 0; i < nb_features; i++) {
      const ft = data[i];
      ft.dist2 = this.ratios.map(_v => `rank_${_v}`)
        .map(_v => ft[_v])
        .reduce((pv, cv) => pv + cv, 0) / this.ratios.length;
      ft.dist = math_sqrt(this.ratios.map(_v => `dist_${_v}`)
        .map(_v => math_pow(ft[_v], 2)).reduce((a, b) => a + b));
    }
    this.my_region.dist = 0;
    this.my_region.dist2 = 0;
    const field_distance = this.type_distance === 'euclidienne'
      ? 'dist' : 'dist2';
    data.sort((a, b) => a[field_distance] - b[field_distance]);

    for (let i = 0; i < nb_features; i++) {
      data[i].globalrank = i;
    }

    d3.select('#menu_selection').select('.nb_select').property('max', this.data.length - 1);
  }

  // eslint-disable-next-line no-unused-vars
  addVariable(code_variable) {
    this.removeLines();
    this.removeMapClonedFeatures();
    this.ratios = app.current_config.ratio.slice();
    this.nums = app.current_config.num.slice();
    this.data = app.current_data
      .filter(ft => this.ratios.map(v => !!ft[v]).every(v => v === true))
      .slice();
    this.prepareData();
    // To keep the same selection :
    // this.highlight_selection = this.highlight_selection.map((d) => {
    //   return this.data.find(el => el.id === d.id);
    // }).filter(d => !!d);
    // this.update();
    const ix_last_selec = this.type !== 'global'
      ? +d3.select('#menu_selection').select('.nb_select').property('value')
      : null;
    // To use a new selection according to 'nb_select' value:
    this.applySelection(ix_last_selec);
    this.updateCompletude();
    this.updateTableStat();
  }

  removeVariable(code_variable) {
    this.removeLines();
    this.removeMapClonedFeatures();
    this.ratios = app.current_config.ratio.slice();
    this.nums = app.current_config.num.slice();
    this.data = app.current_data
      .filter(ft => this.ratios.map(v => !!ft[v]).every(v => v === true))
      .slice();
    this.prepareData();

    this.draw_group.select(`g#l_${code_variable}`).remove();

    const ix_last_selec = this.type !== 'global'
      ? +d3.select('#menu_selection').select('.nb_select').property('value')
      : null;

    // And use it immediatly:
    this.updateCompletude();
    this.updateTableStat();
    // To use a new selection according to 'nb_select' value:
    this.applySelection(ix_last_selec);
  }

  bindMenu() {
    const self = this;
    const menu = d3.select('#menu_selection');
    let ts;
    const applychange = function () {
      let value = +this.value;
      if (value < 1) {
        value = this.value = 1; // eslint-disable-line no-multi-assign
      }
      clearTimeout(ts);
      ts = setTimeout(() => {
        self.applySelection(value); clearTimeout(ts);
      }, 175);
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
          menu.select('.scprop > .label').attr('class', 'label noselect');
          self.proportionnal_symbols = true;
        } else {
          menu.select('.scprop > .label').attr('class', 'label noselect not_selected');
          self.proportionnal_symbols = false;
        }
        self.update();
      });

    menu.select('#check_sorted_axis')
      .on('change', function () {
        if (this.checked) {
          menu.select('.scsorted > .label').attr('class', 'label noselect');
          self.sorted_axis = true;
        } else {
          menu.select('.scsorted > .label').attr('class', 'label noselect not_selected');
          self.sorted_axis = false;
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
        self.removeMapClonedFeatures();
        self.type = 'global';
        this.classList.add('active');
        menu.select('#ind_dist_detailled').attr('class', 'choice_ind noselect');
        menu.select('.selection_display').style('display', 'none');
        menu.select('.scsorted').style('display', 'none');
        self.draw_group.selectAll('g').remove();
        app.map.unbindBrushClick();
        app.map.bindBrushClick(self);
        self.update();
        self.updateMapRegio();
        app.map.displayLegend(4);
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
        menu.select('.scsorted').style('display', null);
        self.draw_group.selectAll('g').remove();
        app.map.unbindBrushClick();
        app.map.bindBrushClick(self);
        self.applySelection(+d3.select('#menu_selection').select('.nb_select').property('value'));
        app.map.displayLegend(2);
      });

    d3.selectAll('[name="radio_dist"]')
      .on('change', function () {
        if (this.checked && this.value === 'eucl') {
          self.type_distance = 'euclidienne';
        } else if (this.checked && this.value === 'rank_norm') {
          self.type_distance = 'rank_norm';
        }
        self.update();
        self.updateMapRegio();
      });
  }

  removeLines() {
    this.draw_group.selectAll('.regio_line').remove();
  }

  // eslint-disable-next-line class-methods-use-this
  removeMapClonedFeatures() {
    app.map.layers.selectAll('.cloned').remove();
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
    app.map.tooltip.style('display', 'none');
    svg_container.select('.brush').call(this.brush.move, null);
    const self = this;
    const [topleft, bottomright] = event.selection;
    this.last_map_selection = [topleft, bottomright];
    this.highlighted = [];
    this.last_selection = null;
    const rect = new Rect(topleft, bottomright);
    app.map.target_layer.selectAll('path')
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
    this.removeMapClonedFeatures();
    app.map.unbindBrushClick();
    this.table_stats.remove();
    this.table_stats = null;
    d3.select('#type_dist').remove();
    svg_bar.text('').html('');
  }

  bindMap(map_elem) {
    app.map = map_elem;
    app.map.resetColors(this.current_ids);
    app.map.displayLegend(4);
    this.applySelection(null);
    this.updateCompletude();
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
      'Mon territoire': my_region[this.ratios[i]],
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

Les graphiques de ressemblance permettent de visualiser pour un indicateur et plus 1 les territoires les plus proches statistiquement d'un territoire de référence. Cette proximité statistique est évaluée selon une méthode classique : la distance euclidienne (ou distance à vol d'oiseau) prenant en compte des données préalablement standardisées. Si la valeur de l'indice équivaut à 0, la similarité est totale entre ces deux unités territoriales. Plus la valeur de la distance est élevée, moins la similarité est importante.

L'interface Regioviz propose deux niveaux pour la visualisation de ces ressemblances : la <b>ressemblance globale</b> et la <b>ressemblance détaillée</b> indicateur par indicateur.

L'option de distance globale propose une visualisation synthétique de l'éloignement statistique existant entre « mon territoire » et les autres territoires de l'espace d'étude sur les n indicateurs sélectionnés. Ce module est composé d’un graphique en essaim (beeswarm) qui permet de visualiser graphiquement le degré de ressemblance statistique existant entre mon territoires et les autres territoires de l'espace d'étude. La carte associée à la représentation graphique rend compte de l'organisation spatiale de ces proximités statistiques : les 25 % des indices de similarité les plus faibles (territoires les plus ressemblants) apparaissent dans des tonalités rouges, les 25 % les plus importantes (territoires les moins ressemblants) sont représentées par des tonalités bleues.

Pour comprendre quel est le poids de chaque indicateur dans la mesure de ressemblance globale, Regioviz propose systématiquement une représentation graphique permettant d'évaluer visuellement le degré de similarité indicateur par indicateur (ressemblances par indicateur). Par défaut, l'application décompose cette ressemblance pour l'unité territoriale qui ressemble le plus à « mon territoire » de référence d'après la mesure globale de ressemblance. Libre ensuite à l'utilisateur de choisir plus ou moins d'unités territoriales de comparaison (les n unités les plus ressemblantes) en fonction de ses objectifs d'analyse.

<br><p style="text-align: center;"><a class="buttonDownload" href="data/Doc_methodo_ressemblances.pdf">Aide détaillée (.pdf)</a></p>`;
  }

  /* eslint-disable function-paren-newline */
  getTemplateHelp() {
    const info_var = {};
    this.ratios.forEach((v, i) => {
      info_var[i + 1] = variables_info.find(ft => ft.id === v);
    });
    const my_region_pretty_name = app.current_config.my_region_pretty_name;
    const name_territorial_mesh = territorial_mesh
      .find(d => d.id === app.current_config.current_level).name;
    // eslint-disable-next-line no-nested-ternary
    const name_study_zone = getNameStudyZone();
    const help1 = [];
    this.ratios.forEach((v, i) => {
      help1.push(`<b>Indicateur ${i + 1}</b> : ${info_var[i + 1].name} (<i>${info_var[i + 1].id}</i>)<br>`);
    });
    help1.push(`<b>Maillage territorial d'analyse</b> : ${territorial_mesh.find(d => d.id === app.current_config.current_level).name}<br>`);

    if (app.current_config.my_category) {
      help1.push(
        `<b>Espace d'étude</b> : Territoires de même ${name_study_zone}<br><b>Catégorie</b> : ${app.current_config.my_category}`);
    } else if (app.current_config.filter_type === 'SPAT' && app.current_config.filter_key instanceof Array) {
      help1.push(
        `<b>Espace d'étude</b> : France (Territoires dans un voisinage de ${document.getElementById('dist_filter').value} km)`);
    } else if (app.current_config.filter_type === 'CUSTOM' && app.current_config.filter_key instanceof Array) {
      help1.push(
        `<b>Espace d'étude</b> : Sélection personnalisée de ${app.current_config.filter_key.length} territoires`);
    } else {
      help1.push(`<b>Espace d'étude</b> : France`); // eslint-disable-line quotes
    }
    // const my_region = this.my_region;
    let compl = calcCompletudeSubset(app, this.ratios, 'array');
    compl = compl[0] === compl[1] ? 'la totalité des' : `${compl[0]} des ${compl[1]}`;
    const help2 = [];
    if (this.type === 'global') {
      let indic_list = this.ratios.map((v, i) => `<b>${info_var[i + 1].name}</b> <i>(${v})</i>`).join(' | ');
      indic_list = `${indic_list.slice(0, indic_list.lastIndexOf('|'))}et${indic_list.slice(indic_list.lastIndexOf('|') + 1, indic_list.length)}`;
      indic_list = indic_list.replace(/\|/g, ',');
      help2.push(`
        Les graphiques de ressemblance permettent de visualiser les unités territoriales les plus proches statistiquement de <b>${my_region_pretty_name}</b> pour les indicateurs ${indic_list}, par rapport à l'espace d'étude <b>${name_study_zone}</b> et au maillage <b>${name_territorial_mesh}</b>.
        Cette proximité statistique est évaluée selon une méthode classique : la distance euclidienne (ou distance à vol d'oiseau) prenant en compte des données préalablement standardisées.
        Si la valeur de l'indice équivaut à 0, la similarité est totale entre ces deux unités territoriales. Plus la valeur de la distance est élevée, moins la similarité est importante.
        <br><br>
        L'option de distance globale propose une visualisation synthétique en essaim (<i>beeswarm</i>) de l'éloignement statistique existant entre l'unité territoriale <b>${my_region_pretty_name}</b> et les autres unités
        territoriales de l'espace d'étude pour ces <b>${this.ratios.length}</b> indicateurs. La carte associée à la représentation graphique rend compte de l'organisation spatiale de ces proximités statistiques : les 25 % des unités territoriales les plus ressemblantes (indices de similarité les plus faibles) apparaissent dans des tons rouges, les 25 % les moins ressemblantes sont représentées par des tons bleus.
        <br><br>
        Les données sont ici disponibles pour <b>${compl} unités territoriales</b> de l'espace d'étude, soit ${formatNumber(calcPopCompletudeSubset(app, this.ratios), 0)}% de la population de l'espace d'étude.
        Compte tenu de cette sélection, les cinq unités territoriales les plus ressemblantes sont les suivantes :<br>`);
      this.data.slice(1, 6).forEach((d, i) => {
        if (i === 0) help2.push(`${d.id} - ${d.name} (avec un indice de similarité de ${formatNumber(d.dist, 1)})<br>`);
        else help2.push(`${d.id} - ${d.name} (${formatNumber(d.dist, 2)})<br>`);
      });
      help2.push('<br>Les cinqs unités territoriales les moins ressemblantes sont les suivantes :<br>');
      const temp = this.data.slice(this.data.length - 5, this.data.length);
      temp.reverse();
      temp.forEach((d) => {
        help2.push(`${d.id} - ${d.name} (${formatNumber(d.dist, 2)})<br>`);
      });
      help2.push('<br>Cette mesure de ressemblance étant synthétique, il est opportun de se rendre sur l\'option des ressemblances détaillées par indicateur pour en savoir plus sur la nature de ces ressemblances.');
    } else {
      const n_regio = +d3.select('#menu_selection').select('.nb_select').property('value');
      help2.push(`
Ces graphiques de distribution permettent d'évaluer visuellement le degré de ressemblance existant entre l'unité territoriale <b>${my_region_pretty_name}</b> et les autres unités territoriales pour chacun des indicateurs suivants :<br>`);
      this.ratios.forEach((v, i) => {
        help2.push(` - ${v} : ${info_var[i + 1].name}<br>`);
      });
      help2.push(`Les données sont disponibles pour <b>${compl} unités territoriales</b> de l'espace d'étude ${name_study_zone}, au niveau ${name_territorial_mesh}, soit ${formatNumber(calcPopCompletudeSubset(app, this.ratios), 0)}% de la population de l'espace d'étude.<br><br>`);
      help2.push(`
En particulier, ce graphique souligne la distance qui sépare la ${n_regio === 1 ? [n_regio, 'ère'].join('') : [n_regio, 'ème'].join('')} entité territoriale la plus ressemblante globalement de l'unité territoriale <b>${my_region_pretty_name}</b>.
Il s'agit de la ${this.data[n_regio].name} (${app.full_dataset.find(d => d.id === this.data[n_regio].id).UNIT_SUP}). Voici ce qui en résulte indicateur par indicateur : <br>`);
      this.ratios.forEach((v) => {
        let rank = this.current_ids.length - 1 - +this.data[n_regio][`rank_${v}`];
        rank = rank === 0 ? 1 : rank;
        rank = rank === 1 ? '1ère' : `${rank}ème`;
        help2.push(` - ${v} : ${rank} unité territoriale la plus proche.<br>`);
      });
      const dmin = this.ratios.map(v => [v, this.data[n_regio][`dist_${v}`]]);
      dmin.sort((a, b) => b[1] - a[1]);
      help2.push(`<br>La ressemblance entre les unités territoriales <b>${my_region_pretty_name}</b> et <b>${this.data[n_regio].name}</b> est donc d'abord due à la proximité des valeurs de ${dmin[0][0]}`);
    }
    const source = this.ratios
      .map((v, i) => `<b>Indicateur ${i + 1}</b> : ${info_var[i + 1].source} (Date de téléchargement de la donnée : ${info_var[i + 1].last_update})`)
      .join('<br>');
    return { section_selection: help1.join(''), section_help: help2.join(''), section_source: source };
  }
  /* eslint-enable function-paren-newline */
}
