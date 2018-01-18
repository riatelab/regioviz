import { Rect, comp2, prepareTooltip2, svgPathToCoords, computePercentileRank, getMean, formatNumber } from './../helpers';
import { color_disabled, color_countries, color_highlight, fixed_dimension } from './../options';
import { calcPopCompletudeSubset, calcCompletudeSubset } from './../prepare_data';
import { app, variables_info, resetColors } from './../../main';
import ContextMenu from './../contextMenu';
import CompletudeSection from './../completude';
import TableResumeStat from './../tableResumeStat';

let svg_bar;
let margin;
let width;
let height;
let svg_container;
let t;

const updateDimensions = () => {
  svg_bar = d3.select('#svg_bar');
  margin = { top: 20, right: 20, bottom: 40, left: 60 };
  width = fixed_dimension.chart.width - margin.left - margin.right;
  height = fixed_dimension.chart.height - margin.top - margin.bottom;
  const width_value = document.getElementById('bar_section').getBoundingClientRect().width * 0.98;
  d3.select('.cont_svg.cchart').style('padding-top', `${(fixed_dimension.chart.height / fixed_dimension.chart.width) * width_value}px`);
  svg_container = svg_bar.append('g').attr('class', 'container');
};

/** Class representing a scatterplot */
export default class ScatterPlot2 {
  /**
   * Create a scatterplot on the `svg_bar` svg element previously defined
   * @param {Array} ref_data - A reference to the subset of the dataset to be used
   * to create the scatterplot (should contain at least two fields flagged as ratio
   * in the `app.current_config.ratio` Object).
   */
  constructor(ref_data) {
    this.brushed = () => {
      if (d3.event && !d3.event.selection) {
        if (d3.event.type === 'end' && d3.event.sourceEvent.type === 'mouseup') {
          this.map_elem.removeRectBrush();
        }
        app.colors = {};
        app.colors[app.current_config.my_region] = color_highlight;
        this.updateLight();
        this.updateMapRegio();
        return;
      }

      resetColors();
      // const self = this;
      const [topleft, bottomright] = d3.event.selection;
      const range_x = [
        this.x.invert(topleft[0]),
        this.x.invert(bottomright[0]),
      ];
      const range_y = [
        this.y.invert(bottomright[1]),
        this.y.invert(topleft[1]),
      ];
      if (this.xInversed) range_x.reverse();
      if (this.yInversed) range_y.reverse();
      range_x[0] -= 0.5;
      range_x[1] += 0.5;
      range_y[0] -= 0.5;
      range_y[1] += 0.5;
      let t1;
      let t2;
      if (this.type === 'value') {
        t1 = this.variable1;
        t2 = this.variable2;
      } else {
        t1 = this.rank_variable1;
        t2 = this.rank_variable2;
      }

      for (let i = 0, len_i = this.data.length; i < len_i; i++) {
        const ft = this.data[i];
        if (ft[t1] >= range_x[0] && ft[t1] <= range_x[1]
            && ft[t2] >= range_y[0] && ft[t2] <= range_y[1]) {
          app.colors[ft.id] = comp2(
            ft[this.variable1], ft[this.variable2],
            this.ref_value1, this.ref_value2,
            this.xInversed, this.yInversed);
        }
      }
      app.colors[app.current_config.my_region] = color_highlight;
      this.updateLight();
      this.updateMapRegio();
      this.map_elem.removeRectBrush();
    };
    updateDimensions();
    // Set the minimum number of variables to keep selected for this kind of chart:
    app.current_config.nb_var = 2;
    const self = this;
    this.type = 'value';
    this.variable1 = app.current_config.ratio[0];
    this.variable2 = app.current_config.ratio[1];
    this.rank_variable1 = `pr_${this.variable1}`;
    this.rank_variable2 = `pr_${this.variable2}`;
    this.unit1 = variables_info.find(ft => ft.id === this.variable1).unit;
    this.unit2 = variables_info.find(ft => ft.id === this.variable2).unit;
    this.pretty_name1 = app.current_config.ratio_pretty_name[0];
    this.pretty_name2 = app.current_config.ratio_pretty_name[1];
    this.data = ref_data.filter(ft => !!ft[this.variable1] && !!ft[this.variable2])
      .map((d) => {
        const res = { id: d.id, name: d.name };
        res[this.variable1] = d[this.variable1];
        res[this.variable2] = d[this.variable2];
        return res;
      });
    const tmp_my_region = this.data.splice(
      this.data.findIndex(d => d.id === app.current_config.my_region), 1)[0];
    this.data.push(tmp_my_region);
    this.current_ids = this.data.map(d => d.id);
    resetColors(this.current_ids);
    this.nbFt = this.data.length;
    computePercentileRank(this.data, this.variable1, this.rank_variable1);
    computePercentileRank(this.data, this.variable2, this.rank_variable2);

    this.x = d3.scaleLinear()
      .range([0, width])
      .nice();
    this.y = d3.scaleLinear()
      .range([height, 0])
      .nice();
    this.xAxis = d3.axisBottom(this.x).ticks(10).tickFormat(formatNumber);
    this.yAxis = d3.axisLeft(this.y).ticks(10 * height / width).tickFormat(formatNumber);
    this.xAxis2 = d3.axisBottom(this.x).ticks(10).tickFormat(formatNumber);
    this.yAxis2 = d3.axisLeft(this.y).ticks(10 * height / width).tickFormat(formatNumber);

    this.brush = d3.brush()
      .extent([[0, 0], [width, height]])
      .on('brush end', this.brushed);

    this.xInversed = false;
    this.yInversed = false;
    this.ref_value1 = tmp_my_region[this.variable1];
    this.ref_value2 = tmp_my_region[this.variable2];

    this.plot = svg_container.append('g')
      .attr('transform', `translate(${[margin.left, margin.top]})`);

    this.plot.append('defs')
      .append('svg:clipPath')
      .attr('id', 'clip')
      .append('svg:rect')
      .attrs({
        width,
        height,
        x: 0,
        y: 0,
      });

    this.scatter = this.plot.append('g')
      .attrs({
        id: 'scatterplot',
        'clip-path': 'url(#clip)',
      });

    this.scatter.append('g')
      .attr('class', 'brush')
      .call(this.brush);

    this.makeGrid();

    const groupe_line_mean = this.plot.append('g')
      .attrs({
        class: 'mean',
        'clip-path': 'url(#clip)',
      });

    // The actual red line for mean value on X axis:
    groupe_line_mean.append('line')
      .attrs({
        id: 'mean_x',
        class: 'mean_line',
        x1: this.x(this.mean_variable1),
        x2: this.x(this.mean_variable1),
        y1: 0,
        y2: width,
        'stroke-dasharray': '10, 5',
        'stroke-width': '2px',
        'clip-path': 'url(#clip)',
      })
      .style('stroke', 'red');

    // Transparent line with a larger width (to access more easily the tooltip)
    // for mean value on X axis:
    groupe_line_mean.append('line')
      .attrs({
        id: 'mean_x',
        class: 'transp_mean_line',
        x1: this.x(this.mean_variable1),
        x2: this.x(this.mean_variable1),
        y1: 0,
        y2: width,
        'stroke-width': '14px',
      })
      .style('stroke', 'transparent')
      .on('mouseover', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          this.tooltip.style('display', 'none').select('.title').attr('class', 'title').html('');
        }, 250);
      })
      .on('mouseout', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          this.tooltip.style('display', 'none').select('.title').attr('class', 'title').html('');
        }, 250);
      })
      .on('mousemove mousedown', () => {
        clearTimeout(t);
        if (self.type === 'value') {
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
          self.tooltip.select('.title')
            .attr('class', 'title red')
            .html(content.join(''));
          self.tooltip.select('.content')
            .html([`Valeur (${this.variable1}): `, formatNumber(this.mean_variable1, 1), ' ', self.unit1].join(''));
          self.tooltip
            .styles({
              display: null,
              left: `${d3.event.clientX - window.scrollX - 5}px`,
              top: `${d3.event.clientY - window.scrollY - _h}px`,
            });
        } else if (self.type === 'rank') {
          const content = ['Médiane de l\'espace d\'étude'];
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
          self.tooltip.select('.title')
            .attr('class', 'title red')
            .html(content.join(''));
          self.tooltip.select('.content')
            .html([`Valeur (${this.variable1}): `, formatNumber(this.mean_variable1, 1)].join(''));
          self.tooltip
            .styles({
              display: null,
              left: `${d3.event.clientX - window.scrollX - 5}px`,
              top: `${d3.event.clientY - window.scrollY - _h}px`,
            });
        }
      });

    // The actual red line for mean value on Y axis:
    groupe_line_mean.append('line')
      .style('stroke', 'red')
      .attrs({
        id: 'mean_y',
        class: 'mean_line',
        x1: 0,
        x2: width,
        y1: this.y(this.mean_variable2),
        y2: this.y(this.mean_variable2),
        'clip-path': 'url(#clip)',
        'stroke-dasharray': '10, 5',
        'stroke-width': '2px',
      });

    // Transparent line with a larger width (to access more easily the tooltip)
    // for mean value on Y axis:
    groupe_line_mean.append('line')
      .style('stroke', 'transparent')
      .attrs({
        id: 'mean_y',
        class: 'transp_mean_line',
        x1: 0,
        x2: width,
        y1: this.y(this.mean_variable2),
        y2: this.y(this.mean_variable2),
        'stroke-width': '14px',
      })
      .on('mouseover', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          this.tooltip.style('display', 'none').select('.title').attr('class', 'title').html('');
        }, 250);
        // this.tooltip.style('display', 'none').select('.title').attr('class', 'title red');
      })
      .on('mouseout', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          this.tooltip.style('display', 'none').select('.title').attr('class', 'title').html('');
        }, 250);
      })
      .on('mousemove mousedown', () => {
        clearTimeout(t);
        if (self.type === 'value') {
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
          self.tooltip.select('.title')
            .attr('class', 'title red')
            .html(content.join(''));
          self.tooltip.select('.content')
            .html([`Valeur (${this.variable2}): `, formatNumber(this.mean_variable2, 1), ' ', self.unit2].join(''));
          self.tooltip
            .styles({
              display: null,
              left: `${d3.event.clientX - window.scrollX - 5}px`,
              top: `${d3.event.clientY - window.scrollY - _h}px`,
            });
        } else if (self.type === 'rank') {
          const content = ['Médiane de l\'espace d\'étude'];
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
          self.tooltip.select('.title')
            .attr('class', 'title red')
            .html(content.join(''));
          self.tooltip.select('.content')
            .html([`Valeur (${this.variable2}): `, formatNumber(this.mean_variable2, 1)].join(''));
          self.tooltip
            .styles({
              display: null,
              left: `${d3.event.clientX - window.scrollX - 5}px`,
              top: `${d3.event.clientY - window.scrollY - _h}px`,
            });
        }
      });

    this.plot.append('g')
      .attrs({
        class: 'x axis', id: 'axis--x', transform: `translate(0, ${height})`,
      })
      .call(this.xAxis);

    this.plot.append('g')
      .attrs({ class: 'y axis', id: 'axis--y', opacity: 0.9 })
      .call(this.yAxis);

    // Prepare the tooltip displayed on mouseover:
    this.tooltip = prepareTooltip2(d3.select(svg_bar.node().parentElement), null);

    this.prepareTitleAxis();

    svg_container.append('image')
      .attrs({
        x: margin.left + width / 2 - 20 - svg_container.select('#title-axis-x').node().getBoundingClientRect().width / 2,
        y: margin.top + height + margin.bottom / 2 + 5,
        width: 15,
        height: 15,
        'xlink:href': 'img/reverse_plus.png',
        id: 'img_reverse_x',
      })
      .on('click', function () {
        if (!self.xInversed) {
          self.xInversed = true;
          this.setAttributeNS(d3.namespaces.xlink, 'xlink:href', 'img/reverse_moins.png');
          svg_container.select('#title-axis-x')
            .attr('title-tooltip', `${self.pretty_name1} (axe inversé)`)
            .style('fill', 'red');
        } else {
          self.xInversed = false;
          this.setAttributeNS(d3.namespaces.xlink, 'xlink:href', 'img/reverse_plus.png');
          svg_container.select('#title-axis-x')
            .attr('title-tooltip', `${self.pretty_name1})`)
            .style('fill', 'black');
        }
        if (self.last_map_selection) {
          self.map_elem.callBrush(self.last_map_selection);
        } else {
          self.update();
        }
      });

    svg_container.append('image')
      .attrs({
        x: margin.left / 3 - 20,
        y: margin.top + (height / 2) + svg_container.select('#title-axis-y').node().getBoundingClientRect().height / 2 + 5,
        width: 15,
        height: 15,
        'xlink:href': 'img/reverse_plus.png',
        id: 'img_reverse_y',
      })
      .on('click', function () {
        if (!self.yInversed) {
          self.yInversed = true;
          this.setAttributeNS(d3.namespaces.xlink, 'xlink:href', 'img/reverse_moins.png');
          svg_container.select('#title-axis-y')
            .attr('title-tooltip', `${self.pretty_name2} (axe inversé)`)
            .style('fill', 'red');
        } else {
          self.yInversed = false;
          this.setAttributeNS(d3.namespaces.xlink, 'xlink:href', 'img/reverse_plus.png');
          svg_container.select('#title-axis-y')
            .attr('title-tooltip', `${self.pretty_name2}`)
            .style('fill', 'black');
        }
        if (self.last_map_selection) {
          self.map_elem.callBrush(self.last_map_selection);
        } else {
          self.update();
        }
      });

    this.completude = new CompletudeSection();
    this.completude.update(
      calcCompletudeSubset(app, [this.variable1, this.variable2], 'array'),
      calcPopCompletudeSubset(app, [this.variable1, this.variable2]));

    // // Deactivate the rect brush selection on the map
    // // while the user press the Ctrl key:
    // document.onkeydown = (event) => {
    //   if (event && event.key === 'Control') {
    //     svg_map.select('.brush_map')
    //       .selectAll('.selection, .overlay')
    //       .style('display', 'none');
    //   }
    // };
    // // Reactivate the rect brush selection on the map
    // // when the user doesn't press the Ctrl key anymore
    // document.onkeyup = (event) => {
    //   if (event && event.key === 'Control') {
    //     svg_map.select('.brush_map')
    //       .selectAll('.selection, .overlay')
    //       .style('display', null);
    //   }
    // };

    const menu_selection = d3.select('#bar_section')
      .append('div')
      .attr('id', 'menu_selection')
      .styles({ position: 'relative', 'text-align': 'center' });

    const chart_type = menu_selection.append('p');

    chart_type.append('span')
      .attrs({
        id: 'ind_raw_values',
        class: 'choice_ind active noselect',
      })
      .text('Valeurs brutes');

    chart_type.append('span')
      .attrs({
        id: 'ind_ranks',
        class: 'choice_ind noselect',
      })
      .text('Rangs normalisés');

    menu_selection.append('p')
      .attr('id', 'selection_subtitle')
      .styles({ margin: '10px 0px 2px 0px' })
      .html('Sur les deux indicateurs, sélection des régions ayant des valeurs...');

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


    this.bindMenu();
    // this.update();
    this.makeTableStat();
  }

  /**
   * Create the underlying grey grid
   */
  makeGrid() {
    this.plot.insert('g', '#scatterplot')
      .attrs({
        class: 'grid grid-x', transform: `translate(0, ${height})`,
      })
      .call(this.xAxis2
        .tickSize(-height)
        .tickFormat(''));
    this.plot.insert('g', '#scatterplot')
      .attr('class', 'grid grid-y')
      .call(this.yAxis2
        .tickSize(-width)
        .tickFormat(''));
  }


  updateAxisGrid() {
    this.plot.select('.grid-x')
      .transition()
      .duration(125)
      .call(this.xAxis2.tickSize(-height).tickFormat(''));
    this.plot.select('.grid-y')
      .transition()
      .duration(125)
      .call(this.yAxis2.tickSize(-width).tickFormat(''));
    this.plot.select('#axis--x')
      .transition()
      .duration(125)
      .call(this.xAxis);
    this.plot.select('#axis--y')
      .transition()
      .duration(125)
      .call(this.yAxis);
    this.plot.selectAll('.grid')
      .selectAll('line')
      .attr('stroke', 'lightgray');
  }

  /**
   * Create the title of the X and Y axis with the associated context menu
   * displayed when they are clicked and allowing to select an other variable
   * for this axis.
   */
  prepareTitleAxis() {
    const self = this;
    this.menuX = new ContextMenu();
    this.menuY = new ContextMenu();
    this.itemsX = app.current_config.ratio.filter(elem => elem !== this.variable2)
      .map(elem => ({
        name: elem,
        action: () => this.changeVariableX(elem),
      }));
    this.itemsY = app.current_config.ratio.filter(elem => elem !== this.variable1)
      .map(elem => ({
        name: elem,
        action: () => this.changeVariableY(elem),
      }));

    svg_container.append('text')
      .attrs({
        id: 'title-axis-x',
        class: 'title-axis noselect',
        x: margin.left + width / 2,
        y: margin.top + height + margin.bottom / 2 + 15,
        'title-tooltip': this.pretty_name1,
      })
      .html(`${this.variable1}  &#x25BE;`)
      .on('click', function () {
        const bbox = this.getBoundingClientRect();
        if (self.menuY.displayed) {
          self.menuY.hideMenu();
        }
        self.menuX.showMenu(d3.event, document.body, self.itemsX, [bbox.left - 20, bbox.top + 20]);
      });

    svg_container.append('text')
      .attrs({
        id: 'title-axis-y',
        class: 'title-axis noselect',
        x: margin.left / 3,
        y: margin.top + (height / 2) - 10,
        transform: `rotate(-90, ${margin.left / 3}, ${margin.top + (height / 2)})`,
        'title-tooltip': this.pretty_name2,
      })
      .html(`${this.variable2}  &#x25BE;`)
      .on('click', function () {
        const bbox = this.getBoundingClientRect();
        if (self.menuX.displayed) {
          self.menuX.hideMenu();
        }
        self.menuY.showMenu(d3.event, document.body, self.itemsY, [bbox.left, bbox.bottom + 10]);
      });
  }

  updateLight() {
    const default_color = 'gray';
    this.scatter.selectAll('.dot')
      .transition()
      .duration(125)
      .styles(d => ({
        fill: app.colors[d.id] || default_color,
        stroke: app.colors[d.id] ? 'rgb(97, 97, 97)' : 'rgb(206, 206, 206)',
      }));
  }

  update() {
    const self = this;
    const data = self.data;
    const dots = this.scatter.selectAll('.dot')
      .data(data, d => d.id);

    if (this.type === 'rank') {
      const rank_variable1 = this.rank_variable1;
      const rank_variable2 = this.rank_variable2;
      const range_x = this.xInversed ? [101, -1] : [-1, 101];
      const range_y = this.yInversed ? [101, -1] : [-1, 101];
      // const range_x = this.xInversed
      //   ? d3.extent(data, d => d[rank_variable1]).reverse()
      //   : d3.extent(data, d => d[rank_variable1]);
      // const range_y = this.yInversed
      //   ? d3.extent(data, d => d[rank_variable2]).reverse()
      //   : d3.extent(data, d => d[rank_variable2]);
      // const serie_x = data.map(d => d[this.variable1]);
      // const serie_y = data.map(d => d[this.variable2]);
      this.x.domain(range_x);
      this.y.domain(range_y);
      this.mean_variable1 = 50;
      this.mean_variable2 = 50;

      const x = this.x;
      const y = this.y;
      const default_color = 'gray';

      dots
        .transition()
        .duration(125)
        .attrs(d => ({
          r: 5,
          cx: x(d[rank_variable1]),
          cy: y(d[rank_variable2]),
        }))
        .styles(d => ({
          fill: app.colors[d.id] || default_color,
          stroke: app.colors[d.id] ? 'rgb(97, 97, 97)' : 'rgb(206, 206, 206)',
        }))
        .on('end', () => {
          self.bindTooltips(true);
        });

      dots.enter()
        .append('circle')
        .transition()
        .duration(125)
        .styles(d => ({
          fill: app.colors[d.id] || default_color,
          stroke: app.colors[d.id] ? 'rgb(97, 97, 97)' : 'rgb(206, 206, 206)',
        }))
        .attrs(d => ({
          r: 5,
          cx: x(d[rank_variable1]),
          cy: y(d[rank_variable2]),
          class: 'dot',
        }))
        .on('end', () => {
          self.bindTooltips(true);
        });
      dots.exit().transition().duration(125).remove();
    } else if (this.type === 'value') {
      const variable1 = this.variable1;
      const variable2 = this.variable2;
      const serie_x = data.map(d => d[variable1]);
      const serie_y = data.map(d => d[variable2]);
      const range_x = this.xInversed
        ? d3.extent(serie_x).reverse()
        : d3.extent(serie_x);
      const range_y = this.yInversed
        ? d3.extent(serie_y).reverse()
        : d3.extent(serie_y);
      this.x.domain(range_x).nice();
      this.y.domain(range_y).nice();
      this.mean_variable1 = getMean(serie_x);
      this.mean_variable2 = getMean(serie_y);

      const x = this.x;
      const y = this.y;
      const default_color = 'gray';

      dots
        .transition()
        .duration(125)
        .attrs(d => ({
          r: 5,
          cx: x(d[variable1]),
          cy: y(d[variable2]),
        }))
        .styles(d => ({
          fill: app.colors[d.id] || default_color,
          stroke: app.colors[d.id] ? 'rgb(97, 97, 97)' : 'rgb(206, 206, 206)',
        }))
        .on('end', () => {
          self.bindTooltips(false);
        });

      dots.enter()
        .append('circle')
        .transition()
        .duration(125)
        .styles(d => ({
          fill: app.colors[d.id] || default_color,
          stroke: app.colors[d.id] ? 'rgb(97, 97, 97)' : 'rgb(206, 206, 206)',
        }))
        .attrs(d => ({
          r: 5,
          cx: x(d[variable1]),
          cy: y(d[variable2]),
          class: 'dot',
        }))
        .on('end', () => {
          self.bindTooltips(false);
        });
      dots.exit().transition().duration(125).remove();
    }
    dots.order();
    this.updateMeanMedianValue();
    this.updateAxisGrid();
  }

  updateCompletude() {
    this.completude.update(
      calcCompletudeSubset(app, [this.variable1, this.variable2], 'array'),
      calcPopCompletudeSubset(app, [this.variable1, this.variable2]));
  }

  updateMapRegio() {
    if (!this.map_elem) return;
    this.map_elem.target_layer.selectAll('path')
      .attr('fill', d => (this.current_ids.indexOf(d.id) > -1
        ? (app.colors[d.id] || color_countries)
        : color_disabled));
  }

  handle_brush_map(event) {
    if (!event || !event.selection) {
      this.last_map_selection = undefined;
      return;
    }
    this.map_elem.tooltip.style('display', 'none');
    svg_container.select('.brush').call(this.brush.move, null);
    const self = this;
    const [topleft, bottomright] = event.selection;
    this.last_map_selection = [topleft, bottomright];
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
            const value1 = d.properties[self.variable1];
            const value2 = d.properties[self.variable2];
            const color = comp2(
              value1, value2,
              self.ref_value1, self.ref_value2,
              self.xInversed, self.yInversed);
            app.colors[id] = color;
            return color;
          }
        }
        return color_countries;
      });
    self.updateLight();
  }

  bindTooltips(with_rank) {
    const self = this;
    this.scatter.selectAll('.dot')
      .on('mouseover.tooltip', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          this.tooltip.style('display', 'none').select('.title').attr('class', 'title').html('');
        }, 250);
        // clearTimeout(t);
        // self.tooltip.style('display', null).select('.title').attr('class', 'title');
      })
      .on('mousemove.tooltip', (d) => {
        clearTimeout(t);
        self.tooltip.select('.title')
          .attr('class', d.id === app.current_config.my_region ? 'title myRegion' : 'title')
          .html([d.name, ' (', d.id, ')'].join(''));
        let yoffset;
        if (with_rank) {
          self.tooltip.select('.content')
            .html([
              `${self.variable1} (rang) : ${formatNumber(d[self.rank_variable1], 1)}/100`,
              `${self.variable1} (valeur) : ${formatNumber(d[self.variable1], 1)} ${self.unit1}`,
              `${self.variable2} (rang) : ${formatNumber(d[self.rank_variable2], 1)}/100`,
              `${self.variable2} (valeur) : ${formatNumber(d[self.variable2], 1)} ${self.unit2}`,
            ].join('<br>'));
          yoffset = 120;
        } else {
          self.tooltip.select('.content')
            .html([
              `${self.variable1} (valeur) : ${formatNumber(d[self.variable1], 1)} ${self.unit1}`,
              `${self.variable2} (valeur) : ${formatNumber(d[self.variable2], 1)} ${self.unit2}`,
            ].join('<br>'));
          yoffset = 85;
        }
        // const b = self.tooltip.node().getBoundingClientRect();
        self.tooltip
          .styles({
            display: null,
            left: `${d3.event.clientX - window.scrollX - 5}px`,
            top: `${d3.event.clientY - window.scrollY - yoffset}px` });
      })
      .on('mouseout.tooltip', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          this.tooltip.style('display', 'none').select('.title').attr('class', 'title').html('');
        }, 250);
      });
  }

  handleClickMap(d, parent) {
    const id = d.id;
    if (this.current_ids.indexOf(id) < 0 || id === app.current_config.my_region) return;
    if (app.colors[id] !== undefined) {
      // Change its color in the global colors object:
      app.colors[id] = undefined;
      // Change the color on the map:
      d3.select(parent).attr('fill', color_countries);
    } else {
      const value1 = d.properties[this.variable1];
      const value2 = d.properties[this.variable2];
      const color = comp2(
        value1, value2,
        this.ref_value1, this.ref_value2,
        this.xInversed, this.yInversed);
      app.colors[id] = color;
      // Change the color on the map:
      d3.select(parent).attr('fill', color);
      // Add the clicked feature on the colored selection on the chart:
    }
    this.updateLight();
  }

  updateMeanMedianValue() {
    if (this.type === 'value') {
      this.mean_variable1 = getMean(this.data.map(d => d[this.variable1]));
      this.mean_variable2 = getMean(this.data.map(d => d[this.variable2]));
    } else if (this.type === 'rank') {
      // this.mean_variable1 = _getPR(
      //   getMean(this.data.map(d => d[this.variable1])), this.data.map(d => d[this.variable1]));
      // this.mean_variable2 = _getPR(
      //   getMean(this.data.map(d => d[this.variable2])), this.data.map(d => d[this.variable2]));
      this.mean_variable1 = 50;
      this.mean_variable2 = 50;
    }
    const grp_mean = this.plot.select('g.mean');
    grp_mean.selectAll('#mean_x.mean_line, #mean_x.transp_mean_line')
      .transition()
      .duration(125)
      .attrs({
        x1: this.x(this.mean_variable1),
        x2: this.x(this.mean_variable1),
      });
    grp_mean.selectAll('#mean_y.mean_line, #mean_y.transp_mean_line')
      .transition()
      .duration(125)
      .attrs({
        y1: this.y(this.mean_variable2),
        y2: this.y(this.mean_variable2),
      });
  }

  updateChangeRegion() {
    if (app.current_config.filter_key !== undefined) {
      this.changeStudyZone();
    } else {
      const tmp_my_region = this.data.splice(
        this.data.findIndex(d => d.id === app.current_config.my_region), 1)[0];
      this.data.push(tmp_my_region);
      this.ref_value1 = tmp_my_region[this.variable1];
      this.ref_value2 = tmp_my_region[this.variable2];
      this.map_elem.removeRectBrush();
      this.map_elem.updateLegend();
      this.map_elem.resetColors(this.current_ids);
      this.update();
    }
  }

  changeStudyZone() {
    // Fetch the new data subset for this study zone and theses variables:
    this.data = app.current_data.filter(ft => !!ft[this.variable1] && !!ft[this.variable2])
      .map((d) => {
        const res = { id: d.id, name: d.name };
        res[this.variable1] = d[this.variable1];
        res[this.variable2] = d[this.variable2];
        return res;
      });
    // Put "my region" at the end of the serie so it will be displayed on
    // the top of the chart:
    const tmp_my_region = this.data.splice(
      this.data.findIndex(d => d.id === app.current_config.my_region), 1)[0];
    this.data.push(tmp_my_region);

    this.current_ids = this.data.map(d => d.id);
    resetColors();
    this.nbFt = this.data.length;
    computePercentileRank(this.data, this.variable1, this.rank_variable1);
    computePercentileRank(this.data, this.variable2, this.rank_variable2);

    // Reset the axis orientation:
    this.xInversed = false;
    this.yInversed = false;

    // Store the value of my region for the two selected variables:
    this.ref_value1 = tmp_my_region[this.variable1];
    this.ref_value2 = tmp_my_region[this.variable2];

    this.map_elem.removeRectBrush();
    this.updateItemsCtxMenu();
    this.updateMapRegio();
    this.updateTableStat();
    this.updateCompletude();
    this.update();
  }

  changeVariableX(code_variable) {
    this.variable1 = code_variable;
    this.rank_variable1 = `pr_${this.variable1}`;
    const var_info = variables_info.find(ft => ft.id === code_variable);
    this.pretty_name1 = var_info.name;
    this.unit1 = var_info.unit;
    svg_container.select('#title-axis-x')
      .attr('title-tooltip', this.pretty_name1)
      .html(`${code_variable} &#x25BE;`);
    // TODO: Also change the position of the button alowing to inverse the serie
    this.updateItemsCtxMenu();
    this.data = app.current_data.filter(ft => !!ft[this.variable1] && !!ft[this.variable2])
      .map((d) => {
        const res = { id: d.id, name: d.name };
        res[this.variable1] = d[this.variable1];
        res[this.variable2] = d[this.variable2];
        return res;
      });
    const tmp_my_region = this.data.splice(
      this.data.findIndex(d => d.id === app.current_config.my_region), 1)[0];
    this.data.push(tmp_my_region);

    this.current_ids = this.data.map(d => d.id);
    resetColors();
    this.nbFt = this.data.length;
    computePercentileRank(this.data, this.variable1, this.rank_variable1);
    computePercentileRank(this.data, this.variable2, this.rank_variable2);
    this.ref_value1 = tmp_my_region[this.variable1];
    this.updateCompletude();
    this.updateMapRegio();
    this.updateTableStat();
    this.update();
  }

  changeVariableY(code_variable) {
    this.variable2 = code_variable;
    this.rank_variable2 = `pr_${this.variable2}`;
    const var_info = variables_info.find(ft => ft.id === code_variable);
    this.pretty_name2 = var_info.name;
    this.unit2 = var_info.unit;
    svg_container.select('#title-axis-y')
      .attr('title-tooltip', this.pretty_name2)
      .html(`${code_variable} &#x25BE;`);
    // TODO: Also change the position of the button alowing to inverse the serie
    this.updateItemsCtxMenu();
    this.data = app.current_data.filter(ft => !!ft[this.variable1] && !!ft[this.variable2])
      .map((d) => {
        const res = { id: d.id, name: d.name };
        res[this.variable1] = d[this.variable1];
        res[this.variable2] = d[this.variable2];
        return res;
      });

    const tmp_my_region = this.data.splice(
      this.data.findIndex(d => d.id === app.current_config.my_region), 1)[0];
    this.data.push(tmp_my_region);

    this.current_ids = this.data.map(d => d.id);
    resetColors();
    this.nbFt = this.data.length;
    computePercentileRank(this.data, this.variable1, this.rank_variable1);
    computePercentileRank(this.data, this.variable2, this.rank_variable2);
    this.ref_value2 = tmp_my_region[this.variable2];
    this.updateCompletude();
    this.updateMapRegio();
    this.updateTableStat();
    this.update();
  }

  updateItemsCtxMenu() {
    this.itemsX = app.current_config.ratio.filter(elem => elem !== this.variable2)
      .map(elem => ({
        name: elem,
        action: () => this.changeVariableX(elem),
      }));
    this.itemsY = app.current_config.ratio.filter(elem => elem !== this.variable1)
      .map(elem => ({
        name: elem,
        action: () => this.changeVariableY(elem),
      }));
  }

  addVariable(code_variable) {
    this.itemsX.push({
      name: code_variable,
      action: () => this.changeVariableX(code_variable),
    });
    this.itemsY.push({
      name: code_variable,
      action: () => this.changeVariableY(code_variable),
    });
  }

  removeVariable(code_variable) {
    // Remove the variable from the X and Y list of items:
    for (let i = this.itemsX.length - 1; i > -1; i--) {
      if (this.itemsX[i].name === code_variable) {
        this.itemsX.splice(i, 1);
        break;
      }
    }
    for (let i = this.itemsY.length - 1; i > -1; i--) {
      if (this.itemsY[i].name === code_variable) {
        this.itemsY.splice(i, 1);
        break;
      }
    }

    // If the variable to remove was currently used for drawing this chart,
    // set a new variable for this axis and redraw the chart:
    if (code_variable === this.variable1) {
      const new_var_x = this.itemsX.filter(ft => ft.name !== this.variable2)[0].name;
      this.changeVariableX(new_var_x);
    } else if (code_variable === this.variable2) {
      const new_var_y = this.itemsY.filter(ft => ft.name !== this.variable1)[0].name;
      this.changeVariableY(new_var_y);
    }
  }

  remove() {
    this.table_stats.remove();
    this.map_elem.unbindBrushClick();
    this.map_elem = null;
    svg_bar.text('').html('');
  }

  bindMap(map_elem) {
    this.map_elem = map_elem;
    this.map_elem.displayLegend(1);
    this.updateMapRegio();
    this.update();
  }

  bindMenu() {
    const self = this;
    const menu = d3.select('#menu_selection');

    menu.select('#ind_raw_values')
      .on('click', function () {
        if (this.classList.contains('active')) {
          return;
        }
        self.type = 'value';
        this.classList.add('active');
        menu.select('#ind_ranks').attr('class', 'choice_ind noselect');
        menu.select('#btn_above_mean').text('inférieures à la moyenne');
        menu.select('#btn_below_mean').text('supérieures à la moyenne');
        self.update();
      });

    menu.select('#ind_ranks')
      .on('click', function () {
        if (this.classList.contains('active')) {
          return;
        }
        self.type = 'rank';
        this.classList.add('active');
        menu.select('#ind_raw_values').attr('class', 'choice_ind noselect');
        menu.select('#btn_above_mean').text('inférieures à la médianne');
        menu.select('#btn_below_mean').text('supérieures à la médianne');
        self.update();
      });
  }

  selectBelowMean() {
    const mean1 = getMean(this.data.map(ft => ft[this.variable1]));
    const mean2 = getMean(this.data.map(ft => ft[this.variable2]));
    svg_container.select('.brush').call(this.brush.move, null);
    app.colors = {};
    for (let i = 0, len_i = this.data.length; i < len_i; i++) {
      const ft = this.data[i];
      if (ft[this.variable1] < mean1 && ft[this.variable2] < mean2) {
        app.colors[ft.id] = comp2(
          ft[this.variable1], ft[this.variable2],
          this.ref_value1, this.ref_value2,
          this.xInversed, this.yInversed);
      }
    }
    app.colors[app.current_config.my_region] = color_highlight;
    this.updateLight();
    this.updateMapRegio();
    this.map_elem.removeRectBrush();
  }

  selectBelowMyRegion() {
    svg_container.select('.brush').call(this.brush.move, null);
    app.colors = {};
    for (let i = 0, len_i = this.data.length; i < len_i; i++) {
      const ft = this.data[i];
      if (ft[this.variable1] <= this.ref_value1 && ft[this.variable2] <= this.ref_value2) {
        app.colors[ft.id] = comp2(
          ft[this.variable1], ft[this.variable2],
          this.ref_value1, this.ref_value2,
          this.xInversed, this.yInversed);
      }
    }
    app.colors[app.current_config.my_region] = color_highlight;
    this.updateLight();
    this.updateMapRegio();
    this.map_elem.removeRectBrush();
  }

  selectAboveMean() {
    const mean1 = getMean(this.data.map(ft => ft[this.variable1]));
    const mean2 = getMean(this.data.map(ft => ft[this.variable2]));
    svg_container.select('.brush').call(this.brush.move, null);
    app.colors = {};
    for (let i = 0, len_i = this.data.length; i < len_i; i++) {
      const ft = this.data[i];
      if (ft[this.variable1] > mean1 && ft[this.variable2] > mean2) {
        app.colors[ft.id] = comp2(
          ft[this.variable1], ft[this.variable2],
          this.ref_value1, this.ref_value2,
          this.xInversed, this.yInversed);
      }
    }
    app.colors[app.current_config.my_region] = color_highlight;
    this.updateLight();
    this.updateMapRegio();
    this.map_elem.removeRectBrush();
  }

  selectAboveMyRegion() {
    svg_container.select('.brush').call(this.brush.move, null);
    app.colors = {};
    for (let i = 0, len_i = this.data.length; i < len_i; i++) {
      const ft = this.data[i];
      if (ft[this.variable1] >= this.ref_value1 && ft[this.variable2] >= this.ref_value2) {
        app.colors[ft.id] = comp2(
          ft[this.variable1], ft[this.variable2],
          this.ref_value1, this.ref_value2,
          this.xInversed, this.yInversed);
      }
    }
    app.colors[app.current_config.my_region] = color_highlight;
    this.updateLight();
    this.updateMapRegio();
    this.map_elem.removeRectBrush();
  }

  prepareTableStat() {
    const values1 = this.data.map(d => d[this.variable1]);
    const values2 = this.data.map(d => d[this.variable2]);
    const features = [
      {
        Min: d3.min(values1),
        Max: d3.max(values1),
        Moy: getMean(values1),
        Med: d3.median(values1),
        id: this.variable1,
        Variable: this.variable1,
        'Ma région': this.ref_value1,
      },
      {
        Min: d3.min(values2),
        Max: d3.max(values2),
        Moy: getMean(values2),
        Med: d3.median(values2),
        id: this.variable2,
        Variable: this.variable2,
        'Ma région': this.ref_value2,
      }];
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

  getHelpMessage() {
    return `
<h3>Position  - 2 indicateurs</h3>

<b>Aide générale</b>
Ce graphique bidimensionnel représente la position de l’unité territoriale de référence sur deux indicateurs pour un espace d’étude et un maillage territorial d’analyse donné. La valeur de l’unité territoriale de référence apparaît en surbrillance (jaune). Les lignes représentées par un tireté rouge représentent la moyenne de l’espace d’étude pour chacun des indicateurs sélectionnés (non pondérée).

Sur le graphique et la carte, les unités territoriales qui disposent de valeurs supérieures à la unité territoriale de référence pour les deux indicateurs sont représentées en vert. Les unités territoriales caractérisées par des valeurs inférieures à l’unité territoriale de référence pour les deux indicateurs sont représentées en rouge. Celles qui sont supérieures pour l’indicateur représenté sur l’axe des abscisses et inférieur sur l’axe des ordonnées sont représentées en orange ; et violet à l’inverse. Sur ce graphique, il est possible d’inverser l’ordre de classement de l’indicateur (appuyer sur le « + ») : les valeurs minimales seront alors considérées comme maximale sur l’axe.

Par défaut, ce graphique est exprimé dans les valeurs brutes de l’indicateur (pourcentage par exemple). En sélectionnant l’option «valeurs de rang », l’indicateur est normalisé de 0 (valeur minimale) à 100 (valeur maximale). L’utilisation possible de ce type de transformation est la suivante : une unité territoriale disposant d’un indice de 67 sur un indicateur signifie que 33 % des unités territoriales de l’espace d’étude sont caractérisées par des valeurs supérieures à l’unité territoriale de référence pour les indicateurs sélectionnés. Et réciproquement. Les valeurs de rang permettent notamment de rendre comparables des unités de mesure et des paramètres de dispersion de deux indicateurs. Il ne faut néanmoins pas omettre que cette transformation nuit à la restitution de la dispersion statistique effective des indicateurs.`;
  }
}
