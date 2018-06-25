import tingle from 'tingle.js';
import alertify from 'alertifyjs';
import '../styles/main.css';
import '../styles/tingle.min.css';
import '../styles/tippy.css';
import '../styles/alertify.min.css';
import '../styles/semantic.min.css';
import '../styles/introjs.min.css';
import BarChart1 from './modules/charts/bar-chart-1v';
import ScatterPlot2 from './modules/charts/scatter-plot-2v';
import RadarChart3 from './modules/charts/radar-chart-3v';
import Similarity1plus from './modules/charts/similarity-1v';
import createMenu from './modules/menuleft';
import updateMyCategorySection from './modules/my-category';
import makeTour from './modules/guide-tour';
import { makeTopMenu, makeHeaderChart, makeHeaderMapSection } from './modules/menutop';
import { MapSelect, svg_map, zoomClick } from './modules/map';
import { color_highlight, MAX_VARIABLES, fixed_dimension } from './modules/options';
import { Tooltipsify } from './modules/tooltip';
import {
  clickDlPdf,
  getRandom,
  prepareGeomLayerId,
  removeAll,
  selectFirstAvailableVar,
  unbindUI,
} from './modules/helpers';
import {
  addVariable,
  applyFilter,
  changeRegion,
  filterLevelVar,
  parseStylesCsv,
  prepareDataset,
  prepareVariablesInfo,
  removeVariable,
  resetVariables,
} from './modules/prepare-data';

// Variables filled after reading the metadata file:
export const variables_info = [];
export const study_zones = [];
export const territorial_mesh = [];

// This variable contains informations about the current state of the application
// (id of the selected region, number of selected variables, their names, etc.).
// It will also references the variables 'map' and 'chart' (once created)
// respectively corresponding to the current map and the current chart.
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
  // (the 'REGIOVIZ_VERSION' string is replaced at build time)
  version: 'REGIOVIZ_VERSION',
  // The user is now allowed to create its custom study zones, this is where
  // we are storing a mapping "name_study_zone" -> [id_x, id_y, id_z, id_a, ...]:
  custom_studyzones: {},
  //
  current_config: {
    // The name of the field of the dataset containing the ID of each feature:
    id_field: 'id',
    // The name of the field of the dataset containing the name of each feature:
    name_field: 'name',
    // The name of the field of the dataset containing the population of each feature
    pop_field: null,
    // The name of the field of the geojson layer containing the ID of each feature
    // (these values should match with the values of the "id_field" in the
    // tabular dataset)
    id_field_geom: 'id',
    // An Array containing the id of one or more variables (currently selected in the UI)
    ratio: [],
    // Array containing the corresponding ratios 'pretty names' (same order).
    ratio_pretty_name: [],
    // Array containing the corresponding units (same order).
    ratio_unit: [],
    // Array containing the corresponding numerator id.
    num: [],
    // Array containing the corresponding denominator id.
    denum: [],
    // The territorial mesh currently in use:
    current_level: null,
    // The ID of the region currently in use:
    my_region: null,
    // The name of the region currently in use:
    my_region_pretty_name: null,
    // How many ratio are required for the current chart:
    nb_var: 1,
    // The kind of study zone between:
    // - null/undefined : no study zone
    //                  OR study zone defined by a key in the filter_key below,
    // - CUSTOM : a custom study zone created by the user,
    // - SPAT : filter by distance.
    filter_type: null,
    // If 'filter_type' above is CUSTOM or SPAT, the 'filter_key' should be
    // an Array containing the id of the various features of this study zone.
    // Otherwise 'null/undefined' if no study zone.
    // Or a key (as defined in the metadata/dataset) corresponding to a study zone.
    filter_key: null,
  },
};

/**
* Function to update the availables ratios in the left menu (after changing region).
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
  const data_my_feature = app.full_dataset
    .find(ft => ft[app.current_config.id_field] === my_region);
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
      new_var_names = Array.prototype.slice.call(new_var)
        .map(elem => elem.getAttribute('value'));
    }
    resetVariables(app, new_var_names);
  }
  return new_var.length;
}

function setDefaultConfig(code, variable, level) {
  const var_info = variables_info.find(ft => ft.id === variable);

  app.colors[app.current_config.my_region] = color_highlight;

  app.current_config.ratio = [variable];
  app.current_config.ratio_pretty_name = [var_info.name];
  app.current_config.ratio_unit = [var_info.unit];
  app.current_config.num = [var_info.id1];
  app.current_config.denum = [var_info.id2];
  app.current_config.current_level = level;
  app.current_config.my_region = code;
  app.current_config.my_region_pretty_name = app.feature_names[code];
}


function setDefaultConfigMenu(code, variable, level) {
  document.querySelector(`.target_region.square[value="r_${code}"]`).classList.add('checked');
  document.querySelector(`.target_variable.small_square[value="${variable}"]`).classList.add('checked');
  document.querySelector('p[filter-value="DEFAULT"] > .filter_v.square').classList.add('checked');
  document.querySelector(`.territ_level.square[value="${level}"]`).classList.add('checked');
  document.querySelector('.regio_name > #search').value = app.feature_names[code];
  document.querySelector('.regio_name > #autocomplete').value = app.feature_names[code];
  updateAvailableRatios(code);
}


/**
* Updates the "study zone" ("Espaces d'études") section in the left menu
* notably after the user changed its territorial mesh ('Unité territoriale')
* as the study zones can be different for each territorial mesh.
*
* @return {void}
*
*/
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
    },
  );
}

/**
* Reset the 'app.colors' variable (so its only hold informations
* about the color to use for my regions)
*
* @return {void}
*/
export function resetColors() {
  app.colors = {};
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

/**
* Function to actually remove a chart a draw a new one, based on the current
* (filtered) dataset stored in `app.current_data`.
*
* @param {Object} chart -
* @param {Object} map_elem -
* @return {void}
*/
export function changeChart(type_new_chart) {
  app.chart.remove();
  // eslint-disable-next-line no-param-reassign
  app.chart = null;
  unbindUI();
  app.colors = {};
  if (type_new_chart.indexOf('BarChart1') > -1) {
    app.chart = new BarChart1(app.current_data); // eslint-disable-line no-param-reassign
  } else if (type_new_chart.indexOf('ScatterPlot2') > -1) {
    app.chart = new ScatterPlot2(app.current_data); // eslint-disable-line no-param-reassign
  } else if (type_new_chart.indexOf('RadarChart3') > -1) {
    app.chart = new RadarChart3(app.current_data); // eslint-disable-line no-param-reassign
  } else if (type_new_chart.indexOf('Similarity1plus') > -1) {
    app.chart = new Similarity1plus(app.current_data); // eslint-disable-line no-param-reassign
  }
  bindUI_chart(); // eslint-disable-line no-use-before-define
  app.map.bindBrushClick(app.chart);
  app.chart.bindMap(app.map);
  // app.chart = chart;
  // app.map = map_elem;
  Tooltipsify('[title-tooltip]');
}

/**
* Create handlers for user events on the left menu and on the header of the map.
* This function is called each time the user changes the kind of chart.
*
* @return {void}
*
*/
// eslint-disable-next-line no-use-before-define
export function bindUI_chart() {
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
          const ids = app.map.getUnitsWithin(dist);
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
        app.chart.changeStudyZone();
        updateMyCategorySection();
      }
    });

  // User change the 'distance' value in the "study zone" section:
  d3.select('#dist_filter')
    .on('change keyup', function () {
      clearTimeout(tm);
      tm = setTimeout(() => {
        if (+this.value < app.current_config.min_km_closest_unit) {
          this.value = app.current_config.min_km_closest_unit;
        }
        const ids = app.map.getUnitsWithin(+this.value);
        applyFilter(app, ids);
        app.chart.changeStudyZone();
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
        changeRegion(app, id_region, app.map);
        updateMenuStudyZones();
        updateMyCategorySection();
        if (new_nb_var >= app.current_config.nb_var) {
          if (old_nb_var === new_nb_var) {
            app.chart.updateChangeRegion();
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
      let nb_var = Array.prototype.slice.call(document.querySelectorAll('span.target_variable'))
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
        app.chart.addVariable(code_variable);
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
        app.chart.removeVariable(code_variable);
      }
      // Update the top menu to display available charts according to the current
      // number of available variables:
      updateAvailableCharts(nb_var);
    });

  // User click on a territorial mesh to change it:
  d3.selectAll('span.territ_level')
    .on('click', function () {
      if (!this.classList.contains('checked') && !this.parentNode.classList.contains('disabled')) {
        // Reset the study zone :
        d3.selectAll('p > span.filter_v').classed('checked', false);
        app.current_config.filter_type = 'DEFAULT';
        app.current_config.filter_key = undefined;
        d3.select('p[filter-value="DEFAULT"] > span.filter_v').classed('checked', true); /* .dispatch('click'); */
        d3.selectAll('span.territ_level').attr('class', 'territ_level square');
        // Store the new level value:
        const level_value = this.getAttribute('value');
        // How many variables are currently selected ?
        // (maybe the new regions dont have all theses ratios available)
        const old_nb_var = app.current_config.ratio.length;
        // Id of the current region (before changing level):
        const old_my_region = app.current_config.my_region;
        const obj_old_region = app.full_dataset.find(d => d.id === old_my_region);
        // For each feature we precomputed the nearest feature in each
        // territorial level:
        const nearest_new_region = obj_old_region[`nearest_${level_value}`] || getRandom(
          app.full_dataset.filter(d => d.REGIOVIZ === '1' && +d[level_value] === 1)
            .map(d => d.id));

        // Update the menu displaying region names:
        d3.selectAll('.regioname')
          .style('display', d => (+d[level_value] === 1 ? null : 'none'))
          .selectAll('.square')
          .classed('checked', false);
        this.classList.add('checked');
        // Update to our new parameters (new territorial level, new region id, no study zone)
        app.current_config.current_level = level_value;
        app.current_config.my_region = nearest_new_region;
        app.current_config.my_region_pretty_name = app.feature_names[app.current_config.my_region];
        // Reflect theses changes in the left menu:
        document.querySelector('.regio_name > #search').value = app.current_config.my_region_pretty_name;
        document.querySelector('.regio_name > #autocomplete').value = app.current_config.my_region_pretty_name;
        document.querySelector(`.target_region.square[value="r_${app.current_config.my_region}"]`)
          .classList.add('checked');

        // Update the dataset extract in use for our charts:
        resetColors();
        filterLevelVar(app);
        app.map.updateLevelRegion(level_value);
        const new_nb_var = updateAvailableRatios(app.current_config.my_region);
        updateAvailableCharts(new_nb_var);
        // changeRegion(app, id_region, app.map);
        updateMenuStudyZones();
        updateMyCategorySection();

        // We may need to change the kind of chart if all the ratios previously
        // selected aren't available for this region:
        if (new_nb_var >= app.current_config.nb_var) {
          if (new_nb_var < old_nb_var) {
            alertify.warning(
              'Une variable précédemment sélectionnée n\'est pas disponible pour ce territoire.');
          }
          changeChart(app.chart._id.toString());
        } else {
          // If there fewer selected variables than requested by the current chart,
          // redraw the first (default) kind of chart:
          alertify.warning([
            'Des variables sélectionnées sont indisponibles pour ce territoire. ',
            'Un changement de représentation est nécessaire.'].join(''));
          changeChart('BarChart1');
        }
      }
    });

  // Dispatch a click event on the associated checkbox when the text is clicked:
  d3.selectAll('span.label_chk')
    .on('click', function () {
      this.previousSibling.click();
    });

  const header_map_section = d3.select('#map_section > #header_map');

  // User click on the selection rectangle on the top of the map
  // (to activate brushing on the map)
  header_map_section.select('#img_rect_selec')
    .on('click', function () {
      if (!this.classList.contains('active')) {
        this.classList.add('active');
        // document.getElementById('img_map_zoom').classList.remove('active');
        document.getElementById('img_map_select').classList.remove('active');
        // svg_map.on('.zoom', null);
        if (app.map.brush_map) {
          svg_map.select('.brush_map').style('display', null);
        }
        app.map.target_layer.selectAll('path').on('click', null);
      }
    });

  // // User click on the magnifying glass on the top of the map
  // // (to activate zooming with the mouse)
  // header_map_section.select('#img_map_zoom')
  //   .on('click', function () {
  //     if (!this.classList.contains('active')) {
  //       this.classList.add('active');
  //       document.getElementById('img_rect_selec').classList.remove('active');
  //       document.getElementById('img_map_select').classList.remove('active');
  //       svg_map.call(app.map.zoom_map);
  //       if (app.map.brush_map) {
  //         svg_map.select('.brush_map').call(app.map.brush_map.move, null);
  //         svg_map.select('.brush_map').style('display', 'none');
  //       }
  //       app.map.target_layer.selectAll('path').on('click', null);
  //     }
  //   });

  // User click on the arrow button on the top of the map
  // (to activate selection of individual feature on the map)
  header_map_section.select('#img_map_select')
    .on('click', function () {
      if (!this.classList.contains('active')) {
        this.classList.add('active');
        document.getElementById('img_rect_selec').classList.remove('active');
        // document.getElementById('img_map_zoom').classList.remove('active');
        // svg_map.on('.zoom', null);
        if (app.map.brush_map) {
          svg_map.select('.brush_map').call(app.map.brush_map.move, null);
          svg_map.select('.brush_map').style('display', 'none');
        }
        app.map.target_layer.selectAll('path')
          .on('click', function (d) {
            app.chart.handleClickMap(d, this);
          });
      }
    });

  // Zoom in and zoom out buttons on the top of the map:
  header_map_section.select('#zoom_in')
    .on('click', zoomClick);

  header_map_section.select('#zoom_out')
    .on('click', zoomClick);

  // Can we brush and/or click to select regions on this map/chart combination:
  if (!app.map.brush_map) {
    if (app.chart.handleClickMap) {
      app.map.target_layer.selectAll('path')
        .on('click', function (d) {
          app.chart.handleClickMap(d, this);
        });
    } else {
      app.map.target_layer.selectAll('path')
        .on('click', null);
    }
  }
  bindTopButtons(); // eslint-disable-line no-use-before-define
}

/**
* Function to handle click on the top menu, in order to choose
* between available representations.
*
* @param {Object} chart -
* @param {Object} map_elem -
* @return {void}
*/
function bindTopButtons() {
  d3.selectAll('.type_chart')
    .on('click', function () {
      if (this.classList.contains('disabled')) return;
      // if (this.classList.contains('selected')) return;
      document.querySelector('.type_chart.selected').classList.remove('selected');
      this.classList.add('selected');
      const value = this.getAttribute('value');
      changeChart(value);
    });
}

/**
* Binds the various 'i' icons to the appropriate modal boxes
* (the function is exported because we need to call it again after creation/deletion
* of custom study zones).
*
* @return {void}
*/
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
        <p><i>Date de dernière mise à jour de la donnée : ${o.last_update}</i></p>`);
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
<p style="text-align: justify;">${o.methodology.split('\n').join('<br>')}</p>
<p><i>${o.source || ''}</i></p>
<p><i>${o.last_update || ''}</i></p>`;

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

/**
* User click on the 'crédits & informations supplémentaires' link
*
* @return {void}
*
*/
function bindCreditsSource(credits_data) {
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
<p style="color: #4f81bd;font-size: 1.2rem;margin-bottom:1em;">Sources</p>
<p style="text-align: justify;">Données : <b>${credits_data.find(d => d.item === 'data_source').desc}</b></p>
<p style="text-align: justify;">Territoires d'étude : <b>${credits_data.find(d => d.item === 'study_area').desc}</b></p>
<p style="text-align: justify;">Géométries : <b>${credits_data.find(d => d.item === 'geom').desc}</b></p>
`);
    modal.open();
  };
}

function getRandomStartingState() {
  const first_var_group = variables_info[0].group;
  // Variable codes from the first group of variables displayed:
  const var_first_group = variables_info
    .filter(d => d.group === first_var_group)
    .map(d => d.id);
  // Code of existing territorial mesh:
  const available_territ_mesh = territorial_mesh.map(d => d.id);
  // Randomly chose a territorial mesh:
  const start_territorial_mesh = getRandom(available_territ_mesh);

  // Then we are picking a region from this territorial mesh:
  const start_region = getRandom(app.full_dataset
    .filter(d => d.REGIOVIZ === '1' && +d[start_territorial_mesh] === 1)
    .map(d => d.id));

  const obj_my_region = app.full_dataset.find(d => d.id === start_region);
  // Which are the variables from the first group also available for
  // this region:
  const available_var_first_group = [];
  var_first_group.forEach((v) => {
    // eslint-disable-next-line no-restricted-globals
    if (!isNaN(+obj_my_region[v])) {
      available_var_first_group.push(v);
    }
  });
  // Randomly chose a variable among them:
  const start_variable = getRandom(available_var_first_group);
  return { start_territorial_mesh, start_region, start_variable };
}

/**
* Main function, fetching the data.zip archive, reading it and prepaaring
* the dataset and the page to display the first chart.
*
* @return {void}
*
*/
function loadData() {
  let progress = 0;
  // Will be replaced by the appropriate value at build time:
  const total = 'ZIP_SIZE';
  const text = d3.select('.top-spinner').select('#progress');
  const formatPercent = d3.format('.0%');

  d3.request('data/data.zip')
    .responseType('arraybuffer')
    .on('progress', (val) => {
      const i = d3.interpolate(progress, val.loaded / total);
      d3.transition().tween('progress', () => (t) => {
        progress = i(t);
        text.text(`Préparation de la page ... ${formatPercent(progress * 0.91)}`);
      });
    })
    .get((error, data) => {
      if (error) throw error;
      const other_layers = new Map();
      const p_layers = [];
      const name_layers = [];
      let territoires_layer;
      let metadata_indicateurs;
      let full_dataset;
      let styles_map;
      let credits_data;
      text.text('Préparation de la page ... 95%');
      setTimeout(() => {
        // Extract the content of the data.zip archive:
        JSZip.loadAsync(data.response)
          .then((zip) => {
            const p1 = [];
            // Store separatly the files for which we know the name
            // (REGIOVIZ_META.csv, styles.json and REGIOVIZ_DATA.csv)
            // and the other files (which are GeoJSON layer)
            zip.forEach((relative_path, entry) => {
              const n = entry.name;
              if (n.indexOf('REGIOVIZ_META') > -1) {
                p1[0] = zip.file(n).async('string');
              } else if (n.indexOf('REGIOVIZ_DATA') > -1) {
                p1[1] = zip.file(n).async('string');
              } else if (n.indexOf('REGIOVIZ_STYLES') > -1) {
                p1[2] = zip.file(n).async('string');
              } else if (n.indexOf('REGIOVIZ_CREDITS') > -1) {
                p1[3] = zip.file(n).async('string');
              } else {
                name_layers.push(n);
                p_layers.push(zip.file(n).async('string'));
              }
            });
            text.text('Préparation de la page ... 95%');
            return Promise.all(p1);
          }).then((res_data1) => {
            // Extract the 4 mandatory files (metadata, full dataset, credits
            // and the styles for the map)
            text.text('Préparation de la page ... 96%');
            metadata_indicateurs = d3.csvParse(res_data1[0]);
            full_dataset = d3.csvParse(res_data1[1]);
            styles_map = parseStylesCsv(res_data1[2]);
            credits_data = d3.csvParse(res_data1[3]);
            return Promise.all(p_layers);
          }).then((res_layers) => {
            // Use the 'REGIOVIZ_STYLES' info to fetch the name of the various layers to use:
            const layer_names = Object.keys(styles_map);
            // Reference our various layer and the target layer:
            layer_names.forEach((name) => {
              const ix = name_layers
                .findIndex(d => d.replace('.geojson', '') === name);
              if (styles_map[name].target === 'true') {
                territoires_layer = JSON.parse(res_layers[ix]);
              } else {
                other_layers.set(name, JSON.parse(res_layers[ix]));
              }
            });
            text.text('Préparation de la page ... 97%');
            setTimeout(() => {
              text.text('Préparation de la page ... 98%');
              // Alertifty will be use to notify 'warning' to the user
              // (such as the selection of a feature needing a change of chart)
              alertify.set('notifier', 'position', 'bottom-left');

              // Notably fill the 3 variables defined on the top of this file
              // 'study_zones', 'territorial_mesh' and 'variables_info'
              // with the appropriate metadata extracted from
              // the 'REGIOVIZ_META.csv' file
              prepareVariablesInfo(metadata_indicateurs, app);

              // Notably extract the feature names from the dataset:
              prepareDataset(full_dataset, app);

              // Info regarding the state on which the application will be initialized
              const {
                start_territorial_mesh,
                start_region,
                start_variable,
              } = getRandomStartingState();

              // Lets store these info on the global 'app' variable:
              setDefaultConfig(start_region, start_variable, start_territorial_mesh);

              // Prepare the targeted geometry layer:
              prepareGeomLayerId(territoires_layer);

              // Extract the features (regions) to be displayed for selection
              // in the left menu:
              const features_menu = full_dataset.filter(ft => ft.REGIOVIZ === '1');
              // eslint-disable-next-line no-param-reassign
              features_menu.forEach((ft) => { ft.name = ft.name.replace(' — ', ' - '); });
              // Sort them alphabetically:
              features_menu.sort((a, b) => a.name.localeCompare(b.name));

              // Remove the loading spinner displayed until now:
              text.text('Préparation de la page ... 99%');
              document.body.classList.remove('loading');
              removeAll(document.querySelectorAll('.spinner, .top-spinner'));

              // Create the left menu:
              createMenu(
                features_menu,
                variables_info.filter(d => d.group),
                study_zones,
                territorial_mesh,
              );
              // Binds various interactions on the left menu
              // (only done once at its creation)
              bindCreditsSource(credits_data);
              updateMenuStudyZones();
              bindHelpMenu();

              // Set, in this menu, the various parameters we defined above:
              setDefaultConfigMenu(start_region, start_variable, start_territorial_mesh);

              // Create the menu located on the top of the page:
              makeTopMenu();

              // Prepare the header for the chart and for the map:
              makeHeaderChart();
              makeHeaderMapSection();

              // Filter the 'full_dataset' according to our parameters defined above
              // (will only extract the feature within our territorial mesh and study zone)
              // (basically this will be done on each change of : region, study zone,
              // territorial mesh, variable addition/removing, and change of chart)
              filterLevelVar(app);

              // Update the section about the current study zone
              // (located on the header of the map)
              updateMyCategorySection();

              // Create the SVG map:
              app.map = new MapSelect(
                territoires_layer,
                other_layers,
                styles_map,
                start_territorial_mesh,
              );

              // Create the first chart (displayed by default):
              app.chart = new BarChart1(app.current_data);

              // Binds the various interactions between the chart and the map
              // (and their respecting headers):
              bindUI_chart(app.chart, app.map);
              app.map.bindBrushClick(app.chart);
              app.chart.bindMap(app.map);

              // Create the tooltips:
              Tooltipsify('[title-tooltip]');

              // Fetch the layer in geographic coordinates now
              // in case the user wants to download it later:
              d3.request('data/territoires_france.geojson', (err, result) => {
                if (err) throw err;
                app.geo_layer = result.response;
              });

              // Load/configure mathjax to render some math formulas in help dialogs:
              MathJax.Hub.Config({
                tex2jax: {
                  inlineMath: [['$', '$'], ['\\(', '\\)']],
                  processEscapes: true,
                },
              });
              d3.select('#tour_link')
                .on('click', () => {
                  makeTour().start();
                });
            }, 15);
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
