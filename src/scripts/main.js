import tingle from 'tingle.js';
import alertify from 'alertifyjs';
import '../styles/main.css';
import '../styles/tingle.min.css';
import '../styles/tippy.css';
import '../styles/alertify.min.css';
import '../styles/semantic.min.css';
import '../styles/introjs.min.css';
import BarChart1 from './modules/charts/barChart_1v';
import ScatterPlot2 from './modules/charts/scatterPlot_2v';
import RadarChart3 from './modules/charts/radarChart_3v';
import Similarity1plus from './modules/charts/similarity1v';
import createMenu from './modules/menuleft';
import { makeTopMenu, makeHeaderChart, makeHeaderMapSection } from './modules/menutop';
import { MapSelect, svg_map, zoomClick } from './modules/map';
import { color_highlight, MAX_VARIABLES, fixed_dimension } from './modules/options';
import { Tooltipsify } from './modules/tooltip';
import { unbindUI, selectFirstAvailableVar, prepareGeomLayerId, getRandom, clickDlPdf, removeAll } from './modules/helpers';
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
// import { makeTour } from './modules/guide_tour';

// Variables filled after reading the metadata file:
export const variables_info = [];
export const study_zones = [];
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
  version: '0.1.0',
  // The user is now allowed to create its custom study zones, this is where
  // we are storing a mapping "name_study_zone" -> [id_x, id_y, id_z, id_a, ...]:
  custom_studyzones: {},
};

function setDefaultConfig(code = '249100546', variable = 'MED', level = 'EPCI') { // }, level = 'NUTS1') {
  const var_info = variables_info.find(ft => ft.id === variable);
  app.current_config = {
    // The name of the field of the dataset containing the ID of each feature:
    id_field: 'id',
    // The name of the field of the dataset containing the name of each feature:
    name_field: 'name',
    // The name of the field of the dataset containing the population of each feature:
    pop_field: 'P14_POP',
    // The name of the field of the geojson layer containing the ID of each feature
    // (these values should match with the values of the "id_field" in the
    // tabular dataset)
    id_field_geom: 'id',
    // An Array containing the id of one or more variables (currently selected in the UI)
    ratio: [variable],
    // Array containing the corresponding 'pretty names' (same order).
    ratio_pretty_name: [var_info.name],
    // Array containing the corresponding units (same order).
    ratio_unit: [var_info.unit],
    // Array containing the corresponding numerator id.
    num: [var_info.id1],
    // Array containing the corresponding denominator id.
    denum: [var_info.id2],
    // The level currently in use:
    current_level: level,
    // The ID of the region currently in use:
    my_region: code,
    // The name of the region currently in use:
    my_region_pretty_name: app.feature_names[code],
    // How many ratio on the current chart:
    nb_var: 1,
    // Filter/category type:
    filter_type: null,
  };
  app.colors[app.current_config.my_region] = color_highlight;
}

export const isIE = (() => (/MSIE/i.test(navigator.userAgent)
    || /Trident\/\d./i.test(navigator.userAgent)
    || /Edge\/\d./i.test(navigator.userAgent)))();

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


function setDefaultConfigMenu(code = '249100546', variable = 'MED', level = 'EPCI') {
  document.querySelector(`.target_region.square[value="r_${code}"]`).classList.add('checked');
  document.querySelector(`.target_variable.small_square[value="${variable}"]`).classList.add('checked');
  document.querySelector('p[filter-value="DEFAULT"] > .filter_v.square').classList.add('checked');
  document.querySelector(`.territ_level.square[value="${level}"]`).classList.add('checked');
  document.querySelector('.regio_name > #search').value = app.feature_names[code];
  document.querySelector('.regio_name > #autocomplete').value = app.feature_names[code];
  updateAvailableRatios(code);
}


export function updateMenuStudyZones() {
  Array.prototype.forEach.call(
    document.querySelectorAll('#menu_studyzone > p'),
    (elem) => {
      const square_elem = elem.querySelector('.filter_v.square');
      const label_elem = elem.querySelector('.label_chk');
      const val = square_elem.getAttribute('display_level');
      if (val === '' || val === app.current_config.current_level) {
        // eslint-disable-next-line no-param-reassign
        elem.style.display = null;
      } else {
        // eslint-disable-next-line no-param-reassign
        elem.style.display = 'none';
      }
      if (elem.getAttribute('filter-value') === 'CUSTOM') {
        const name_studyzone = label_elem.innerHTML;
        if (app.custom_studyzones[name_studyzone]
            && app.custom_studyzones[name_studyzone].indexOf(app.current_config.my_region) < 0) {
          square_elem.classList.add('disabled');
          label_elem.classList.add('disabled');
        } else {
          square_elem.classList.remove('disabled');
          label_elem.classList.remove('disabled');
        }
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
  let name_territorial_mesh = territorial_mesh
    .find(d => d.id === app.current_config.current_level).name;
  name_territorial_mesh = name_territorial_mesh.toLowerCase();
  if (app.current_config.my_category) {
    document.querySelector('.filter_info').innerHTML = app.current_config.my_category;
  } else if (app.current_config.filter_type === 'SPAT' && app.current_config.filter_key instanceof Array) {
    name_territorial_mesh = name_territorial_mesh.charAt(0).toUpperCase() + name_territorial_mesh.slice(1);
    document.querySelector('.filter_info').innerHTML = `${name_territorial_mesh} dans un voisinage de ${+d3.select('#dist_filter').property('value')} km`;
  } else if (app.current_config.filter_type === 'CUSTOM' && app.current_config.filter_key instanceof Array) {
    document.querySelector('.filter_info').innerHTML = `Sélection personnalisée de ${name_territorial_mesh}`;
  } else {
    document.querySelector('.filter_info').innerHTML = `Ensemble des ${name_territorial_mesh}`;
  }
}

/**
* Function to actually remove a chart a draw a new one, based on the current
* (filtered) dataset stored in `app.current_data`.
*
* @param {Object} chart -
* @param {Object} map_elem -
* @return {void}
*/
export function changeChart(type_new_chart, chart, map_elem) {
  chart.remove();
  // eslint-disable-next-line no-param-reassign
  chart = null;
  unbindUI();
  app.colors = {};
  if (type_new_chart.indexOf('BarChart1') > -1) {
    chart = new BarChart1(app.current_data); // eslint-disable-line no-param-reassign
  } else if (type_new_chart.indexOf('ScatterPlot2') > -1) {
    chart = new ScatterPlot2(app.current_data); // eslint-disable-line no-param-reassign
  } else if (type_new_chart.indexOf('RadarChart3') > -1) {
    chart = new RadarChart3(app.current_data); // eslint-disable-line no-param-reassign
  } else if (type_new_chart.indexOf('Similarity1plus') > -1) {
    chart = new Similarity1plus(app.current_data); // eslint-disable-line no-param-reassign
  }
  bindUI_chart(chart, map_elem); // eslint-disable-line no-use-before-define
  map_elem.bindBrushClick(chart);
  chart.bindMap(map_elem);
  app.chart = chart;
  app.map = map_elem;
  Tooltipsify('[title-tooltip]');
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
// eslint-disable-next-line no-use-before-define
export function bindUI_chart(chart, map_elem) {
  // Variable for slight timeout used for
  // some input fields to avoid refreshing as soon as the value is entered:
  let tm;

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
      if (this.classList.contains('disabled')) return;
      if (!this.classList.contains('checked')) {
        d3.selectAll('span.filter_v').attr('class', 'filter_v square');
        this.classList.add('checked');
        const filter_type = this.parentElement.getAttribute('filter-value');
        if (filter_type === 'SPAT') {
          app.current_config.filter_type = 'SPAT';
          const input_elem = document.getElementById('dist_filter');
          input_elem.removeAttribute('disabled');
          const dist = +input_elem.value;
          const ids = map_elem.getUnitsWithin(dist);
          applyFilter(app, ids);
        } else if (filter_type === 'CUSTOM') {
          app.current_config.filter_type = 'CUSTOM';
          document.getElementById('dist_filter').setAttribute('disabled', 'disabled');
          applyFilter(app, app.custom_studyzones[this.nextSibling.innerHTML]);
        } else {
          app.current_config.filter_type = 'DEFAULT';
          document.getElementById('dist_filter').setAttribute('disabled', 'disabled');
          applyFilter(app, filter_type);
        }
        chart.changeStudyZone();
        updateMyCategorySection();
      }
    });

  d3.select('#dist_filter')
    .on('change keyup', function () {
      clearTimeout(tm);
      tm = setTimeout(() => {
        if (+this.value < app.current_config.min_km_closest_unit) {
          this.value = app.current_config.min_km_closest_unit;
        }
        const ids = map_elem.getUnitsWithin(+this.value);
        applyFilter(app, ids);
        chart.changeStudyZone();
        updateMyCategorySection();
      }, 275);
    });

  // User change the targeted region:
  d3.selectAll('span.target_region')
    .on('click', function () {
      if (!this.classList.contains('checked')) {
        d3.selectAll('span.target_region').attr('class', 'target_region square');
        this.classList.add('checked');
        const id_region = this.getAttribute('value').slice(2);
        const old_nb_var = app.current_config.ratio.length;

        // Hide the list of availables regions:
        document.getElementById('list_regio').classList.add('hidden');
        // Set the name of the region (completed, with correct case, etc.) in
        // the input field:
        document.querySelector('.regio_name > #search').value = app.feature_names[id_region];
        document.querySelector('.regio_name > #autocomplete').value = app.feature_names[id_region];
        // Update the availables ratio on the left menu
        // (this may change the current selected ratio(s) as some variables are
        // not available for some features) and fetch the number of selected
        // variables after that:
        const new_nb_var = updateAvailableRatios(id_region);
        updateAvailableCharts(new_nb_var);
        changeRegion(app, id_region, map_elem);
        updateMenuStudyZones();
        updateMyCategorySection();
        if (new_nb_var >= app.current_config.nb_var) {
          if (old_nb_var === new_nb_var) {
            chart.updateChangeRegion();
          } else {
            d3.select('span.type_chart.selected').dispatch('click');
            alertify.warning('Une variable précédemment sélectionnée n\'est pas disponible pour ce territoire.');
          }
        } else {
          // If there fewer selected variables than requested by the current chart,
          // redraw the first (default) kind of chart:
          d3.select('span.chart_t1[value="BarChart1"]').dispatch('click');
          alertify.warning('Des variables sélectionnées sont indisponibles pour ce territoire. Un changement de représentation est nécessaire.');
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
      }
      // Update the top menu to display available charts according to the current
      // number of available variables:
      updateAvailableCharts(nb_var);
    });

  d3.selectAll('span.territ_level')
    .on('click', function () {
      if (!this.classList.contains('checked') && !this.parentNode.classList.contains('disabled')) {
        // Reset the study zone :
        d3.select('p[filter-value="DEFAULT"] > span.filter_v').dispatch('click');
        d3.selectAll('span.territ_level').attr('class', 'territ_level square');
        const level_value = this.getAttribute('value');
        d3.selectAll('.regioname')
          .style('display', d => (+d[level_value] === 1 ? null : 'none'))
          .selectAll('.square')
          .classed('checked', false);
        this.classList.add('checked');
        app.current_config.current_level = level_value;
        app.current_config.my_region = getRandom(app.full_dataset
          .filter(d => d.REGIOVIZ === '1' && +d[level_value] === 1).map(d => d.id));
        app.current_config.my_region_pretty_name = app.feature_names[app.current_config.my_region];
        document.querySelector('.regio_name > #search').value = app.current_config.my_region_pretty_name;
        document.querySelector('.regio_name > #autocomplete').value = app.current_config.my_region_pretty_name;
        document.querySelector(`.target_region.square[value="r_${app.current_config.my_region}"]`).classList.add('checked');
        // filterLevelVar(app);
        resetColors();
        d3.selectAll('p > span.filter_v').classed('checked', false);
        app.current_config.filter_type = 'DEFAULT';
        app.current_config.filter_key = undefined;
        filterLevelVar(app);
        map_elem.updateLevelRegion(level_value);
        const _id = app.chart._id.toString();
        changeChart(_id, chart, map_elem);
        updateMenuStudyZones();
        updateMyCategorySection();
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
  bindTopButtons(chart, map_elem); // eslint-disable-line no-use-before-define
}

/**
* Function to handle click on the top menu, in order to choose
* between available representations.
*
* @param {Object} chart -
* @param {Object} map_elem -
* @return {void}
*/
function bindTopButtons(chart, map_elem) {
  d3.selectAll('.type_chart')
    .on('click', function () {
      if (this.classList.contains('disabled')) return;
      // if (this.classList.contains('selected')) return;
      document.querySelector('.type_chart.selected').classList.remove('selected');
      this.classList.add('selected');
      const value = this.getAttribute('value');
      changeChart(value, chart, map_elem);
    });
}

export function bindHelpMenu() {
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

      let name_variable = o.name;
      const unit = o.unit;
      const year = name_variable.match(/\([^)]*\)$/)[0];
      const unit_year = `${year.slice(0, 1)}${unit}, ${year.slice(1, 6)}`;
      name_variable = name_variable.replace(year, unit_year);

      modal.setContent(
        `<p style="color: #4f81bd;font-size: 1.2rem;"><b>Description de l'indicateur</b></p>
        <p style="color: #4f81bd;font-size: 1.2rem;">${name_variable} (${code_variable})</p>
        <p style="text-align: justify;">${o.methodo.split('\n').join('<br>')}</p>
        <p><i>${o.source}</i></p>
        <p><i>Date de téléchargement de la donnée : ${o.last_update}</i></p>`);
      modal.open();
    };
  });

  const helps_buttons_study_zone = document.querySelector('#menu_studyzone').querySelectorAll('span.i_info');
  Array.prototype.slice.call(helps_buttons_study_zone).forEach((btn_i) => {
    // eslint-disable-next-line no-param-reassign, func-names
    btn_i.onclick = function () {
      const filter_id = this.parentElement.getAttribute('filter-value');
      if (filter_id === 'CUSTOM') {
        const name_studyzone = this.previousSibling.innerHTML;
        const regions = app.custom_studyzones[name_studyzone];
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
        const content = `<p style="color: #4f81bd;font-size: 1.2rem;"><b>Espace d'étude créé par l'utilisateur :</b></p>
<p style="color: #4f81bd;font-size: 1.2rem;"><b>${name_studyzone} (${regions.length} territoires)</b></p>
<p style="text-align: justify;">${regions.map(r => `<span class="i_regio" title="${app.feature_names[r]}">${r}</span>`).join(', ')}</p>
<br>
<br>
<p style="text-align:center;">
<button class="b_cancel button_red">Supprimer l'espace d'étude</button>
</p>`;
        modal.setContent(content);
        modal.open();
        document.querySelector('div.tingle-modal.tingle-modal--visible').querySelector('.button_red').onclick = function () {
          delete app.custom_studyzones[name_studyzone];
          app.custom_studyzones[name_studyzone] = null;
          Array.prototype.slice.call(document.querySelectorAll('p[filter-value="CUSTOM"]'))
            .forEach((el) => {
              if (el.querySelector('.label_chk').innerHTML === name_studyzone) {
                if (el.querySelector('.filter_v').classList.contains('checked')) {
                  document.querySelector('p[filter-value="DEFAULT"] > .filter_v').click();
                }
                el.remove();
              }
            });
          modal.close();
        };
      } else {
        const o = study_zones.find(d => d.id === filter_id);
        const hasUrl = (o.url && o.url.indexOf && o.url.indexOf('pdf') > -1);
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
        let content = `<p style="color: #4f81bd;font-size: 1.2rem;"><b>${o.name}</b></p>
  <p style="text-align: justify;">${o.methodology.split('\n').join('<br>')}</p>`;
        if (hasUrl) {
          content += `<p><a class="buttonDownload" href="data/${o.url}">Méthodologie détaillée (.pdf)</a></p>`;
        }
        modal.setContent(content);
        modal.open();
        if (hasUrl) {
          document.querySelector('a.buttonDownload').onclick = clickDlPdf;
        }
      }
    };
  });

  const helps_buttons_territ_unit = document.querySelector('#menu_territ_level').querySelectorAll('span.i_info');
  Array.prototype.slice.call(helps_buttons_territ_unit).forEach((btn_i) => {
    // eslint-disable-next-line no-param-reassign, func-names
    btn_i.onclick = function () {
      const territ_level_id = this.previousSibling.previousSibling.getAttribute('value');
      const o = territorial_mesh.find(d => d.id === territ_level_id);
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
      let content = `<p style="color: #4f81bd;font-size: 1.2rem;"><b>${o.name}</b></p>
<p style="text-align: justify;">${o.methodology.split('\n').join('<br>')}</p>`;
      if (o.id === 'N12_POL') {
        content += '<p><a class="buttonDownload" href="data/Doc_Maille_infranationale_decision.pdf">Méthodologie détaillée (.pdf)</a></p>';
      }
      modal.setContent(content);
      modal.open();
      if (o.id === 'N12_POL') {
        document.querySelector('a.buttonDownload').onclick = clickDlPdf;
      }
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
    modal.setContent(`
<p style="color: #4f81bd;font-size: 1.2rem;margin-bottom:2em;"><b>Regioviz</b> - À propos</p>
<p style="text-align: justify;">Version : <b>${app.version}</b></p>
<p style="text-align: justify;">Code source : <a href="https://github.com/riatelab/regioviz/">https://github.com/riatelab/regioviz/</a></b> (licence CeCILL 2.1)</p>
<p style="text-align: justify;">Développement : <b><a href="http://riate.cnrs.fr">UMS 2414 RIATE</a> (CNRS - CGET - Université Paris Diderot)</b></p>
<hr></hr>
<p style="text-align: justify;">Source des données : <b>Eurostat (téléchargement : octobre 2017)</b></p>
<p style="text-align: justify;">Limite administrative : <b>UMS RIATE, CC-BY-SA</b></p>
`);
    modal.open();
  };
}

function loadData() {
  let progress = 0;
  const total = 13718521;
  const text = d3.select('.top-spinner').select('#progress');
  const formatPercent = d3.format('.0%');
  const req = d3.request('data/data.zip')
    .responseType('arraybuffer')
    .on('progress', function(val) {
      const i = d3.interpolate(progress, val.loaded / total);
      d3.transition().tween("progress", function() {
        return function(t) {
          progress = i(t);
          text.text(`Préparation de la page ... ${formatPercent(progress * 0.91)}`);
        };
      });
    })
    .get(function(error, data) {
      if (error) throw error;
      const p = [];
      text.text(`Préparation de la page ... 95%`);
      setTimeout(() => {
        JSZip.loadAsync(data.response)
          .then(function(zip) {
            zip.forEach((relative_path, entry) => {
              p.push([entry.name, zip.file(entry.name).async('string')]);
            });
            p.sort((a, b) => a[0].toUpperCase() > b[0].toUpperCase());
            text.text(`Préparation de la page ... 95%`);
            return Promise.all(p.map(d => d[1]));
          }).then((res) => {
            text.text(`Préparation de la page ... 97%`);
            const back = JSON.parse(res[0]);
            const back_countries = JSON.parse(res[1]);
            const boundaries = JSON.parse(res[2]);
            const boxes = JSON.parse(res[3]);
            const coasts = JSON.parse(res[4]);
            const metadata_indicateurs = d3.csvParse(res[5]);
            const regions = JSON.parse(res[6]);
            const full_dataset = d3.csvParse(res[7]);
            const styles_map = JSON.parse(res[8]);
            const territoires_france = JSON.parse(res[9]);
            text.text(`Préparation de la page ... 99%`);
            return Promise.resolve([
              full_dataset, territoires_france, back, back_countries,
              boundaries, boxes, coasts, regions, styles_map, metadata_indicateurs,
            ]);
          })
          .then((results) => {
            text.text(`Préparation de la page ... 99%`);
            setTimeout(() => {
              document.body.classList.remove('loading');
              removeAll(document.querySelectorAll('.spinner, .top-spinner'));
              const [
                full_dataset, territoires_france, back, back_countries, boundaries, boxes,
                coasts, regions, styles_map, metadata_indicateurs,
              ] = results;
              alertify.set('notifier', 'position', 'bottom-left');
              prepareVariablesInfo(metadata_indicateurs);
              const features_menu = full_dataset.filter(ft => ft.REGIOVIZ === '1');
              // eslint-disable-next-line no-param-reassign
              features_menu.forEach((ft) => { ft.name = ft.name.replace(' — ', ' - '); });
              features_menu.sort((a, b) => a.name.localeCompare(b.name));
              const start_territorial_mesh = 'EPCI';
              const start_region = getRandom(full_dataset
                .filter(d => d.REGIOVIZ === '1' && +d[start_territorial_mesh] === 1).map(d => d.id));
              const start_variable = 'MED';
              prepare_dataset(full_dataset, app);
              setDefaultConfig(start_region, start_variable, start_territorial_mesh);
              prepareGeomLayerId(territoires_france, app.current_config.id_field_geom);
              createMenu(features_menu, variables_info.filter(d => d.group), study_zones, territorial_mesh);

              bindCreditsSource();
              updateMenuStudyZones();
              bindHelpMenu();
              makeTopMenu();
              makeHeaderChart();
              makeHeaderMapSection();
              console.log(start_region, start_variable, start_territorial_mesh);
              setDefaultConfigMenu(start_region, start_variable, start_territorial_mesh);
              filterLevelVar(app);
              const other_layers = new Map();
              [
                ['boxes', boxes],
                ['back', back],
                ['back_countries', back_countries],
                ['boundaries', boundaries],
                ['coasts', coasts],
                ['regions', regions],
              ].forEach((el) => {
                other_layers.set(el[0], el[1]);
              });
              const map_elem = new MapSelect(
                territoires_france, other_layers, styles_map, start_territorial_mesh);
              const chart = new BarChart1(app.current_data);
              bindUI_chart(chart, map_elem);
              map_elem.bindBrushClick(chart);
              chart.bindMap(map_elem);
              app.chart = chart;
              app.map = map_elem;
              Tooltipsify('[title-tooltip]');
              updateMyCategorySection();
              // Fetch the layer in geographic coordinates now in case the user wants to download it later:
              // d3.request('data/CGET_nuts_all.geojson', (err, result) => {
              //   app.geo_layer = result.response;
              // });
              // Load/configure mathjax to render some math formulas in help dialogs:
              MathJax.Hub.Config({
                tex2jax: {
                  inlineMath: [['$', '$'], ['\\(', '\\)']],
                  processEscapes: true,
                },
              });
            }, 15);
            // const tour = makeTour();
            // d3.select('#tour_link').on('click', () => { tour.start(); });
          });
      }, 15);
    });
}

loadData();

window.onresize = function () {
  const width_value_map = document.getElementById('map_section').getBoundingClientRect().width * 0.98;
  const width_value_chart = document.getElementById('bar_section').getBoundingClientRect().width * 0.98;
  const height_legend = document.querySelector('#svg_legend').viewBox.baseVal.height;
  d3.select('.cont_svg.cmap').style('padding-top', `${(fixed_dimension.map.height / fixed_dimension.map.width) * width_value_map}px`);
  d3.select('.cont_svg.cchart').style('padding-top', `${(fixed_dimension.chart.height / fixed_dimension.chart.width) * width_value_chart}px`);
  d3.select('.cont_svg.clgd').style('padding-top', `${(height_legend / fixed_dimension.legend.width) * width_value_map}px`);
};

const waitingOverlay = (function() {
  const overlay = document.createElement('div');
  overlay.id = 'overlay';
  overlay.style.display = 'none';
  overlay.innerHTML = `<div class="spinner2"></div>`;
  overlay.onclick = e => {
    if (overlay.style.display === 'none') return;
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  };
  document.body.insertBefore(overlay, document.getElementById('menutop'));
  return {
    display: () => { overlay.style.display = null; },
    hide: () => { overlay.style.display = 'none'; },
  };
}());

export const execWithWaitingOverlay = function(func) {
    waitingOverlay.display();
    setTimeout(() => {
      func();
      waitingOverlay.hide();
    }, 10);
}
