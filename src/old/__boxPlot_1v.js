import { comp, math_round, math_abs, Rect, PropSizer, prepareTooltip, svgPathToCoords, getMean } from './../helpers';
import { color_disabled, color_countries, color_sup, color_inf, color_highlight } from './../options';
import { calcPopCompletudeSubset } from './../prepare_data';
import { svg_map } from './../map';
import { app, variables_info, resetColors } from './../../main';
import TableResumeStat from './../tableResumeStat';

const svg_bar = d3.select('#svg_bar');
const margin = { top: 20, right: 20, bottom: 40, left: 30 };

const width = +svg_bar.attr('width') - margin.left - margin.right,
  height = +svg_bar.attr('height') - margin.top - margin.bottom;

const boxQuartiles = values => [
  d3.quantile(values, 0.25), d3.quantile(values, 0.5), d3.quantile(values, 0.75),
];

/**
* Class representing a chart of "parallel coordinates".
*/
export class BoxPlot1 {
  constructor(ref_data) {
    // Set the minimum number of variables to keep selected for this kind of chart:
    app.current_config.nb_var = 1;
    const self = this;
    this.ratio_to_use = app.current_config.ratio[0];
    this.current_level = +app.current_config.current_level;
    this.inf_level = +this.current_level + 2;
    this.plot = svg_bar.append('g')
      .attr('transform', `translate(${[margin.left, margin.top]})`);

    this.ref_data = ref_data.filter(ft => !!ft[this.ratio_to_use]);
    const inf_level_features = app.full_dataset.filter(ft => +ft.level === this.inf_level);
    let _all_values = [];
    this.data = [];
    this.ref_data.forEach((ft) => {
      const id = ft.id;
      const children_ids = app.agg_n2
        .filter(d => d.NUTS1_2016 === id)
        .map(d => d.geo);
      const children = inf_level_features
        .filter(d => children_ids.indexOf(d[app.current_config.id_field].slice(0, 4)) > -1)
        .map(d => +d[this.ratio_to_use]);
      console.log(children);
      if (children.length < 2) {
        ft.remove = true; // eslint-disable-line no-param-reassign
        return;
      }
      children.sort((a, b) => a - b);
      const record = {
        id: id,
        counts: children,
        quartile: boxQuartiles(children),
        whiskers: [d3.min(children), d3.max(children)],
        color: id === app.current_config.my_region ? color_highlight : color_countries,
      };
      _all_values = _all_values.concat(children);
      this.data.push(record);
    });

    this.data.sort((a, b) => a.quartile[1] - b.quartile[1]);
    this.current_ids = this.data.map(d => d.id);
    const min = d3.min(_all_values) - 5;
    const max = d3.max(_all_values) + 5;
    const xScale = d3.scaleBand()
      .domain(this.data.map(d => d.id))
      .range([0, width])
      .padding(1);
    const yScale = d3.scaleLinear()
      .domain([min, max])
      .range([height, 0]);

    let max_nb_ft = this.data.map(d => d.counts.length);
    max_nb_ft.sort((a, b) => a - b);
    max_nb_ft = max_nb_ft[max_nb_ft.length - 1];
    const barWidth = xScale.step() - 1;
    const get_bar_width = nb_ft => (barWidth * nb_ft) / max_nb_ft;

    this.plot = svg_bar.append('g')
      .attr('transform', `translate(${[margin.left, margin.top]})`);
    this.plot.append('g')
      .attrs({ class: 'axis axis--x', transform: `translate(10, ${height})` })
      .call(d3.axisBottom(xScale));
    this.plot.append('g')
      .attrs({ class: 'axis axis--y', transform: 'translate(10, 0)' })
      .call(d3.axisLeft(yScale));

    this.g_box = this.plot.append('g')
      .attr('transform', 'translate(10, 0)');

    this.vertical_lines = this.g_box.selectAll('.vertical_lines')
      .data(this.data)
      .enter()
      .append('line')
      .attrs(d => ({
        x1: xScale(d.id) + get_bar_width(d.counts.length) / 2,
        y1: yScale(d.whiskers[0]),
        x2: xScale(d.id) + get_bar_width(d.counts.length) / 2,
        y2: yScale(d.whiskers[1]),
        stroke: '#000',
        'stroke-width': 0.5,
        fill: 'none',
      }));

    this.g_box.selectAll('rect')
      .data(this.data)
      .enter()
      .append('rect')
      .attrs(d => ({
        width: get_bar_width(d.counts.length),
        height: yScale(d.quartile[0]) - yScale(d.quartile[2]),
        x: xScale(d.id),
        y: yScale(d.quartile[2]),
        fill: d.color,
        stroke: '#000',
        'stroke-width': 0.5,
      }));

    const horizontalLineConfigs = [
      {
        x1: datum => xScale(datum.id),
        y1: datum => yScale(datum.whiskers[1]),
        x2: datum => xScale(datum.id) + get_bar_width(datum.counts.length),
        y2: datum => yScale(datum.whiskers[1]),
      },
      {
        x1: datum => xScale(datum.id),
        y1: datum => yScale(datum.quartile[1]),
        x2: datum => xScale(datum.id) + get_bar_width(datum.counts.length),
        y2: datum => yScale(datum.quartile[1]),
      },
      {
        x1: datum => xScale(datum.id),
        y1: datum => yScale(datum.whiskers[0]),
        x2: datum => xScale(datum.id) + get_bar_width(datum.counts.length),
        y2: datum => yScale(datum.whiskers[0]),
      },
    ];
    for (let i = 0; i < horizontalLineConfigs.length; i++) {
      const lineConfig = horizontalLineConfigs[i];
      const horizontalLine = this.g_box
        .selectAll('.whiskers')
        .data(this.data)
        .enter()
        .append('line')
        .attrs({
          x1: lineConfig.x1,
          y1: lineConfig.y1,
          x2: lineConfig.x2,
          y2: lineConfig.y2,
          stroke: '#000',
          'stroke-width': 0.5,
          fill: 'none',
        });
    }
    this.plot.select('.axis--x')
      .selectAll('text')
      .styles({
        'text-anchor': 'end',
        'font-size': '9px',
      })
      .attrs({
        dx: '-0.8em',
        dy: '0.15em',
        transform: 'rotate(-65)',
      });
    this.makeTableStat();
  }

  addVariable(code_variable, name_variable) {
  }

  removeVariable(code_variable) {
  }

  changeVariable(code_variable) {
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
      Moyenne: getMean(values),
      id: this.ratio_to_use,
      Variable: this.ratio_to_use,
      'Ma région': this.ref_value,
    };
  }

  makeTableStat() {
    const feature = this.prepareTableStat();
    this.table_stats = new TableResumeStat([feature]);
  }
}
