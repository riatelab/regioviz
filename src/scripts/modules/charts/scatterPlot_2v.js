import {
  Rect, comp2, svgPathToCoords, computePercentileRank, getMean2,
  getNameStudyZone, getScrollValue, execWithWaitingOverlay,
  formatNumber, svgContextMenu, PropSizer,
  isContextMenuDisplayed, math_min, math_max,
  getElementsFromPoint,
} from './../helpers';
import { color_disabled, color_countries, color_highlight, fixed_dimension } from './../options';
import { calcPopCompletudeSubset, calcCompletudeSubset } from './../prepare_data';
import { app, variables_info, resetColors, territorial_mesh } from './../../main';
import ContextMenu from './../contextMenu';
import CompletudeSection from './../completude';
import TableResumeStat from './../tableResumeStat';
import { prepareTooltip } from './../tooltip';

let svg_bar;
let margin;
let width;
let height;
let svg_container;
let t;

const updateDimensions = () => {
  svg_bar = d3.select('svg#svg_bar')
    .attr('viewBox', `-5 0 ${fixed_dimension.chart.width} ${fixed_dimension.chart.height}`)
    .on('contextmenu', () => { svgContextMenu(app.chart, svg_bar, app.map, Object.keys(app.colors)); })
    .on('wheel', () => { d3.event.preventDefault(); });
  margin = {
    top: 20,
    right: 20,
    bottom: 40,
    left: 60,
  };
  width = fixed_dimension.chart.width - margin.left - margin.right;
  height = fixed_dimension.chart.height - margin.top - margin.bottom;
  const width_value = document.getElementById('bar_section').getBoundingClientRect().width * 0.98;
  d3.select('.cont_svg.cchart')
    .style('padding-top', `${(fixed_dimension.chart.height / fixed_dimension.chart.width) * width_value}px`);
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
      if (!d3.event || (d3.event && !d3.event.selection)) {
        if (d3.event && d3.event.type === 'end' && d3.event.sourceEvent && d3.event.sourceEvent.type === 'mouseup') {
          app.map.removeRectBrush();
        }
        // app.map.removeRectBrush();
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
      range_x[0] -= 0.5 / this.k;
      range_x[1] += 0.5 / this.k;
      range_y[0] -= 0.5 / this.k;
      range_y[1] += 0.5 / this.k;
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
            this.xInversed, this.yInversed,
          );
        }
      }
      app.colors[app.current_config.my_region] = color_highlight;
      this.updateLight();
      this.updateMapRegio();
      app.map.removeRectBrush();
    };
    this._id = Symbol('ScatterPlot2');
    updateDimensions();
    // Set the minimum number of variables to keep selected for this kind of chart:
    app.current_config.nb_var = 2;
    const self = this;
    const pop_field = app.current_config.pop_field;
    this.type = 'value';
    this.proportionnal_symbols = false;
    this.variable1 = app.current_config.ratio[0];
    this.variable2 = app.current_config.ratio[1];
    this.rank_variable1 = `pr_${this.variable1}`;
    this.rank_variable2 = `pr_${this.variable2}`;
    this.unit1 = variables_info.find(ft => ft.id === this.variable1).unit;
    this.unit2 = variables_info.find(ft => ft.id === this.variable2).unit;
    this.pretty_name1 = app.current_config.ratio_pretty_name[0];
    this.pretty_name2 = app.current_config.ratio_pretty_name[1];

    this.data = ref_data.filter(ft => !!ft[this.variable1] && !!ft[this.variable2]).slice();
    this.data.sort((a, b) => b[pop_field] - a[pop_field]);
    const tmp_my_region = this.data.splice(
      this.data.findIndex(d => d.id === app.current_config.my_region),
      1,
    )[0];
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
    this.k = 1;
    this.xAxis = d3.axisBottom(this.x)
      .ticks(this.mean_variable1 >= 10000 ? 5 : 10)
      .tickFormat(formatNumber);
    this.yAxis = d3.axisLeft(this.y)
      .ticks(10 * height / width)
      .tickFormat(formatNumber);
    this.xAxis2 = d3.axisBottom(this.x)
      .ticks(this.mean_variable1 >= 10000 ? 5 : 10)
      .tickFormat(formatNumber);
    this.yAxis2 = d3.axisLeft(this.y)
      .ticks(10 * height / width)
      .tickFormat(formatNumber);

    this.brush = d3.brush()
      .extent([[0, 0], [width, height]])
      .on('brush end', this.brushed);

    this.zoom = d3.zoom()
      .scaleExtent([1, 6])
      .translateExtent([[-50, -50], [width + 50, height + 50]])
      .on('zoom', () => { this.zoomed(d3.event.transform); });

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
      }).on('dblclick', () => {
        this.resetZoom();
      });

    this.scatter.append('g')
      .attr('class', 'brush')
      .call(this.brush)
      .call(this.zoom);


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
        'stroke-width': 2,
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
        'stroke-width': 14,
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
        if (isContextMenuDisplayed()) return;
        const { scrollX, scrollY } = getScrollValue();
        if (self.type === 'value') {
          const content = ['Moyenne de l\'espace d\'étude'];
          let _h = 65;
          if (app.current_config.my_category) {
            content.push('<br>', ' (', app.current_config.my_category, ')');
            _h += 20;
          } else if (app.current_config.filter_key) {
            content.push(
              '<br>',
              ' (Territoires dans un voisinage de ',
              document.getElementById('dist_filter').value,
              'km)',
            );
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
              left: `${d3.event.pageX - scrollX - 5}px`,
              top: `${d3.event.pageY - scrollY - _h}px`,
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
              ' (Territoires dans un voisinage de ',
              document.getElementById('dist_filter').value,
              'km)',
            );
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
              left: `${d3.event.pageX - scrollX - 5}px`,
              top: `${d3.event.pageY - scrollY - _h}px`,
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
        'stroke-width': 2,
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
        'stroke-width': 14,
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
        if (isContextMenuDisplayed()) return;
        clearTimeout(t);
        const { scrollX, scrollY } = getScrollValue();
        if (self.type === 'value') {
          const content = ['Moyenne de l\'espace d\'étude'];
          let _h = 65;
          if (app.current_config.my_category) {
            content.push('<br>', ' (', app.current_config.my_category, ')');
            _h += 20;
          } else if (app.current_config.filter_key) {
            content.push(
              '<br>',
              ' (Territoires dans un voisinage de ',
              document.getElementById('dist_filter').value,
              'km)',
            );
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
              left: `${d3.event.pageX - scrollX - 5}px`,
              top: `${d3.event.pageY - scrollY - _h}px`,
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
              ' (Territoires dans un voisinage de ',
              document.getElementById('dist_filter').value,
              'km)',
            );
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
              left: `${d3.event.pageX - scrollX - 5}px`,
              top: `${d3.event.pageY - scrollY - _h}px`,
            });
        }
      });

    this.plot.append('g')
      .attrs({
        class: 'x axis', id: 'axis--x', transform: `translate(0, ${height})`,
      })
      .call(this.xAxis.ticks(this.mean_variable1 >= 10000 ? 5 : 10));

    this.plot.append('g')
      .attrs({ class: 'y axis', id: 'axis--y', opacity: 0.9 })
      .call(this.yAxis);

    // Prepare the tooltip displayed on mouseover:
    this.tooltip = prepareTooltip(d3.select(svg_bar.node().parentNode), null);

    this.prepareTitleAxis();

    svg_container.append('image')
      .attrs({
        x: margin.left + width / 2 - 30 - svg_container.select('#title-axis-x').node().getBoundingClientRect().width / 2,
        y: margin.top + height + margin.bottom / 2 + 5,
        width: 15,
        height: 15,
        'xlink:href': 'img/reverse_plus.png',
        id: 'img_reverse_x',
        title: 'Inverser l\'ordre de classement de l\'indicateur',
      })
      .style('cursor', 'pointer')
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
          app.map.callBrush(self.last_map_selection);
        } else {
          self.update();
        }
      });

    svg_container.append('image')
      .attrs({
        x: margin.left / 3 - 20,
        y: margin.top + (height / 2) + svg_container.select('#title-axis-y').node().getBoundingClientRect().height / 2 + 15,
        width: 15,
        height: 15,
        'xlink:href': 'img/reverse_plus.png',
        id: 'img_reverse_y',
        title: 'Inverser l\'ordre de classement de l\'indicateur',
      })
      .style('cursor', 'pointer')
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
          app.map.callBrush(self.last_map_selection);
        } else {
          self.update();
        }
      });

    this.completude = new CompletudeSection();
    this.completude.update(
      calcCompletudeSubset(app, [this.variable1, this.variable2], 'array'),
      calcPopCompletudeSubset(app, [this.variable1, this.variable2]),
    );

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
      .styles({ padding: '0 10px 10px 10px', 'text-align': 'center', color: '#4f81bd' });

    const chart_type = menu_selection.append('p')
      .style('margin', '4px 0 7px 0');

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
      .styles({ margin: '0px 0px 2px 0px' })
      .html('Sur les deux indicateurs, sélection des territoires ayant des valeurs...');

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
      .text('inférieures à mon territoire')
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
      .text('supérieures à mon territoire')
      .on('click', function () {
        menu_selection.selectAll('button').attr('class', 'button_blue');
        this.classList.add('pressed');
        self.selectAboveMyRegion();
      });

    const section = menu_selection.append('div')
      .append('section')
      .attr('class', 'slider-checkbox');
    section.append('input')
      .attrs({ type: 'checkbox', id: 'check_prop' });
    section.append('label')
      .attrs({ class: 'label not_selected noselect', for: 'check_prop' })
      .text('Cercles proportionnels à la population');


    this.bindMenu();
    // this.update();
    this.makeTableStat();
  }

  resetZoom() {
    d3.zoomIdentity.x = 0;
    d3.zoomIdentity.y = 0;
    d3.zoomIdentity.k = 1;
    this.scatter.select('.brush').node().__zoom = d3.zoomIdentity;
    this.zoomed(d3.zoomIdentity);
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
        .ticks(this.mean_variable1 >= 10000 ? 5 : 10)
        .tickSize(-height)
        .tickFormat(''));
    this.plot.insert('g', '#scatterplot')
      .attr('class', 'grid grid-y')
      .call(this.yAxis2
        .tickSize(-width)
        .tickFormat(''));
  }


  /**
  * Update both axis and grid.
  */
  updateAxisGrid() {
    // const trans = d3.transition().duration(125);
    this.plot.select('.grid-x')
      // .transition(trans)
      .call(this.xAxis2
        .ticks(this.mean_variable1 >= 10000 ? 5 : 10)
        .tickSize(-height)
        .tickFormat(''));
    this.plot.select('.grid-y')
      // .transition(trans)
      .call(this.yAxis2
        .tickSize(-width)
        .tickFormat(''));
    this.plot.select('#axis--x')
      // .transition(trans)
      .call(this.xAxis
        .ticks(this.mean_variable1 >= 10000 ? 5 : 10));
    this.plot.select('#axis--y')
      // .transition(trans)
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
      .styles({
        'font-family': '"Signika",sans-serif',
        'font-size': '14px',
        'text-anchor': 'middle',
        fill: 'black',
        cursor: 'pointer',
      })
      .html(`${this.variable1}  &#x25BE;`)
      .on('click', function () {
        const { scrollY } = getScrollValue();
        const bbox = this.getBoundingClientRect();
        if (self.menuY.displayed) {
          self.menuY.hideMenu();
        }
        self.menuX.showMenu(
          d3.event,
          document.body,
          self.itemsX,
          [bbox.left - 20, bbox.top + 20 + scrollY],
        );
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
      .styles({
        'font-family': '"Signika",sans-serif',
        'font-size': '14px',
        'text-anchor': 'middle',
        fill: 'black',
        cursor: 'pointer',
      })
      .html(`${this.variable2}  &#x25BE;`)
      .on('click', function () {
        const { scrollY } = getScrollValue();
        const bbox = this.getBoundingClientRect();
        if (self.menuX.displayed) {
          self.menuX.hideMenu();
        }
        self.menuY.showMenu(
          d3.event,
          document.body,
          self.itemsY,
          [bbox.left, bbox.bottom + 10 + scrollY],
        );
      });
  }

  /**
  * Recolor the dots without calling the `update` method.
  */
  updateLight() {
    const default_color = 'lightgray';
    this.scatter.selectAll('.dot')
      .transition()
      .duration(125)
      .styles(d => ({
        fill: app.colors[d.id] || default_color,
        stroke: app.colors[d.id] ? 'rgb(97, 97, 97)' : 'rgb(110, 110, 110)',
        'fill-opacity': 0.8,
        'stroke-opacity': 0.8,
      }));
  }

  update() {
    if (document.getElementById('overlay').style.display === 'none') {
      execWithWaitingOverlay(() => { this._update(); });
    } else {
      this._update();
    }
  }


  /**
  * Redraw the scatterplot.
  */
  _update() {
    const self = this;
    const data = self.data;
    const dots = this.scatter.selectAll('.dot')
      .data(data, d => d.id);
    const num_name = app.current_config.pop_field;
    const size_func = this.proportionnal_symbols
      ? new PropSizer(d3.max(data, d => d[num_name]), 40).scale
      : () => 4;
    // const _trans = dots.transition().duration(100);
    const transform = d3.zoomIdentity;
    transform.k = 1;
    transform.x = 0;
    transform.y = 0;
    // if (this.k !== 1) {
    transform.x = math_min(0, math_max(transform.x, width - width * transform.k));
    // eslint-disable-next-line no-param-reassign
    transform.y = math_min(0, math_max(transform.y, height - height * transform.k));
    this.k = transform.k;
    // const new_yScale = transform.rescaleY(this.y);
    // const new_xScale = transform.rescaleY(this.x);
    // this.yAxis.scale(new_yScale);
    // this.yAxis2.scale(new_yScale);
    // this.xAxis.scale(new_xScale);
    // this.xAxis2.scale(new_xScale);
    const gbrush = this.plot.select('.brush')
      .attr('transform', transform);
    const _zoom = gbrush.node().__zoom;
    _zoom.x = 0;
    _zoom.y = 0;
    _zoom.k = 1;
    this.k = 1;

    if (this.type === 'rank') {
      const rank_variable1 = this.rank_variable1;
      const rank_variable2 = this.rank_variable2;
      const range_x = this.xInversed ? [101, -1] : [-1, 101];
      const range_y = this.yInversed ? [101, -1] : [-1, 101];

      this.x.domain(range_x);
      this.y.domain(range_y);
      this.mean_variable1 = 50;
      this.mean_variable2 = 50;
      this.yAxis.scale(this.y);
      this.yAxis2.scale(this.y);
      this.xAxis.scale(this.x);
      this.xAxis2.scale(this.x);
      const x = this.x;
      const y = this.y;
      const default_color = 'lightgray';

      dots
        // .transition(_trans)
        .attrs(d => ({
          r: size_func(d[num_name]) / this.k,
          cx: x(d[rank_variable1]),
          cy: y(d[rank_variable2]),
          transform,
          'stroke-width': 1 / this.k,
        }))
        .styles(d => ({
          fill: app.colors[d.id] || default_color,
          stroke: app.colors[d.id] ? 'rgb(97, 97, 97)' : 'rgb(110, 110, 110)',
          'fill-opacity': 0.8,
          'stroke-opacity': 0.8,

        }))
        .on('end', () => {
          self.bindTooltips(true);
          dots.exit().remove();
          dots.order();
        });

      dots.enter()
        .append('circle')
        .styles(d => ({
          fill: app.colors[d.id] || default_color,
          stroke: app.colors[d.id] ? 'rgb(97, 97, 97)' : 'rgb(110, 110, 110)',
          'fill-opacity': 0.8,
          'stroke-opacity': 0.8,
        }))
        .attrs(d => ({
          'stroke-width': 1 / this.k,
          r: size_func(d[num_name]) / this.k,
          cx: x(d[rank_variable1]),
          cy: y(d[rank_variable2]),
          transform,
          class: 'dot',
        }));
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
      this.yAxis.scale(this.y);
      this.yAxis2.scale(this.y);
      this.xAxis.scale(this.x);
      this.xAxis2.scale(this.x);

      this.mean_variable1 = getMean2(data, variable1, variables_info);
      this.mean_variable2 = getMean2(data, variable2, variables_info);

      const x = this.x;
      const y = this.y;
      const default_color = 'lightgray';

      dots
        // .transition(_trans)
        .attrs(d => ({
          r: size_func(d[num_name]) / this.k,
          cx: x(d[variable1]),
          cy: y(d[variable2]),
          transform,
        }))
        .styles(d => ({
          fill: app.colors[d.id] || default_color,
          stroke: app.colors[d.id] ? 'rgb(97, 97, 97)' : 'rgb(110, 110, 110)',
          'fill-opacity': 0.8,
          'stroke-opacity': 0.8,
        }))
        .on('end', () => {
          self.bindTooltips(false);
          dots.exit().remove();
          dots.order();
        });

      dots.enter()
        .append('circle')
        .styles(d => ({
          fill: app.colors[d.id] || default_color,
          stroke: app.colors[d.id] ? 'rgb(97, 97, 97)' : 'rgb(110, 110, 110)',
          'fill-opacity': 0.8,
          'stroke-opacity': 0.8,
        }))
        .attrs(d => ({
          r: size_func(d[num_name]) / this.k,
          cx: x(d[variable1]),
          cy: y(d[variable2]),
          class: 'dot',
          transform,
        }));
    }
    self.bindTooltips(false);
    dots.exit()
      // .transition(_trans)
      .remove();
    dots.order();
    this.updateAxisGrid();

    const grp_mean = this.plot.select('g.mean');
    grp_mean.selectAll('#mean_x.mean_line, #mean_x.transp_mean_line')
      .attrs({
        x1: this.x(this.mean_variable1),
        x2: this.x(this.mean_variable1),
      });
    grp_mean.selectAll('#mean_y.mean_line, #mean_y.transp_mean_line')
      .attrs({
        y1: this.y(this.mean_variable2),
        y2: this.y(this.mean_variable2),
      });

    grp_mean.selectAll('.mean_line')
      .attrs({
        transform: transform,
        'stroke-width': 2 / this.k,
      });

    grp_mean.selectAll('.transp_mean_line')
      .attrs({
        transform: transform,
        'stroke-width': 14 / this.k,
      });
  }

  zoomed(transform) {
    // if (transform.k === 1) {
    //   transform.x = 0; // eslint-disable-line no-param-reassign
    //   transform.y = 0; // eslint-disable-line no-param-reassign
    // }
    // eslint-disable-next-line no-param-reassign
    transform.x = math_min(0, math_max(transform.x, width - width * transform.k));
    // eslint-disable-next-line no-param-reassign
    transform.y = math_min(0, math_max(transform.y, height - height * transform.k));
    this.k = transform.k;
    const new_xScale = transform.rescaleX(this.x);
    const new_yScale = transform.rescaleY(this.y);

    const num_name = app.current_config.pop_field;
    const size_func = this.proportionnal_symbols
      ? new PropSizer(d3.max(this.data, d => d[num_name]), 30).scale
      : () => 4;
    // const trans = this.plot.select('#scatterplot')
    //   .selectAll('circle').transition().duration(125);
    this.plot
      .selectAll('circle')
      .attrs(d => ({
        transform: transform,
        r: size_func(d[num_name]) / this.k,
        'stroke-width': 1 / this.k,
      }));

    this.plot.select('#axis--x')
      // .transition(trans)
      .call(this.xAxis.scale(new_xScale)
        .ticks(this.mean_variable1 >= 10000 ? 5 : 10));

    this.plot.select('.grid-x')
      // .transition(trans)
      .call(this.xAxis2.scale(new_xScale)
        .ticks(this.mean_variable1 >= 10000 ? 5 : 10)
        .tickSize(-height)
        .tickFormat(''))
      .selectAll('line')
      .attr('stroke', 'lightgray');

    this.plot.select('#axis--y')
      // .transition(trans)
      .call(this.yAxis.scale(new_yScale));

    this.plot.select('.grid-y')
      // .transition(trans)
      .call(this.yAxis2.scale(new_yScale)
        .tickSize(-width)
        .tickFormat(''))
      .selectAll('line')
      .attr('stroke', 'lightgray');

    this.plot.select('.brush')
      // .transition(trans)
      .attr('transform', transform);

    this.plot.selectAll('.mean_line')
      // .transition(trans)
      .attrs({
        transform: transform,
        'stroke-width': 2 / this.k,
      });

    this.plot.selectAll('.transp_mean_line')
      // .transition(trans)
      .attrs({
        transform: transform,
        'stroke-width': 14 / this.k,
      });
  }

  /**
  * Update the completness value (displayed on the top of the map),
  * computed for the current study area and the two displayed variables.
  */
  updateCompletude() {
    this.completude.update(
      calcCompletudeSubset(app, [this.variable1, this.variable2], 'array'),
      calcPopCompletudeSubset(app, [this.variable1, this.variable2]),
    );
  }

  /**
  * Update the map linked to this chart to sync the colors in use.
  */
  updateMapRegio() {
    app.map.target_layer.selectAll('path')
      .attr('fill-opacity', 1)
      .attr('fill', d => (this.current_ids.indexOf(d.id) > -1
        ? (app.colors[d.id] || color_countries)
        : color_disabled));
  }

  /**
  * Handle a brush event on the map and recolor the appropriate features
  * on the scatterplot.
  */
  handle_brush_map(event) {
    if (!event || !event.selection) {
      this.last_map_selection = undefined;
      return;
    }
    app.map.tooltip.style('display', 'none');
    svg_container.select('.brush').call(this.brush.move, null);
    const self = this;
    const [topleft, bottomright] = event.selection;
    this.last_map_selection = [topleft, bottomright];
    const rect = new Rect(topleft, bottomright);
    app.colors = {};
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
            const feature = app.full_dataset[d._ix_dataset];
            const value1 = feature[self.variable1];
            const value2 = feature[self.variable2];
            const color = comp2(
              value1, value2,
              self.ref_value1, self.ref_value2,
              self.xInversed, self.yInversed,
            );
            app.colors[id] = color;
            return color;
          }
        }
        return color_countries;
      });
    self.updateLight();
  }

  /**
  * Binds the tooltip on the new/updated dots.
  */
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
        if (isContextMenuDisplayed()) return;
        clearTimeout(t);
        const { scrollX, scrollY } = getScrollValue();
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
            left: `${d3.event.pageX - scrollX - 5}px`,
            top: `${d3.event.pageY - scrollY - yoffset}px`,
          });
      })
      .on('mouseout.tooltip', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          this.tooltip.style('display', 'none').select('.title').attr('class', 'title').html('');
        }, 250);
      });
  }

  /**
  * Handle a click on the map, used for selecting features.
  */
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
        this.xInversed, this.yInversed,
      );
      app.colors[id] = color;
      // Change the color on the map:
      d3.select(parent).attr('fill', color);
      // Add the clicked feature on the colored selection on the chart:
    }
    this.updateLight();
  }

  /**
  * Update the line created for the mean or median value (after changing the variables in user_data
  * or after changing the kind of chart between 'rank' and 'raw values').
  */
  updateMeanMedianValue() {
    if (this.type === 'value') {
      this.mean_variable1 = getMean2(this.data, this.variable1, variables_info);
      this.mean_variable2 = getMean2(this.data, this.variable2, variables_info);
    } else if (this.type === 'rank') {
      this.mean_variable1 = 50;
      this.mean_variable2 = 50;
    }
    const grp_mean = this.plot.select('g.mean');
    grp_mean.selectAll('#mean_x.mean_line, #mean_x.transp_mean_line')
      // .transition()
      // .duration(125)
      .attrs({
        x1: this.x(this.mean_variable1),
        x2: this.x(this.mean_variable1),
      });
    grp_mean.selectAll('#mean_y.mean_line, #mean_y.transp_mean_line')
      // .transition()
      // .duration(125)
      .attrs({
        y1: this.y(this.mean_variable2),
        y2: this.y(this.mean_variable2),
      });
  }

  /**
  * Action triggered when the user change the reference region ("Ma région").
  */
  updateChangeRegion() {
    if (app.current_config.filter_key !== undefined) {
      this.changeStudyZone();
    } else {
      // Remove the rect brush from the chart if any:
      svg_container.select('.brush').call(this.brush.move, null);
      const tmp_my_region = this.data.splice(
        this.data.findIndex(d => d.id === app.current_config.my_region),
        1,
      )[0];
      this.data.push(tmp_my_region);
      this.ref_value1 = tmp_my_region[this.variable1];
      this.ref_value2 = tmp_my_region[this.variable2];
      app.map.removeRectBrush();
      app.map.updateLegend();
      app.map.resetColors(this.current_ids);
      this.update();
    }
  }

  changeStudyZone() {
    // Remove the rect brush from the chart if any:
    svg_container.select('.brush').call(this.brush.move, null);
    // Fetch the new data subset for this study zone and theses variables:
    const pop_field = app.current_config.pop_field;
    this.data = app.current_data.filter(ft => !!ft[this.variable1] && !!ft[this.variable2]).slice();
    this.data.sort((a, b) => b[pop_field] - a[pop_field]);
    // Put "my region" at the end of the serie so it will be displayed on
    // the top of the chart:
    const tmp_my_region = this.data.splice(
      this.data.findIndex(d => d.id === app.current_config.my_region),
      1,
    )[0];
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

    app.map.removeRectBrush();
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
    // Update the name of the axis and the tooltip value:
    const title_axis = svg_container.select('#title-axis-x')
      .attr('title-tooltip', this.pretty_name1)
      .html(`${code_variable} &#x25BE;`);
    // Update the position of the reverse button:
    svg_container.select('#img_reverse_x')
      .attrs({
        x: title_axis.attr('x') - title_axis.node().getBoundingClientRect().width / 2 - 30,
        y: margin.top + height + margin.bottom / 2 + 5,
      });
    // Update the items displayed in the context menu under this axis label:
    this.updateItemsCtxMenu();
    // Filter the data to only keep data in which we are interested:
    const pop_field = app.current_config.pop_field;
    this.data = app.current_data.filter(ft => !!ft[this.variable1] && !!ft[this.variable2]).slice();
    this.data.sort((a, b) => b[pop_field] - a[pop_field]);
    // Append my region at the end of the array:
    const tmp_my_region = this.data.splice(
      this.data.findIndex(d => d.id === app.current_config.my_region),
      1,
    )[0];
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
    // Update the name of the axis and the tooltip value:
    svg_container.select('#title-axis-y')
      .attr('title-tooltip', this.pretty_name2)
      .html(`${code_variable} &#x25BE;`);
    // Update the position of the reverse button:
    svg_container.select('#img_reverse_y')
      .attrs({
        x: margin.left / 3 - 20,
        y: margin.top + (height / 2) + svg_container.select('#title-axis-y').node().getBoundingClientRect().height / 2 + 15,
      });
    // Update the items displayed in the context menu under this axis label:
    this.updateItemsCtxMenu();
    // Filter the data to only keep data in which we are interested:
    const pop_field = app.current_config.pop_field;
    this.data = app.current_data.filter(ft => !!ft[this.variable1] && !!ft[this.variable2]).slice();
    this.data.sort((a, b) => b[pop_field] - a[pop_field]);
    // Append my region at the end of the array:
    const tmp_my_region = this.data.splice(
      this.data.findIndex(d => d.id === app.current_config.my_region),
      1,
    )[0];
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
    // Use all the variables selected in the left menu to fill the two context menu:
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
    // When the user select a new variable on the left menu, the variable name is added
    // in the context menu of X and Y axis but the plot stay the same:
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
    // then remove the rect brush from the chart if any:
    if (code_variable === this.variable1 || code_variable === this.variable2) {
      svg_container.select('.brush').call(this.brush.move, null);
    }
    // If the variable to remove was currently used for drawing this chart:
    // set a new variable for this axis and redraw the chart:
    if (code_variable === this.variable1) {
      const new_var_x = this.itemsX.filter(ft => ft.name !== this.variable2)[0].name;
      this.changeVariableX(new_var_x);
    } else if (code_variable === this.variable2) {
      const new_var_y = this.itemsY.filter(ft => ft.name !== this.variable1)[0].name;
      this.changeVariableY(new_var_y);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  getElemBelow(e) {
    const elems = getElementsFromPoint(e.clientX, e.clientY);
    const elem = elems.find(el => el.className.baseVal === 'dot');
    return elem && elem.__data__ ? elem.__data__.id : null;
  }

  remove() {
    this.table_stats.remove();
    app.map.unbindBrushClick();
    svg_bar.text('').html('');
  }

  bindMap() {
    app.map.displayLegend(1);
    this.updateMapRegio();
    this.update();
    this.updateCompletude();
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
        // self.zoomed(d3.zoomIdentity);
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
        menu.select('#btn_above_mean').text('inférieures à la médiane');
        menu.select('#btn_below_mean').text('supérieures à la médiane');
        // self.zoomed(d3.zoomIdentity);
        self.update();
      });

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
  }

  selectBelowMean() {
    const mean1 = this.type === 'rank' ? 50 : getMean2(this.data, this.variable1, variables_info);
    const mean2 = this.type === 'rank' ? 50 : getMean2(this.data, this.variable2, variables_info);
    const v1 = this.type === 'rank' ? this.rank_variable1 : this.variable1;
    const v2 = this.type === 'rank' ? this.rank_variable2 : this.variable2;

    svg_container.select('.brush').call(this.brush.move, null);
    app.colors = {};
    for (let i = 0, len_i = this.data.length; i < len_i; i++) {
      const ft = this.data[i];
      if (ft[v1] < mean1 && ft[v2] < mean2) {
        app.colors[ft.id] = comp2(
          ft[v1], ft[v2],
          this.ref_value1, this.ref_value2,
          this.xInversed, this.yInversed,
        );
      }
    }
    app.colors[app.current_config.my_region] = color_highlight;
    this.updateLight();
    this.updateMapRegio();
    app.map.removeRectBrush();
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
          this.xInversed, this.yInversed,
        );
      }
    }
    app.colors[app.current_config.my_region] = color_highlight;
    this.updateLight();
    this.updateMapRegio();
    app.map.removeRectBrush();
  }

  selectAboveMean() {
    const mean1 = this.type === 'rank' ? 50 : getMean2(this.data, this.variable1, variables_info);
    const mean2 = this.type === 'rank' ? 50 : getMean2(this.data, this.variable2, variables_info);
    const v1 = this.type === 'rank' ? this.rank_variable1 : this.variable1;
    const v2 = this.type === 'rank' ? this.rank_variable2 : this.variable2;

    svg_container.select('.brush').call(this.brush.move, null);
    app.colors = {};
    for (let i = 0, len_i = this.data.length; i < len_i; i++) {
      const ft = this.data[i];
      if (ft[v1] > mean1 && ft[v2] > mean2) {
        app.colors[ft.id] = comp2(
          ft[v1], ft[v2],
          this.ref_value1, this.ref_value2,
          this.xInversed, this.yInversed,
        );
      }
    }
    app.colors[app.current_config.my_region] = color_highlight;
    this.updateLight();
    this.updateMapRegio();
    app.map.removeRectBrush();
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
          this.xInversed, this.yInversed,
        );
      }
    }
    app.colors[app.current_config.my_region] = color_highlight;
    this.updateLight();
    this.updateMapRegio();
    app.map.removeRectBrush();
  }

  prepareTableStat() {
    const values1 = this.data.map(d => d[this.variable1]);
    const values2 = this.data.map(d => d[this.variable2]);
    const features = [
      {
        Min: d3.min(values1),
        Max: d3.max(values1),
        Moy: getMean2(this.data, this.variable1, variables_info),
        Med: d3.median(values1),
        id: this.variable1,
        Variable: this.variable1,
        'Mon territoire': this.ref_value1,
      },
      {
        Min: d3.min(values2),
        Max: d3.max(values2),
        Moy: getMean2(this.data, this.variable2, variables_info),
        Med: d3.median(values2),
        id: this.variable2,
        Variable: this.variable2,
        'Mon territoire': this.ref_value2,
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

  // eslint-disable-next-line class-methods-use-this
  getHelpMessage() {
    return `
<h3>Position - 2 indicateurs</h3>
<b>Aide générale</b>

Ce graphique bidimensionnel (<i>scatter-plot</i>) permet de comparer la situation du territoire sélectionné sur <b>deux indicateurs</b>, pour un espace d’étude et un maillage territorial d’analyse donné.

L’utilisateur est invité à renseigner l’indicateur qu’il souhaite voir apparaître en abscisse et en ordonnées du graphique.

Il est possible de situer le territoire au regard de la moyenne (valeurs brutes) ou au regard de la médiane (rangs normalisés).

<br><p style="text-align: center;"><a class="buttonDownload" href="data/Doc_methodo_pos_2ind.pdf">Aide détaillée (.pdf)</a></p>`;
  }

  /* eslint-disable function-paren-newline */
  getTemplateHelp() {
    const my_region_pretty_name = app.current_config.my_region_pretty_name;
    // const [my_region, my_rank] = this.data.map((d, i) => [d.id, i])
    //   .find(d => d[0] === app.current_config.my_region);
    const v1 = this.variable1;
    const v2 = this.variable2;
    const info_var1 = variables_info.find(ft => ft.id === v1);
    const info_var2 = variables_info.find(ft => ft.id === v2);
    // const values1 = this.data.map(d => d[v1]).sort((a, b) => a - b);
    // const values2 = this.data.map(d => d[v2]).sort((a, b) => a - b);
    const my_rank1 = this.data.map(d => d[v1]).sort((a, b) => a - b).indexOf(this.ref_value1);
    const my_rank2 = this.data.map(d => d[v2]).sort((a, b) => a - b).indexOf(this.ref_value2);
    let sup_both = 0;
    let inf_both = 0;
    let contrad = 0;
    this.data.forEach((o) => {
      if (o[v1] > this.ref_value1 && o[v2] > this.ref_value2) {
        sup_both += 1;
      } else if (o[v1] <= this.ref_value1 && o[v2] <= this.ref_value2) {
        inf_both += 1;
      } else {
        contrad += 1;
      }
    });
    let compl = calcCompletudeSubset(app, [this.variable1, this.variable2], 'array');
    compl = compl[0] === compl[1] ? 'la totalité des' : `${compl[0]} des ${compl[1]}`;
    const name_territorial_mesh = territorial_mesh
      .find(d => d.id === app.current_config.current_level).name;
    // eslint-disable-next-line no-nested-ternary
    const name_study_zone = getNameStudyZone();
    const help1 = [`
  <b>Indicateur 1</b> : ${info_var1.name} (<i>${info_var1.id}</i>)<br>
  <b>Indicateur 2</b> : ${info_var2.name} (<i>${info_var2.id}</i>)<br>
  <b>Maillage territorial d'analyse</b> : ${name_territorial_mesh}<br>`];

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
      help1.push( // eslint-disable-next-line quotes
        `<b>Espace d'étude</b> : France`);
    }

    const comp = (a, b, inv) => {
      if (inv) return a < b;
      return a >= b;
    };
    const obj_my_region = this.data.find(d => d.id === app.current_config.my_region);
    let cadran;
    let t1;
    let t2;
    if (this.type === 'value') {
      t2 = comp(this.ref_value2, this.mean_variable2, this.yInversed);
      t1 = comp(this.ref_value1, this.mean_variable1, this.xInversed);
      cadran = [
        t2 ? 'supérieur' : 'inférieur',
        t1 ? 'droit' : 'gauche',
      ].join(' ');
    } else {
      t2 = comp(obj_my_region[this.rank_variable2], 50, this.yInversed);
      t1 = comp(obj_my_region[this.rank_variable1], 50, this.xInversed);
      cadran = [
        t2 ? 'supérieur' : 'inférieur',
        t1 ? 'droit' : 'gauche',
      ].join(' ');
    }

    const help2 = `
Ce graphique cartésien (<i>scatter-plot</i>) permet de visualiser la sitation de l'unité territoriale <b>${my_region_pretty_name}</b> sélectionnée sur deux indicateurs : <b>${info_var1.name}</b> <i>(${this.variable1})</i> et <b>${info_var2.name}</b> <i>(${this.variable2})</i>, par rapport à l'espace d'étude <b>${name_study_zone}</b> et au maillage <b>${name_territorial_mesh}</b>.
Les données sont disponibles pour <b>${compl} unités territoriales</b> de l'espace d'étude, soit ${formatNumber(calcPopCompletudeSubset(app, [this.variable1, this.variable2]), 0)}% de la population de l'espace d'étude.
<br><br>
Sur cette sélection, l'unité territoriale ${my_region_pretty_name} a une valeur de <b>${formatNumber(this.ref_value1, 1)} ${info_var1.unit}</b> pour l'indicateur <i>${this.variable1}</i> (<b>rang ${my_rank1}</b> de la distribution)
et une valeur de <b>${formatNumber(this.ref_value2, 1)} ${info_var2.unit}</b> pour l'indicateur <i>${this.variable2}</i> (<b>rang ${my_rank2}</b>).
<br><br>
Pour cet espace d’étude, <b>${sup_both}</b> unités territoriales sont caractérisées par des valeurs supérieures à l’unité territoriale ${my_region_pretty_name} sur ces deux indicateurs (en vert) ; et <b>${inf_both}</b> par des valeurs inférieures (en rouge).
${contrad} unités territoriales se trouvent dans une situation intermédiaire par rapport à l’unité territoriale ${my_region_pretty_name} (en violet et orange : valeurs supérieures pour l’un des deux indicateurs).
<br><br>
L’unité territoriale ${my_region_pretty_name} se situe dans le <b>cadran ${cadran}</b>,
cela signifie qu’elle est caractérisée
par des valeurs ${t1 ? 'supérieures' : 'inférieures'} à la ${this.type === 'value' ? 'moyenne' : 'médiane'} pour l’indicateur <i>${this.variable1}</i> (${formatNumber(this.mean_variable1, 1)})
et par des valeurs ${t2 ? 'supérieures' : 'inférieures'} à la ${this.type === 'value' ? 'moyenne' : 'médiane'} pour l’indicateur <i>${this.variable2}</i> (${formatNumber(this.mean_variable2, 1)}).
`;

    const source = `<b>Indicateur 1</b> : ${info_var1.source} (Date de téléchargement de la donnée : ${info_var1.last_update})<br>
<b>Indicateur 2</b> : ${info_var2.source} (Date de téléchargement de la donnée : ${info_var2.last_update})`;
    return { section_selection: help1.join(''), section_help: help2, section_source: source };
  }
  /* eslint-enable function-paren-newline */
}
