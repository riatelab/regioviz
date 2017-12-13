import tingle from 'tingle.js';
import alertify from 'alertifyjs';
import '../styles/main.css';
import '../styles/tingle.min.css';
import '../styles/tippy.css';
import '../styles/alertify.min.css';
import '../styles/semantic.min.css';
import { createMenu, handleInputRegioName } from './modules/menuleft';
import { makeTopMenu, makeHeaderChart, makeHeaderMapSection } from './modules/menutop';
import { MapSelect, makeSourceSection, svg_map, zoomClick } from './modules/map';
import { color_highlight, MAX_VARIABLES, RATIO_WH_MAP } from './modules/options';
import BarChart1 from './modules/charts/barChart_1v';
import ScatterPlot2 from './modules/charts/scatterPlot_2v';
import RadarChart3 from './modules/charts/radarChart_3v';
import Similarity1plus from './modules/charts/similarity1v';
import { unbindUI, selectFirstAvailableVar, prepareGeomLayerId, getRandom, Tooltipsify, getRatioToWide } from './modules/helpers';
import {
  prepare_dataset,
  filterLevelVar,
  applyFilter,
  changeRegion,
  addVariable,
  removeVariable,
  resetVariables,
  prepareVariablesInfo,
} from './modules/prepare_data';


export const variables_info = [];

export const study_zones = [
  { id: 'no_filter', name: 'UE28', display_level: '' },
  { id: 'filter_dist', name: 'Région dans un rayon de ', display_level: '' },
];
export const territorial_mesh = [];

export const app = {
  // A mapping id -> color, containing the color to use for each
  // feature not using the default color or the disabled color
  colors: {},
  // The filtered dataset (acccording to: the current territorial level,
  // the filter key (if any) and the ratio(s) selected on the left menu:
  current_data: [],
  // The full dataset provided (containing all the features at any level in one table)
  // Row without data are expected to be empty or to contain the "NA" string.
  full_dataset: [],
  // The ids of the current feature in use (acccording to: the current territorial level,
  // the filter key (if any) and the ratio(s) used in the current chart; filtered
  // to not contain feature with empty ratio values within the ratios in use).
  current_ids: [],
  // The current version number (not used for now, except for displaying it):
  version: '0.0.0',
};

function setDefaultConfig(code = 'FRE', variable = 'REVMEN') { // }, level = 'NUTS1') {
  const var_info = variables_info.find(ft => ft.id === variable);
  app.current_config = {
    // The name of the field of the dataset containing the ID of each feature:
    id_field: 'id',
    // The name of the field of the dataset containing the name of each feature:
    name_field: 'name',
    // The name of the field of the dataset containing the population of each feature:
    pop_field: 'POP_AGE_T',
    // The name of the field of the geojson layer containing the ID of each feature
    // (these values should match with the values of the "id_field" in the
    // tabular dataset)
    id_field_geom: 'id',
    num: [var_info.id1],
    denum: [var_info.id2],
    ratio: [variable],
    ratio_pretty_name: [var_info.name],
    ratio_unit: [var_info.unit],
    // The level currently in use:
    current_level: 'N1',
    // The ID of the region currently in use:
    my_region: code,
    // The name of the region currently in use:
    my_region_pretty_name: app.feature_names[code],
    // How many ratio on the current chart:
    nb_var: 1,
  };
  app.colors[app.current_config.my_region] = color_highlight;
}

/**
* Function to update the availables ratios in the left menu (after changing region)
* If a selected variable is not available anymore it will be deselected.
* If there selected variable (all the previously selected variables are unavailable for this region)
* the first variable on the menu will be selected.
* If the new number of selected feature is inferior to the number of variables on the current
* chart, a new chart (suitable for only 1 variable) will be selected.
*
*
* @param {String} my_region - The ID of the newly selected region.
* @return {Number} - The new number of selected ratios.
*
*/
function updateAvailableRatios(my_region) {
  const data_my_feature = app.full_dataset.filter(
    ft => ft[app.current_config.id_field] === my_region)[0];
  const menu = document.querySelector('#menu');
  const lines = menu.querySelectorAll('.target_variable');
  for (let i = 0, nb_lines = lines.length; i < nb_lines; i++) {
    const code_variable = lines[i].getAttribute('value');
    if (data_my_feature[code_variable] !== undefined
        && data_my_feature[code_variable] !== 'NA') {
      lines[i].classList.remove('disabled');
      lines[i].nextSibling.classList.remove('disabled');
    } else {
      lines[i].classList.remove('checked');
      lines[i].classList.add('disabled');
      lines[i].nextSibling.classList.add('disabled');
    }
  }
  const new_var = menu.querySelectorAll('.target_variable.checked');
  if (new_var.length !== app.current_config.ratio.length) {
    let new_var_names;
    if (new_var.length === 0) {
      const name = selectFirstAvailableVar();
      new_var_names = [name];
    } else {
      new_var_names = Array.prototype.slice.call(
        new_var).map(elem => elem.getAttribute('value'));
    }
    resetVariables(app, new_var_names);
  }
  return new_var.length;
}


function setDefaultConfigMenu(code = 'FRE', variable = 'REVMEN', level = 'N1') {
  document.querySelector(`.target_region.square[value="${code}"]`).classList.add('checked');
  document.querySelector(`.target_variable.small_square[value="${variable}"]`).classList.add('checked');
  document.querySelector('.filter_v.square[filter-value="no_filter"]').classList.add('checked');
  document.querySelector(`.territ_level.square[value="${level}"]`).classList.add('checked');
  document.querySelector('.regio_name > #search').value = app.feature_names[code];
  document.querySelector('.regio_name > #autocomplete').value = app.feature_names[code];
  updateAvailableRatios(code);
}


function updateMenuStudyZones() {
  Array.prototype.forEach.call(
    document.querySelectorAll('#menu_studyzone > p'),
    (elem) => {
      const val = elem.querySelector('.filter_v.square').getAttribute('display_level');
      if (val === '' || val === app.current_config.current_level) {
        // eslint-disable-next-line no-param-reassign
        elem.style.display = null;
      } else {
        // eslint-disable-next-line no-param-reassign
        elem.style.display = 'none';
      }
    });
}


export function resetColors() {
  app.colors = {};
  // for (let i = 0, len_i = current_ids.length; i < len_i; i++) {
  //   app.colors[current_ids[i]] = color_countries;
  // }
  app.colors[app.current_config.my_region] = color_highlight;
}

/**
* Update the menu located on the top of the window the display the available
* charts, according to the current number of selected variables.
*
* @param {Number} nb_var - How many variables are currently selected.
* @return {void}
*
*/
function updateAvailableCharts(nb_var) {
  if (nb_var === 1) { // Allow all kind of vizu with 1 variable:
    d3.selectAll('.chart_t1').each(function () { this.classList.remove('disabled'); });
    d3.selectAll('.chart_t2, .chart_t3').each(function () { this.classList.add('disabled'); });
  } else if (nb_var === 2) { // Allow all kind of vizu with 2 variables:
    d3.selectAll('.chart_t1, .chart_t2').each(function () { this.classList.remove('disabled'); });
    d3.selectAll('.chart_t3').each(function () { this.classList.add('disabled'); });
  } else if (nb_var > 2) { // Allow all kind of vizu with 3 variables:
    d3.selectAll('.chart_t1, .chart_t2, .chart_t3').each(function () { this.classList.remove('disabled'); });
  }
}

function updateMyCategorySection() {
  if (app.current_config.my_category) {
    document.querySelector('.filter_info').innerHTML = app.current_config.my_category;
  } else if (app.current_config.filter_key instanceof Array) {
    document.querySelector('.filter_info').innerHTML = `Régions dans un voisinage de ${+d3.select('#dist_filter').property('value')} km`;
  } else {
    document.querySelector('.filter_info').innerHTML = 'Ensemble des régions';
  }
}

/**
* Create handlers for user event on the left menu and on the map for charts only
* allowing to use 1 variable.
*
* @param {Object} chart - The chart object.
* @param {Object} map_elem - The map object.
* @return {void}
*
*/
function bindUI_chart(chart, map_elem) {
  // User click on the arrow next to the input element in the first section
  // of the left menu:
  d3.select('span.down_arrow')
    .on('click', () => {
      const list_regio = document.getElementById('list_regio');
      if (list_regio.classList.contains('hidden')) {
        list_regio.classList.remove('hidden');
      } else {
        list_regio.classList.add('hidden');
      }
    });
  // User change the study zone:
  d3.selectAll('span.filter_v')
    .on('click', function () {
      if (!this.classList.contains('checked')) {
        d3.selectAll('span.filter_v').attr('class', 'filter_v square');
        this.classList.add('checked');
        const filter_type = this.getAttribute('filter-value');
        if (filter_type === 'filter_dist') {
          const input_elem = document.getElementById('dist_filter');
          input_elem.removeAttribute('disabled');
          const dist = +input_elem.value;
          const ids = map_elem.getUnitsWithin(dist);
          applyFilter(app, ids);
        } else {
          document.getElementById('dist_filter').setAttribute('disabled', 'disabled');
          applyFilter(app, filter_type);
        }
        updateMyCategorySection();
        chart.changeStudyZone();
        chart.updateCompletude();
      }
    });

  d3.select('#dist_filter')
    .on('change, keyup', function () {
      const ids = map_elem.getUnitsWithin(+this.value);
      applyFilter(app, ids);
      chart.changeStudyZone();
      chart.updateCompletude();
    });

  // User change the targeted region:
  d3.selectAll('span.target_region')
    .on('click', function () {
      if (!this.classList.contains('checked')) {
        d3.selectAll('span.target_region').attr('class', 'target_region square');
        this.classList.add('checked');

        const id_region = this.getAttribute('value');
        const old_nb_var = app.current_config.ratio.length;
        changeRegion(app, id_region, map_elem);

        document.getElementById('list_regio').classList.add('hidden');
        document.querySelector('.regio_name > #search').value = app.feature_names[id_region];
        document.querySelector('.regio_name > #autocomplete').value = app.feature_names[id_region];
        // Update the availables ratio on the left menu
        // (this may change the current selected ratio(s) as some variables are
        // not available for some features) and fetch the number of selected
        // variables after that:
        const new_nb_var = updateAvailableRatios(id_region);
        updateAvailableCharts(new_nb_var);
        updateMyCategorySection();
        if (new_nb_var >= app.current_config.nb_var) {
          if (old_nb_var === new_nb_var) {
            chart.updateChangeRegion();
          } else {
            d3.select('span.type_chart.selected').dispatch('click');
            alertify.warning('Une variable précédemment sélectionnée n\'est pas disponible pour cette région.');
          }
        } else {
          // If there fewer selected variables than requested by the current chart,
          // redraw the first (default) kind of chart:
          d3.select('span.chart_t1[value="BarChart1"]').dispatch('click');
          alertify.warning('Des variables sélectionnées sont indisponibles pour cette région. Un changement de représentation est nécessaire.');
        }
      }
    });

  // User click on the name of a group of variables
  // to expand or collapse its content:
  d3.selectAll('.name_group_var')
    .on('click', function () {
      const group_var = this.nextSibling;
      const title_arrow = this.querySelector('span.arrow');
      if (group_var.style.display === 'none') {
        title_arrow.classList.remove('arrow_down');
        title_arrow.classList.add('arrow_right');
        group_var.style.display = null;
      } else {
        title_arrow.classList.remove('arrow_right');
        title_arrow.classList.add('arrow_down');
        group_var.style.display = 'none';
      }
    });

  // User click to add/remove a variable from the comparison:
  d3.selectAll('span.target_variable')
    .on('click', function () {
      if (this.classList.contains('disabled')) return;
      let nb_var = Array.prototype.slice.call(
        document.querySelectorAll('span.target_variable'))
        .filter(elem => !!elem.classList.contains('checked')).length;
      // Select a new variable and trigger the appropriate changes on the current chart:
      if (!this.classList.contains('checked')) {
        // We don't want the user to be able to select more than
        // MAX_VARIABLES (default = 7) variables simultaneously:
        if (nb_var >= MAX_VARIABLES) {
          alertify.warning('Le nombre maximal de variables sélectionnées est atteint.');
          return;
        }
        this.classList.add('checked');
        const code_variable = this.getAttribute('value');
        // const name_variable = variables_info.find(d => d.id === code_variable).name;
        addVariable(app, code_variable);

        chart.addVariable(code_variable);
        nb_var += 1;
      } else { // Remove a variable from the selection:
        nb_var -= 1;
        // We don't want to let the user remove the variable if
        // it's the only one selected or if the currently displayed
        // chart need a minimum number of variables:
        if (nb_var < app.current_config.nb_var) {
          return;
        }
        const code_variable = this.getAttribute('value');
        this.classList.remove('checked');
        removeVariable(app, code_variable);
        chart.removeVariable(code_variable);
        // makeTable(app.current_data, app.current_config);
      }
      // Update the top menu to display available charts according to the current
      // number of available variables:
      updateAvailableCharts(nb_var);
    });

  d3.selectAll('span.territ_level')
    .on('click', function () {
      if (!this.classList.contains('checked')) {
        // Reset the study zone :
        d3.select('span.filter_v[filter-value="no_filter"]').dispatch('click');
        d3.selectAll('span.territ_level').attr('class', 'territ_level square');
        this.classList.add('checked');
        const level_value = this.getAttribute('value');
        app.current_config.current_level = level_value;
        updateMenuStudyZones();
        filterLevelVar(app);
        resetColors();
        map_elem.updateLevelRegion(level_value);
        map_elem.unbindBrushClick();
        map_elem.bindBrushClick(chart);
        chart.changeStudyZone();
      }
    });

  // Dispatch a click event on the associated checkbox when the text is clicked:
  d3.selectAll('span.label_chk')
    .on('click', function () {
      this.previousSibling.click();
    });

  const header_map_section = d3.select('#map_section > #header_map');

  header_map_section.select('#img_rect_selec')
    .on('click', function () {
      if (!this.classList.contains('active')) {
        this.classList.add('active');
        document.getElementById('img_map_zoom').classList.remove('active');
        document.getElementById('img_map_select').classList.remove('active');
        svg_map.on('.zoom', null);
        if (map_elem.brush_map) {
          svg_map.select('.brush_map').style('display', null);
        }
        map_elem.target_layer.selectAll('path').on('click', null);
      }
    });

  header_map_section.select('#img_map_zoom')
    .on('click', function () {
      if (!this.classList.contains('active')) {
        this.classList.add('active');
        document.getElementById('img_rect_selec').classList.remove('active');
        document.getElementById('img_map_select').classList.remove('active');
        svg_map.call(map_elem.zoom_map);
        if (map_elem.brush_map) {
          svg_map.select('.brush_map').call(map_elem.brush_map.move, null);
          svg_map.select('.brush_map').style('display', 'none');
        }
        map_elem.target_layer.selectAll('path').on('click', null);
      }
    });

  header_map_section.select('#img_map_select')
    .on('click', function () {
      if (!this.classList.contains('active')) {
        this.classList.add('active');
        document.getElementById('img_rect_selec').classList.remove('active');
        document.getElementById('img_map_zoom').classList.remove('active');
        svg_map.on('.zoom', null);
        if (map_elem.brush_map) {
          svg_map.select('.brush_map').call(map_elem.brush_map.move, null);
          svg_map.select('.brush_map').style('display', 'none');
        }
        map_elem.target_layer.selectAll('path')
          .on('click', function (d) {
            chart.handleClickMap(d, this);
          });
      }
    });

  header_map_section.select('#zoom_in')
    .on('click', zoomClick);

  header_map_section.select('#zoom_out')
    .on('click', zoomClick);

  if (!map_elem.brush_map) {
    if (chart.handleClickMap) {
      map_elem.target_layer.selectAll('path')
        .on('click', function (d) {
          chart.handleClickMap(d, this);
        });
    } else {
      map_elem.target_layer.selectAll('path')
        .on('click', null);
    }
  }
  bindTopButtons(chart, map_elem);
}

/**
* Function to handle click on the top menu, in order to choose
* between available representations.
*
* @param {Object} chart -
* @param {Object} map_elem -
* @return {void}
*/
export function bindTopButtons(chart, map_elem) {
  d3.selectAll('.type_chart')
    .on('click', function () {
      if (this.classList.contains('disabled')) return;
      // if (this.classList.contains('selected')) return;
      document.querySelector('.type_chart.selected').classList.remove('selected');
      this.classList.add('selected');
      chart.remove();
      chart = null; // eslint-disable-line no-param-reassign
      unbindUI();
      map_elem.resetZoom();
      app.colors = {};
      const value = this.getAttribute('value');
      if (value === 'BarChart1') {
        chart = new BarChart1(app.current_data); // eslint-disable-line no-param-reassign
      } else if (value === 'ScatterPlot2') {
        chart = new ScatterPlot2(app.current_data); // eslint-disable-line no-param-reassign
      } else if (value === 'RadarChart3') {
        chart = new RadarChart3(app.current_data); // eslint-disable-line no-param-reassign
      } else if (value === 'Similarity1plus') {
        chart = new Similarity1plus(app.current_data); // eslint-disable-line no-param-reassign
      }
      bindUI_chart(chart, map_elem);
      map_elem.bindBrushClick(chart);
      chart.bindMap(map_elem);
      app.chart = chart;
      app.map = map_elem;
      Tooltipsify('[title-tooltip]');
    });
}

function bindHelpMenu() {
  const help_buttons_var = document.querySelector('#menu_variables').querySelectorAll('span.i_info');
  Array.prototype.slice.call(help_buttons_var).forEach((btn_i) => {
    // eslint-disable-next-line no-param-reassign
    btn_i.onclick = function () {
      const code_variable = this.previousSibling.previousSibling.getAttribute('value');
      const o = variables_info.find(d => d.id === code_variable);
      // eslint-disable-next-line new-cap
      const modal = new tingle.modal({
        stickyFooter: false,
        closeMethods: ['overlay', 'button', 'escape'],
        closeLabel: 'Close',
        onOpen() {
          document.querySelector('div.tingle-modal.tingle-modal--visible').style.background = 'rgba(0,0,0,0.4)';
        },
        onClose() {
          modal.destroy();
        },
      });
      modal.setContent(
        `<p style="font-family: 'Signika',sans-serif;color: #4f81bd;font-size: 1.3rem;">Description de l'indicateur</p>
        <p style="font-family: 'Signika',sans-serif;text-align: justify;">${o.methodo.split('\n').join('<br>')}</p>
        <p style="font-family: 'Signika',sans-serif;font-size: 0.8em">${o.source}</p>
        <p style="font-family: 'Signika',sans-serif;font-size: 0.8em">Date de téléchargement de la donnée : ${o.last_update}</p>`);
      modal.open();
    };
  });

  const helps_buttons_study_zone = document.querySelector('#menu_studyzone').querySelectorAll('span.i_info');
  Array.prototype.slice.call(helps_buttons_study_zone).forEach((btn_i) => {
    // eslint-disable-next-line no-param-reassign, func-names
    btn_i.onclick = function () {
      const filter_name = this.previousSibling.previousSibling.getAttribute('filter-value');
      const o = study_zones.find(d => d.id === filter_name);

      // eslint-disable-next-line new-cap
      const modal = new tingle.modal({
        stickyFooter: false,
        closeMethods: ['overlay', 'button', 'escape'],
        closeLabel: 'Close',
        onOpen() {
          document.querySelector('div.tingle-modal.tingle-modal--visible').style.background = 'rgba(0,0,0,0.4)';
        },
        onClose() {
          modal.destroy();
        },
      });
      modal.setContent(
        `<p style="font-family: 'Signika',sans-serif;color: #4f81bd;font-size: 1.3rem;">Méthodologie</p>
        <p style="font-family: 'Signika',sans-serif;text-align: justify;">${filter_name}</p>
        <p style="font-family: 'Signika',sans-serif;text-align: justify;">${o.methodology.split('\n').join('<br>')}</p>
        `);
      modal.open();
    };
  });

  const helps_buttons_territ_unit = document.querySelector('#menu_territ_level').querySelectorAll('span.i_info');
  Array.prototype.slice.call(helps_buttons_territ_unit).forEach((btn_i) => {
    // eslint-disable-next-line no-param-reassign, func-names
    btn_i.onclick = function () {
      const territ_level_name = this.previousSibling.previousSibling.getAttribute('value');
      const o = territorial_mesh.find(d => d.id === territ_level_name);

      // eslint-disable-next-line new-cap
      const modal = new tingle.modal({
        stickyFooter: false,
        closeMethods: ['overlay', 'button', 'escape'],
        closeLabel: 'Close',
        onOpen() {
          document.querySelector('div.tingle-modal.tingle-modal--visible').style.background = 'rgba(0,0,0,0,0.4)';
        },
        onClose() {
          modal.destroy();
        },
      });
      modal.setContent(`
        <p style="font-family: 'Signika',sans-serif; color: #4f81bd;font-size: 1.3rem;">Titre</p>
        <p style="font-family: 'Signika',sans-serif;text-align: justify;">${territ_level_name}</p>
        <p style="font-family: 'Signika',sans-serif;text-align: justify;">${o.methodology.split('\n').join('<br>')}</p>
        `);
      modal.open();
    };
  });
}

function bindCreditsSource() {
  const credits_btn = document.querySelector('#link_credits_source');
  credits_btn.onclick = function () {
    // eslint-disable-next-line new-cap
    const modal = new tingle.modal({
      stickyFooter: false,
      closeMethods: ['overlay', 'button', 'escape'],
      closeLabel: 'Close',
      onOpen() {
        document.querySelector('div.tingle-modal.tingle-modal--visible').style.background = 'rgba(0,0,0,0.4)';
      },
      onClose() {
        modal.destroy();
      },
    });
    modal.setContent(
      `<p style="font-family: 'Signika',sans-serif;color: #4f81bd;font-size: 1.3rem;">Régioviz - À propos</p>
      <br><br><br>
      <p style="font-family: 'Signika',sans-serif;text-align: justify;">Code source : <a href="https://github.com/riatelab/regioviz/">https://github.com/riatelab/regioviz/</a></p>
      <p style="font-family: 'Signika',sans-serif;text-align: justify;">Version <b>${app.version}</b></p>
      <p style="font-family: 'Signika',sans-serif;text-align: justify;">Développement : ...</p>
      <p style="font-family: 'Signika',sans-serif;text-align: justify;">Financement : ...</p>`);
    modal.open();
  };
}

function loadData() {
  d3.queue(4)
    .defer(d3.csv, 'data/REGIOVIZ_DATA.csv')
    .defer(d3.json, 'data/CGET_nuts_all3035.geojson')
    .defer(d3.json, 'data/borders3035.geojson')
    .defer(d3.json, 'data/countries3035.geojson')
    .defer(d3.json, 'data/countries-remote3035.geojson')
    .defer(d3.json, 'data/coasts3035.geojson')
    .defer(d3.json, 'data/coasts-remote3035.geojson')
    .defer(d3.json, 'data/cyprus_non_espon_space3035.geojson')
    .defer(d3.json, 'data/countries-remote-boundaries3035.geojson')
    .defer(d3.json, 'data/frame3035.geojson')
    .defer(d3.json, 'data/boxes3035.geojson')
    .defer(d3.json, 'data/line3035.geojson')
    .defer(d3.json, 'data/styles.json')
    .defer(d3.csv, 'data/indicateurs_meta.csv')
    .awaitAll((error, results) => {
      if (error) throw error;
      document.body.classList.remove('loading');
      document.querySelector('.spinner').remove();
      app.ratioToWide = getRatioToWide();
      const [
        full_dataset, nuts, borders, countries, countries_remote,
        coasts, coasts_remote, cyprus_non_espon_space,
        countries_remote_boundaries, frame, boxes, line, styles_map,
        metadata_indicateurs,
      ] = results;
      alertify.set('notifier', 'position', 'bottom-left');
      prepareVariablesInfo(metadata_indicateurs);
      // TODO : Reorder it in the dataset :
      let features_menu = full_dataset.filter(ft => ft.REGIOVIZ === '1');
      features_menu = features_menu.slice(0, 1).concat(
        features_menu.slice(6)).concat(features_menu.slice(1, 6));
      // eslint-disable-next-line no-param-reassign
      features_menu.forEach((ft) => { ft.name = ft.name.replace(' — ', ' - '); });
      const start_region = getRandom(features_menu.map(d => d.id), 12);
      const start_variable = getRandom(
        ['REVMEN', 'CHOM1574', 'CHOM1524']);
      prepare_dataset(full_dataset, app);
      setDefaultConfig(start_region, start_variable, 'N1');
      prepareGeomLayerId(nuts, app.current_config.id_field_geom);
      createMenu(features_menu, variables_info.filter(d => d.group), study_zones, territorial_mesh);
      bindCreditsSource();
      updateMenuStudyZones();
      bindHelpMenu();
      makeTopMenu();
      handleInputRegioName(features_menu);
      makeHeaderChart();
      makeHeaderMapSection();
      setDefaultConfigMenu(start_region, start_variable, 'N1');
      filterLevelVar(app);
      const other_layers = new Map([
        ['borders', borders], ['boxes', boxes],
        ['countries', countries], ['countries_remote', countries_remote],
        ['coasts', coasts], ['coasts_remote', coasts_remote],
        ['cyprus_non_espon_space', cyprus_non_espon_space],
        ['countries_remote_boundaries', countries_remote_boundaries],
        ['frame', frame], ['line', line], ['boxes2', boxes],
      ]);
      const map_elem = new MapSelect(nuts, other_layers, styles_map);
      const chart = new BarChart1(app.current_data);
      makeSourceSection();
      bindUI_chart(chart, map_elem);
      map_elem.bindBrushClick(chart);
      chart.bindMap(map_elem);
      app.chart = chart;
      app.map = map_elem;
      Tooltipsify('[title-tooltip]');
    });
}

loadData();

window.onresize = function () {
  const previous_ratio = app.ratioToWide;
  const new_ratio = getRatioToWide();
  if (previous_ratio === new_ratio) return;
  app.ratioToWide = new_ratio;
  const chart_scale_value = new_ratio / app.chartDrawRatio;
  d3.select('#svg_bar').attr('height', `${500 * app.ratioToWide}px`);
  d3.select('#svg_bar > g.container').attr('transform', `scale(${chart_scale_value})`);

  const bbox_svg = svg_map.node().getBoundingClientRect();
  const width_map = +bbox_svg.width;
  const height_map = width_map * (1 / RATIO_WH_MAP);
  const map_scale_value = new_ratio / app.mapDrawRatio;
  svg_map.attr('height', `${height_map}px`);
  svg_map.select('#layers').attr('transform', `scale(${map_scale_value})`);
  svg_map.select('.brush_map').attr('transform', `scale(${map_scale_value})`);
  d3.select('#svg_legend > g').attr('transform', `scale(${map_scale_value})`);
};
