import { comp, math_round, math_abs, Rect, prepareTooltip, svgPathToCoords, getMean, getStdDev } from './../helpers';
import { color_disabled, color_countries, color_sup, color_inf, color_highlight } from './../options';
import { calcPopCompletudeSubset } from './../prepare_data';
import { svg_map } from './../map';
import { app, resetColors } from './../../main';
import TableResumeStat from './../tableResumeStat';

const svg_bar = d3.select('#svg_bar');
const margin = { top: 20, right: 40, bottom: 40, left: 40 };

const width = +svg_bar.attr('width') - margin.left - margin.right;
const height = +svg_bar.attr('height') - margin.top - margin.bottom;

/**
* Class representing a chart of "parallel coordinates".
*/
export class ParallelCoords2 {
  constructor(ref_data) {
    // Set the minimum number of variables to keep selected for this kind of chart:
    app.current_config.nb_var = 2;
    const self = this;
    this.variables = app.current_config.ratio.slice();
    this.current_level = +app.current_config.current_level;
    this.inf_level = +this.current_level + 2;
    this.plot = svg_bar.append('g')
      .attr('transform', `translate(${[margin.left, margin.top]})`);

    this.x = d3.scaleBand().rangeRound([0, width]);
    this.y = {};
    this.line = d3.line();
    // this.all_keys = this.variables;
    this.data = ref_data.filter(ft => this.variables.map(v => !!ft[v]).every(v => v === true));
    const inf_level_features = app.full_dataset.filter(ft => +ft.level === this.inf_level);
    this.data.forEach((ft) => {
      const id = ft.id;
      const children_ids = app.agg_n2.filter(d => d.NUTS1_2016 === id).map(d => d.geo);
      // const children = inf_level_features.filter(
      //   d => children_ids.indexOf(d[app.current_config.id_field]) > -1);
      const children = inf_level_features
        .filter(d => children_ids.indexOf(d[app.current_config.id_field].slice(0, 4)) > -1);

      if (children.length < 2) {
        ft.remove = true; // eslint-disable-line no-param-reassign
        return;
      }
      // Compute Relative Standard Deviation ("coefficient de variation") for each variable:
      this.variables.forEach((v) => {
        const v_name = `rsd_${v}`;
        const serie = children.map(d => +d[v]);
        const mean = getMean(serie);
        const rsd = mean / getStdDev(serie, mean);
        ft[v_name] = rsd; // eslint-disable-line no-param-reassign
      });
    });
    this.data = this.data.filter(d => !d.remove);
    this.dimensions = Object.keys(this.data[0])
      .filter(v => v.indexOf('rsd_') === 0);
    const extents = this.dimensions.map(v => d3.extent(this.data, p => +p[v]));
    const common_domain = [d3.min(extents, d => d[0]), d3.max(extents, d => d[1])];

    this.current_ids = this.data.map(d => d.id);
    this.x.domain(this.dimensions);
    this.x.rangeRound([0, width + this.x.step() * 1.5]);

    this.dimensions.forEach((d) => {
      this.y[d] = d3.scaleLinear()
        // use the same domain for each axis :
        .domain(common_domain)
        // .domain(d3.extent(this.data, p => +p[d]))
        .range([height, 0]);
    });

    this.background = this.plot.append('g')
      .attr('class', 'background')
      .selectAll('path')
      .data(this.data)
      .enter()
      .append('path')
      .attr('d', d => this.path(d))
      .attr('id', d => `f_${d.id}`);

    // const foreground = this.plot.append('g')
    //   .attr('class', 'foreground')
    //   .selectAll('path')
    //   .data(this.data)
    //   .enter()
    //   .append('path')
    //   .attr('d', d => this.path(d));

    const g = this.plot.selectAll('.dimension')
      .data(this.dimensions)
      .enter()
      .append('g')
      .attrs(d => ({
        class: 'dimension',
        transform: `translate(${this.x(d)})`,
      }));

    g.append('g')
      .attr('class', 'axis')
      .each(function (d) { d3.select(this).call(d3.axisLeft(self.y[d])); })
      .append('text')
      .styles({
        'text-anchor': 'middle',
        'font-size': '11px',
      })
      .attr('y', -5)
      .text(d => d);

    // foreground
    //   .on('mouseover', function (d) {
    //     d3.select(this).style('stroke-width', d.id === app.current_config.my_region ? 2.8 : 2);
    //     svg_bar.append('text')
    //       .attrs({
    //         id: 'id_feature',
    //         x: 75,
    //         y: self.y[self.dimensions[0]](d[self.dimensions]),
    //       });
    //   })
    //   .on('mouseout', function (d) {
    //     d3.select(this).style('stroke-width', d.id === app.current_config.my_region ? 1.7 : 1);
    //     svg_bar.select('#id_feature').remove();
    //   });
    //
    // this.plot.select(`.foreground > #f_${app.current_config.my_region}`);
    this.makeTableStat();
  }

  path(d) {
    return this.line(this.dimensions.map(p => [this.x(p), this.y[p](d[p])]));
  }

  bindMap(map_elem) {
    this.map_elem = map_elem;
    this.map_elem.resetColors(this.current_ids);
  }

  remove() {
    this.plot.remove();
    this.table_stats.remove();
    this.table_stats = null;
    this.map_elem.unbindBrushClick();
    this.map_elem = null;
    svg_bar.html('');
  }

  updateTableStats() {
    this.table_stats.removeAll();
    this.table_stats.addFeatures(this.prepareTableStat());
  }

  prepareTableStat() {
    const all_values = this.variables.map(v => this.data.map(d => d[v]));
    const my_region = this.data.find(d => d.id === app.current_config.my_region);
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

  updateChangeRegion() {
    this.changeStudyZone();
  }

  changeStudyZone() {}
}
