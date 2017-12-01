import { comp, math_round, math_pow, math_sqrt, getMean, getStandardizedMeanStdDev, prepareTooltip, shuffle } from './../helpers';
import { color_disabled, color_countries, color_highlight, color_default_dissim } from './../options';
import { calcPopCompletudeSubset } from './../prepare_data';
import { app, resetColors } from './../../main';
import TableResumeStat from './../tableResumeStat';

const svg_bar = d3.select('#svg_bar');
const margin = { top: 20, right: 20, bottom: 40, left: 40 };

const width = +svg_bar.attr('width') - margin.left - margin.right,
  height = +svg_bar.attr('height') - margin.top - margin.bottom;


/**
* Class representing some "special" bar chart, allowing to toogle the
* reprsentation between a simple bar chart (for **similarity**)
* and a grouped bar chart with negative value (for **dissimilarity**)
*/
export class SimilarityChart {
   /**
   * Create a the bar chart on the `svg_bar` svg element previously defined.
   * @param {Array} ref_data - A reference to the subset of the dataset to be used
   * to create the scatterplot (should contain at least two field flagged as ratio
   * in the `app.current_config.ratio` Object).
   */
  constructor(ref_data) {
    // Set the minimum number of variables to keep selected for this kind of chart:
    app.current_config.nb_var = 2;
    const x = d3.scaleBand().range([0, width]).padding(0.1);
    const x1 = d3.scaleBand().padding(0.05);
    const y = d3.scaleLinear().range([height, 0]);
    const z = d3.scaleOrdinal()
      .range(shuffle(d3.schemeCategory10));
    const xAxis = d3.axisBottom(x);
    const yAxis = d3.axisLeft(y);
    this.x = x;
    this.x1 = x1;
    this.y = y;
    this.z = z;
    this.xAxis = xAxis;
    this.yAxis = yAxis;
    this.nb_display = 5;
    this.variables = app.current_config.ratio;
    this.current_type = 'global';
    // Filter the data against empty features:
    this.ref_data = ref_data.filter(
      ft => this.variables.map(v => !!ft[v]).every(v => v === true)).slice();
    // Standardize all variables:
    this.variables.forEach((v) => {
      const serie = this.ref_data.map(ft => ft[v]);
      const standardized = getStandardizedMeanStdDev(serie);
      const name_standardized = `st_${v}`;
      this.ref_data.forEach((ft, i) => {
        // eslint-disable-next-line no-param-reassign
        ft[name_standardized] = standardized[i];
      });
    });

    // Find value of my region:
    this.obj_my_region = this.ref_data.find(d => d.id === app.current_config.my_region);

    this.ref_data.forEach((ft) => {
      const s = this.variables.map(v => math_pow(this.obj_my_region[`st_${v}`] - ft[`st_${v}`], 2)).reduce((a, b) => a + b, 0);
      // eslint-disable-next-line no-param-reassign
      ft.dissimilarity = math_sqrt(s);
      this.variables.forEach((v) => {
        const var_name = `ec_${v}`;
        // eslint-disable-next-line no-param-reassign
        ft[var_name] = (ft[v] / this.obj_my_region[v] * 100) - 100;
      });
    });
    this.ref_data = this.ref_data.sort((a, b) => a.dissimilarity - b.dissimilarity);
    this.data = this.ref_data.slice(1, 1 + this.nb_display);

    this.current_ids = this.ref_data.map(d => d.id);
    this.displayed_ids = this.data.map(d => d.id);

    resetColors();

    svg_bar.append('defs')
      .append('clipPath')
      .attr('id', 'clip')
      .append('rect')
      .attrs({ width, height });

    const plot = svg_bar.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    this.plot = plot;

    const _max = d3.max(this.data, d => d.dissimilarity);

    x.domain(this.displayed_ids);
    y.domain([0, _max + _max / 12]);

    plot.append('g')
      .attrs({ class: 'axis axis--x', transform: `translate(0, ${height})` })
      .call(xAxis);

    plot.select('.axis--x')
      .selectAll('text')
      .style('text-anchor', 'end')
      .attrs({ dx: '-0.8em', dy: '0.15em', transform: 'rotate(-65)' });

    plot.append('g')
      .attr('class', 'axis axis--y')
      .call(yAxis);

    this.g_bar = plot.append('g')
      .attr('id', 'bar');

    this.completude_value = calcPopCompletudeSubset(app, this.variables);

    this.completude = svg_bar.append('text')
      .attrs({ id: 'chart_completude', x: 60, y: 40 })
      .styles({ 'font-family': '\'Signika\', sans-serif' })
      .text(`Complétude : ${this.completude_value}%`);

    // Prepare the tooltip displayed on mouseover:
    const tooltip = prepareTooltip(svg_bar);

    // Create the section containing the input element allowing to chose
    // how many "close" regions we want to highlight.
    const menu_selection = d3.select(svg_bar.node().parentElement)
      .append('div')
      .attr('id', 'menu_selection')
      .styles({ top: '-20px', 'margin-left': '30px', position: 'relative' });
    const selection_close = menu_selection.append('p')
      .style('float', 'left');

    selection_close.append('span')
      .property('value', 'close')
      .attrs({ value: 'close', class: 'type_selection square checked' });
    selection_close.append('span')
      .attrs({ class: 'label_chk' })
      .html('Les');
    selection_close.append('input')
      .attrs({ class: 'nb_select', type: 'number' })
      .property('value', 5);
    selection_close.append('span')
      .attrs({ class: 'label_chk' })
      .html('régions les plus proches');

    const indice_kind = menu_selection.append('p')
      .styles({
        float: 'right',
        display: 'inline-grid',
      });

    indice_kind.append('span')
      .attrs({
        id: 'ind_global',
        class: 'choice_ind active',
      })
      .text('Indice global');

    indice_kind.append('span')
      .attrs({
        id: 'ind_detail',
        class: 'choice_ind',
      })
      .text('Indices détaillés');

    this.makeGrid();
    this.bindMenu();
    this.update();
    this.makeTableStat();
  }

  makeGrid() {
    this.plot.insert('g', '#bar')
      .attr('class', 'grid grid-y')
      .call(d3.axisLeft(this.y)
        .tickSize(-width)
        .tickFormat(''))
      .selectAll('line, path')
      .attr('stroke', 'lightgray');
  }

  updateCompletude() {
    this.completude_value = calcPopCompletudeSubset(app, this.variables);
    this.completude
      .text(`Complétude : ${this.completude_value}%`);
  }

  updateContext(min, max) {
    this.context.selectAll('.bar')
       .style('fill-opacity', (_, i) => (i >= min && i < max ? '1' : '0.3'));
  }

  update() {
    const self = this;
    svg_bar.select('.tooltip').selectAll('text').text('');
    svg_bar.select('#title-axis-y').remove();
    if (this.current_type === 'global') {
      const _max = d3.max(this.data, d => d.dissimilarity);
      this.x.domain(this.displayed_ids);
      this.y.domain([0, _max + _max / 12]);

      this.plot.select('#zero_line').remove();

      const bars = this.g_bar.selectAll('.bar')
        .data(this.data, d => d.id);

      bars
        .attrs(d => ({
          x: this.x(d.id),
          y: this.y(d.dissimilarity),
          width: this.x.bandwidth(),
          height: height - this.y(d.dissimilarity),
        }))
        .style('fill', color_default_dissim);

      bars.enter()
        .insert('rect', '.mean')
        .attrs(d => ({
          class: 'bar',
          x: this.x(d.id),
          y: this.y(d.dissimilarity),
          width: this.x.bandwidth(),
          height: height - this.y(d.dissimilarity),
        }))
        .style('fill', color_default_dissim)
        .on('mouseover', () => {
          svg_bar.select('.tooltip').style('display', null);
        })
        .on('mouseout', () => {
          svg_bar.select('.tooltip').style('display', 'none');
        })
        .on('mousemove', function (d) {
          const tooltip = svg_bar.select('.tooltip');
          tooltip.select('rect').attrs({ width: 0, height: 0 });
          tooltip
            .select('text.id_feature')
            .text(`${app.current_config.my_region} - ${d.id}`);
          tooltip.select('text.value_feature1')
            .text(`Indice de dissimilarité : ${math_round(d.dissimilarity * 10) / 10}`);
          const b = tooltip.node().getBoundingClientRect();
          tooltip.select('rect')
            .attrs({
              width: b.width + 20,
              height: b.height + 7.5,
            });
          tooltip
            .attr('transform', `translate(${[d3.mouse(this)[0] - 5, d3.mouse(this)[1] - 25]})`);
        });

      bars.exit().remove();

      const axis_x = this.plot.select('.axis--x')
        .attr('font-size', () => (this.nb_display > 75 ? 6 : 10))
        .call(this.xAxis);

      axis_x
        .selectAll('text')
        .attrs(() => {
          if (this.nb_display > 100) {
            return { dx: '-0.8em', dy: '0.15em', transform: 'rotate(-65)' };
          } else if (this.nb_display > 20) {
            return { dx: '-0.8em', dy: '0.15em', transform: 'rotate(-65)' };
          }
          return { dx: '0', dy: '0.71em', transform: null };
        })
        .style('text-anchor', () => (this.nb_display > 20 ? 'end' : 'middle'));

      this.plot.select('.axis--y')
        .call(this.yAxis);

      this.plot.select('.grid-y')
        .call(d3.axisLeft(this.y)
          .tickSize(-width)
          .tickFormat(''))
        .selectAll('line, path')
        .attr('stroke', 'lightgray');

      svg_bar.append('text')
        .attrs({
          id: 'title-axis-y',
          x: margin.left / 2,
          y: margin.top + (height / 2) - 10,
          transform: `rotate(-90, ${margin.left / 2}, ${margin.top + (height / 2)})`,
        })
        .styles({ 'font-family': 'sans-serif', 'font-size': '12px', 'text-anchor': 'middle' })
        .text('Indice de dissimilarité');
    } else if (this.current_type === 'detail') {
      const keys = this.variables.map(v => `ec_${v}`);
      this.x.domain(this.displayed_ids);
      this.x1.domain(keys).rangeRound([0, this.x.bandwidth()]);
      this.z.domain(keys);
      const mmin = d3.min(this.data, d => d3.min(keys, key => d[key]));
      this.y.domain([
        mmin > 0 ? 0 : mmin,
        d3.max(this.data, d => d3.max(keys, key => d[key])),
      ]).nice();

      this.plot.select('#zero_line').remove();
      this.plot.insert('line')
        .attrs({
          x1: 0,
          x2: width,
          y1: this.y(0),
          y2: this.y(0),
          'stroke-width': '1px',
          stroke: '#000',
          id: 'zero_line',
        });

      const bars = this.g_bar.selectAll('.group_bar')
        .data(this.data, d => d.id);

      bars
        .attr('transform', d => `translate(${this.x(d.id)}, 0)`);

      bars
        .selectAll('rect')
        .attrs(d => ({
          x: this.x1(d.key),
          y: this.y(Math.max(0, d.value)),
          width: this.x1.bandwidth(),
          height: Math.abs(this.y(d.value) - this.y(0)),
          fill: this.z(d.key),
        }));

      bars.enter()
        .append('g')
        .attrs(d => ({
          class: 'group_bar',
          transform: `translate(${this.x(d.id)}, 0)`,
        }))
        .selectAll('rect')
        .data(d => keys.map(key => ({ key, value: d[key], value_ref: d[key.replace('ec_', '')], id: d.id })))
        .enter()
        .append('rect')
        .attrs(d => ({
          x: this.x1(d.key),
          y: this.y(Math.max(0, d.value)),
          width: this.x1.bandwidth(),
          height: Math.abs(this.y(d.value) - this.y(0)),
          fill: this.z(d.key),
        }))
        .on('mouseover', () => {
          svg_bar.select('.tooltip').style('display', null);
        })
        .on('mouseout', () => {
          svg_bar.select('.tooltip').style('display', 'none');
        })
        .on('mousemove', function (d) {
          const tooltip = svg_bar.select('.tooltip');
          const indic = d.key.replace('ec_', '');
          tooltip.select('rect').attrs({ width: 0, height: 0 });
          tooltip
            .select('text.id_feature')
            .text(`${app.current_config.my_region} - ${d.id}`);
          tooltip.select('text.value_feature1')
            .text(`Indicateur : ${indic}`);
          tooltip.select('text.value_feature2')
            .text(`${app.current_config.my_region} : ${math_round(self.obj_my_region[indic] * 10) / 10}`);
          tooltip.select('text.value_feature3')
            .text(`${d.id} : ${math_round(d.value_ref * 10) / 10}`);
          tooltip.select('text.value_feature4')
            .text(`Écart: ${math_round(d.value * 10) / 10} %`);
          const tx = +this.parentElement.getAttribute('transform').replace('translate(', '').replace(', 0)', '');
          const b = tooltip.node().getBoundingClientRect();
          tooltip.select('rect')
            .attrs({
              width: b.width + 20,
              height: b.height + 7.5,
            });
          tooltip
            .attr('transform', `translate(${[d3.mouse(this)[0] - 5 + tx, d3.mouse(this)[1] - 72.5]})`);
        });

      bars.exit().remove();

      const axis_x = this.plot.select('.axis--x')
        .transition()
        .call(d3.axisBottom(this.x));
      this.plot.select('.axis--y')
        .transition()
        .call(d3.axisLeft(this.y).ticks(null, 's'));

      this.plot.select('.grid-y')
        .transition()
        .call(d3.axisLeft(this.y)
          .tickSize(-width)
          .tickFormat(''))
        .selectAll('line')
        .attr('stroke', 'lightgray');

      axis_x.selectAll('text')
        .attrs(() => {
          if (this.nb_display > 18) {
            return {
              dx: '-0.8em',
              dy: '0.15em',
              transform: 'rotate(-65)',
              'font-size': this.nb_display > 45 ? '7.5px' : '9px' };
          }
          return { dx: '0', dy: '0.71em', transform: null };
        })
        .style('text-anchor', () => (this.nb_display > 18 ? 'end' : 'middle'));

      axis_x.selectAll('.tick > line')
        .attrs({
          transform: `translate(${Math.ceil(width / (this.displayed_ids.length * 2))},0)`,
          y1: 6,
          y2: -height,
        })
        .styles({
          stroke: 'gray',
          'stroke-opacity': 0.4,
        });
    }
  }

  updateMapRegio() {
    this.map_elem.target_layer.selectAll('path')
      .attr('fill', d => (
        this.current_ids.indexOf(d.properties[app.current_config.id_field_geom]) > -1
          ? app.colors[d.properties[app.current_config.id_field_geom]] || color_countries
          : color_disabled));
  }

  updateChangeRegion() {
    this.changeStudyZone();
  }

  changeStudyZone() {
    this.variables = app.current_config.ratio;
    // Filter the data against empty features:
    this.ref_data = app.current_data
      .filter(ft => this.variables.map(v => !!ft[v]).every(v => v === true))
      .slice();
    // Standardize all variables:
    this.variables.forEach((v) => {
      const serie = this.ref_data.map(ft => ft[v]);
      const standardized = getStandardizedMeanStdDev(serie);
      const name_standardized = `st_${v}`;
      this.ref_data.forEach((ft, i) => {
        // eslint-disable-next-line no-param-reassign
        ft[name_standardized] = standardized[i];
      });
    });

    // Find value of my region:
    this.obj_my_region = this.ref_data.find(d => d.id === app.current_config.my_region);

    this.ref_data.forEach((ft) => {
      const s = this.variables.map(v => math_pow(this.obj_my_region[`st_${v}`] - ft[`st_${v}`], 2)).reduce((a, b) => a + b, 0);
      // eslint-disable-next-line no-param-reassign
      ft.dissimilarity = math_sqrt(s);
      this.variables.forEach((v) => {
        const var_name = `ec_${v}`;
        // eslint-disable-next-line no-param-reassign
        ft[var_name] = (ft[v] / this.obj_my_region[v] * 100) - 100;
      });
    });
    this.ref_data = this.ref_data.sort((a, b) => a.dissimilarity - b.dissimilarity);
    this.data = this.ref_data.slice(1, 1 + this.nb_display);

    this.current_ids = this.ref_data.map(d => d.id);
    this.displayed_ids = this.data.map(d => d.id);
    app.colors = {};
    this.displayed_ids.forEach((_id) => { app.colors[_id] = color_default_dissim; });
    app.colors[app.current_config.my_region] = color_highlight;
    this.updateCompletude();
    this.updateTableStats();
    this.updateMapRegio();
    this.update();
  }

  applySelection(nb_value) {
    this.nb_display = nb_value;
    this.data = this.ref_data.slice(1, 1 + nb_value);
    this.displayed_ids = this.data.map(d => d.id);
    app.colors = {};
    this.displayed_ids.forEach((_id) => { app.colors[_id] = color_default_dissim; });
    app.colors[app.current_config.my_region] = color_highlight;
    this.updateMapRegio();
    this.update();
  }

  bindMenu() {
    const self = this;
    const menu = d3.select('#menu_selection');
    const applychange = function () {
      let value = +this.value;
      if (value < 1) {
        this.value = 1;
        return;
      }
      if (self.current_type === 'global' && value > self.ref_data.length) {
        value = this.value = self.ref_data.length;
      } else if (self.current_type === 'detail' && value > 50) {
        value = this.value = 50;
      }
      self.applySelection(value);
    };
    menu.select('.nb_select')
      .on('change', applychange);
    menu.select('.nb_select')
      .on('wheel', applychange);
    menu.select('.nb_select')
      .on('keyup', applychange);

    menu.select('#ind_global')
      .on('click', function () {
        if (this.classList.contains('active')) {
          return;
        }
        self.current_type = 'global';
        this.classList.add('active');
        menu.select('#ind_detail')
          .attr('class', 'choice_ind');
        self.g_bar.selectAll('g').remove();
        self.update();
      });

    menu.select('#ind_detail')
      .on('click', function () {
        if (this.classList.contains('active')) {
          return;
        }
        self.current_type = 'detail';
        this.classList.add('active');
        menu.select('#ind_global')
          .attr('class', 'choice_ind');
        self.g_bar.selectAll('rect').remove();
        self.update();
      });
  }

  addVariable(code_variable, name_variable) {
    this.g_bar.selectAll('rect, g').remove();
    this.changeStudyZone();
  }

  removeVariable(code_variable) {
    this.g_bar.selectAll('rect, g').remove();
    this.changeStudyZone();
  }

  changeVariable(code_variable) {
    this.ratio_to_use = code_variable;
  }

  remove() {
    this.plot.remove();
    this.table_stats.remove();
    this.table_stats = null;
    this.map_elem.unbindBrushClick();
    this.map_elem = null;
    svg_bar.html('');
  }

  bindMap(map_elem) {
    this.map_elem = map_elem;
    this.map_elem.resetColors(this.current_ids);
    this.applySelection(5);

    // TODO : define in each chart was kind of tooltip to display on the map
    // this.map_elem.target_layer.selectAll('path')
    //   .on('mouseover', () => {
    //     svg_map.select('.tooltip')
    //       .style('display', null);
    //   })
    //   .on('mouseout', () => {
    //     svg_map.select('.tooltip')
    //       .style('display', 'none');
    //   })
    //   .on('mousemove', function (d) {
    //     const tooltip = svg_map.select('.tooltip');
    //     tooltip
    //       .select('text.id_feature')
    //       .text(`${d.properties[app.current_config.id_field_geom]}`);
    //     let _ix, nb_val;
    //     for (_ix = 0, nb_val = Math.min(app.current_config.ratio.length, 5); _ix < nb_val; _ix++) {
    //       tooltip.select(`text.value_feature${_ix + 1}`)
    //         .text(`${app.current_config.ratio_pretty_name[_ix]}: ${math_round(d.properties[app.current_config.ratio[_ix]] * 10) / 10}`);
    //     }
    //     tooltip
    //       .attr('transform', `translate(${[d3.mouse(this)[0] - 5, d3.mouse(this)[1] - 45 - _ix * 12]})`);
    //   });
  }

  updateTableStats() {
    this.table_stats.removeAll();
    this.table_stats.addFeatures(this.prepareTableStat());
  }

  prepareTableStat() {
    const all_values = this.variables.map(v => this.ref_data.map(d => d[v]));
    const my_region = this.ref_data.find(d => d.id === app.current_config.my_region);
    const features = all_values.map((values, i) => ({
      Min: d3.min(values),
      Max: d3.max(values),
      Moyenne: getMean(values),
      id: this.variables[i],
      Variable: this.variables[i],
      'Ma région': my_region[this.variables[i]],
    }));
    return features;
  }

  makeTableStat() {
    this.table_stats = new TableResumeStat(this.prepareTableStat());
  }
}
