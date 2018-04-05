import { color_highlight } from './options';
import { variables_info, study_zones, territorial_mesh, updateMenuStudyZones, updateMenuTerritLevel, bindUI_chart } from './../main';
import { _isNaN, unbindUI } from './helpers';
import BarChart1 from './charts/barChart_1v';
import ScatterPlot2 from './charts/scatterPlot_2v';
import RadarChart3 from './charts/radarChart_3v';
import Similarity1plus from './charts/similarity1v';

/* eslint-disable no-param-reassign */

/**
* Attach the full_dataset Array to the app Object and create a dictionnary
* allowing to obtain territorial units name from their Id.
*
* @param {Array} full_dataset - The dataset as an Array of Object
* @param {Object} app - The variable containing the global parameters about
*   the current state of the application.
* @return {void}
*
*/
export function prepare_dataset(full_dataset, app) {
  app.full_dataset = full_dataset;
  // Create an Object feature_id ->  feature_name for easier lookup:
  app.feature_names = {};
  full_dataset.forEach((elem) => {
    app.feature_names[elem.id] = elem.name;
  });
}


/**
* Filter the initial dataset in order to obtain only the features
* concerned by the current territorial division and by the selected study area
* (or the geographical neighborhood) if any. The returned extract also only contains
* the variables currently selected in the interface.
*
* @param {Object} app - The variable containing the global parameters about
*   the current state of the application.
* @return {Array} - The filtered data, containing only the requested variables
*   for the feature of the current study zone, without features containing empty ratios.
*
*/
export function filterLevelVar(app) {
  // Fetch the name(s) of the ratio (and associated num and denum variable),
  // the name of the targeted region and the current level :
  const {
    num, denum, ratio, current_level, id_field, filter_key, name_field, my_region, pop_field,
  } = app.current_config;

  const all_variables = ratio.concat(num).concat(denum).concat([pop_field]);
  // Prepare the data:
  let temp;
  if (filter_key instanceof Array) {
    temp = app.full_dataset
      .filter(ft => +ft[current_level] && filter_key.indexOf(ft[id_field]) > -1);
    app.current_config.my_category = null;
  } else if (filter_key) {
    const my_category = app.full_dataset.filter(ft => ft[id_field] === my_region)[0][filter_key];
    temp = app.full_dataset
      .filter(ft => +ft[current_level] && ft[filter_key] === my_category);
    app.current_config.my_category = my_category;
  } else {
    temp = app.full_dataset
      .filter(ft => +ft[current_level]);
    app.current_config.my_category = null;
  }
  temp = temp.map((ft) => {
    const props_feature = {
      id: ft[id_field],
      name: ft[name_field],
    };
    for (let i = 0, len_i = all_variables.length; i < len_i; i++) {
      props_feature[all_variables[i]] = +ft[all_variables[i]];
    }
    return props_feature;
  });
  app.current_data = temp;
}


/**
* Function allowing to filter the entities of the geographical layer
* according to the territorial division chosen.
*
* @param {Array} nuts_features - The array of geojson Feature to be filtered.
* @return {Array} - The filtered array.
*
*/
export function filterLevelGeom(nuts_features, filter = 'N1') {
  return nuts_features.filter(d => d.properties[filter] === 1);
}

/**
* Function to prepare 3 global variables (both are Array of Objects) from the array
* containing the readed 'metadata.csv' file. They respectively describe: the variables
* to be used in the application (code, pretty name, unit, methodology, data source, date, etc),
* the study areas to use (name, display level, etc.) and the reference territorial divisions
* (each one described by a code making it possible to filter the features of the geographic layer
* and the features in the reference dataset.)
*
* @param {Array} metadata_indicateurs - The array returned by d3.csv.
* @return {void} - Nothing as these 3 objects are globals and modified in place.
*
*/
export function prepareVariablesInfo(metadata_indicateurs) {
  metadata_indicateurs
    .filter(ft => ft.Regioviz_item === 'Indicateur' || ft.Regioviz_item === 'Stock')
    .forEach((ft) => {
      variables_info.push({
        id: ft.id,
        id1: `${ft.id1}`,
        id2: `${ft.id2}`,
        name: `${ft.Name} (${parseInt(ft.Year, 10)})`,
        unit: `${ft.Unit}`,
        group: ft.Theme,
        methodo: ft.Methodology,
        source: ft.Data_source,
        last_update: ft.Last_update,
        formula: ft.Formula,
      });
    });
  metadata_indicateurs
    .filter(ft => ft.Regioviz_item === 'Study Area')
    .forEach((ft) => {
      study_zones.push({
        name: ft.Name,
        id: ft.id,
        display_level: ft.Theme,
        methodology: ft.Methodology,
        url: ft.URL,
      });
    });
  metadata_indicateurs
    .filter(ft => ft.Regioviz_item === 'Territorial division')
    .forEach((ft) => {
      territorial_mesh.push({ name: ft.Name, id: ft.id, methodology: ft.Methodology });
    });
}

/**
* Set and apply a new filter (ie. restrict the study area) on the dataset to be used.
*
* @param {String} filter_type - The name of the filter to use.
* @return {void}
*
*/
export function applyFilter(app, filter_type) {
  if (filter_type === 'filter_country') {
    app.current_config.filter_key = 'Pays';
  } else if (filter_type === 'DEFAULT') {
    app.current_config.filter_key = undefined;
  } else if (filter_type instanceof Array) {
    app.current_config.filter_key = filter_type;
  } else {
    app.current_config.filter_key = filter_type;
  }
  filterLevelVar(app);
  app.colors = {};
  app.colors[app.current_config.my_region] = color_highlight;
}

/**
* Apply a region change (made in the left menu) in the various global variables
* containing specific information about "my region".
*
* @param {Object} app - The variable containing the global parameters about
*   the current state of the application.
* @param {String} id_region - The id of the new targeted feature (my region).
* @param {Object} map_elem - The current instance of the displayed map.
* @return {Void}
*
*/
export function changeRegion(app, id_region, map_elem) {
  const current_level = app.current_config.current_level;
  const o_region = app.full_dataset.find(d => d.id === id_region);
  const available_level = [];
  app.current_config.my_region = id_region;
  app.current_config.my_region_pretty_name = app.feature_names[app.current_config.my_region];
  if (o_region.N1 === '1') available_level.push('N1');
  if (o_region.N12_POL === '1') available_level.push('N12_POL');
  if (o_region.N2 === '1') available_level.push('N2');
  if (available_level.indexOf('N12_POL') > -1) {
    available_level.splice(available_level.indexOf('N12_POL'), 1);
  }
  // TODO: Wrap this in a function/put this somewhere else:
  d3.select('#curr_regio_level').html(available_level.join(' '));
  updateMenuTerritLevel();
  let a = false;
  if (available_level.indexOf(current_level) < 0) {
    const level_value = available_level[0];
    d3.selectAll('p > span.filter_v').classed('checked', false);
    d3.select('p[filter-value="DEFAULT"] > span.filter_v').classed('checked', true);
    d3.selectAll('span.territ_level').attr('class', 'territ_level square');
    d3.select(`span.territ_level[value='${level_value}']`).attr('class', 'territ_level square checked');
    app.current_config.filter_type = 'DEFAULT';
    app.current_config.filter_key = undefined;
    app.current_config.current_level = level_value;
    updateMenuStudyZones();
    filterLevelVar(app);
    map_elem.updateLevelRegion(level_value);
    const _id = app.chart._id.toString();
    app.chart.remove();
    app.chart = null; // eslint-disable-line no-param-reassign
    unbindUI();
    // map_elem.resetZoom();
    app.colors = {};
    if (_id === 'Symbol(1)') {
      app.chart = new BarChart1(app.current_data); // eslint-disable-line no-param-reassign
    } else if (_id === 'Symbol(2)') {
      app.chart = new ScatterPlot2(app.current_data); // eslint-disable-line no-param-reassign
    } else if (_id === 'Symbol(3)') {
      app.chart = new RadarChart3(app.current_data); // eslint-disable-line no-param-reassign
    } else if (_id === 'Symbol(4)') {
      app.chart = new Similarity1plus(app.current_data); // eslint-disable-line no-param-reassign
    }
    bindUI_chart(app.chart, app.map);
    map_elem.bindBrushClick(app.chart);
    app.chart.bindMap(app.map);
    a = true;
  } else {
    // Reset the color to use on the chart/map:
    app.colors = {};
    app.colors[app.current_config.my_region] = color_highlight;

    if (app.current_config.filter_type === 'SPAT' && app.current_config.filter_key instanceof Array) {
      app.current_config.filter_key = map_elem.getUnitsWithin(+document.getElementById('dist_filter').value);
      filterLevelVar(app);
    } else if (app.current_config.filter_key) {
      filterLevelVar(app);
    }
  }
  map_elem.computeDistMat();
  app.current_config.min_km_closest_unit = Math.round(
    map_elem.dist_to_my_region[2].dist / 1000) + 1;
  const input_dist = document.querySelector('#dist_filter');
  input_dist.setAttribute('min', app.current_config.min_km_closest_unit);
  if (input_dist.value < app.current_config.min_km_closest_unit) {
    input_dist.value = app.current_config.min_km_closest_unit + 100;
  }

  return a;
}

/**
* Adds a variable to the currently used extract of the dataset (previously
* obtained with the 'filterLevelVar' function).
*
* @param app - The variable containing the global parameters about
*   the current state of the application.
* @param code_ratio - The code of the variable to be added.
* @return {void}
*/
export function addVariable(app, code_ratio) {
  const variable_info = variables_info.filter(d => d.id === code_ratio)[0];
  app.colors = {};
  app.colors[app.current_config.my_region] = color_highlight;
  app.current_config.num.push(variable_info.id1);
  app.current_config.denum.push(variable_info.id2);
  app.current_config.ratio.push(variable_info.id);
  app.current_config.ratio_pretty_name.push(variable_info.name);
  app.current_config.ratio_unit.push(variable_info.unit);
  filterLevelVar(app);
}

/**
* Removes a variable from the currently used extract of the dataset (previously
* obtained with the 'filterLevelVar' function).
*
* @param app - The variable containing the global parameters about
*   the current state of the application.
* @param code_ratio - The code of the variable to be remove.
* @return {void}
*/
export function removeVariable(app, code_ratio) {
  const ix = app.current_config.ratio.indexOf(code_ratio);
  app.current_config.num.splice(ix, 1);
  app.current_config.denum.splice(ix, 1);
  app.current_config.ratio.splice(ix, 1);
  app.current_config.ratio_pretty_name.splice(ix, 1);
  app.current_config.ratio_unit.splice(ix, 1);
  filterLevelVar(app);
}

/**
* Reset the current variables in use (used in order to avoid successive calls
* to addVariable and removeVariable if necessary).
*
* @param app - The variable containing the global parameters about
*   the current state of the application.
* @param codes_ratio -
* @return {void}
*/
export function resetVariables(app, codes_ratio) {
  app.colors = {};
  app.colors[app.current_config.my_region] = color_highlight;
  app.current_config.num = [];
  app.current_config.denum = [];
  app.current_config.ratio = [];
  app.current_config.ratio_pretty_name = [];
  app.current_config.ratio_unit = [];
  for (let i = 0, len = codes_ratio.length; i < len; i++) {
    const code_ratio = codes_ratio[i];
    const variable_info = variables_info.filter(d => d.id === code_ratio)[0];
    app.current_config.num.push(variable_info.id1);
    app.current_config.denum.push(variable_info.id2);
    app.current_config.ratio.push(variable_info.id);
    app.current_config.ratio_pretty_name.push(variable_info.name);
    app.current_config.ratio_unit.push(variable_info.unit);
  }
  filterLevelVar(app);
}

/**
* Compute the ratio of available (= not empty) values (the completeness) within
* the subset currently in use for all the variables in "vars".
*
* @param {Object} app - The variable containing the global parameters about
*   the current state of the application.
* @param {Array} vars - A list of variable names for which completeness will be calculated.
* @param {String} output - Whether to output the result as a Number or as an Array
* @return {Number or Array} - Number: The ratios of features with available values within
*    the study zone (in %) or, Array : the number of features with available values
*    and the total number of features.
*/
export function calcCompletudeSubset(app, vars, output = 'ratio') {
  const {
    current_level, id_field, filter_key, my_region,
  } = app.current_config;

  // Compute the length of the dataset (within the "study zone" if any):
  let temp;
  if (filter_key instanceof Array) {
    temp = app.full_dataset
      .filter(ft => !!+ft[current_level] && filter_key.indexOf(ft[id_field]) > -1);
  } else if (filter_key) {
    const my_category = app.full_dataset.find(ft => ft[id_field] === my_region)[filter_key];
    temp = app.full_dataset
      .filter(ft => !!+ft[current_level] && ft[filter_key] === my_category);
  } else {
    temp = app.full_dataset
      .filter(ft => !!+ft[current_level]);
  }
  const total_length = temp.length;

  // Compute the length of the dataset if we filter empty features
  // on all the variables of "vars":
  temp = temp.map((ft) => {
    const props_feature = {
      id: ft[id_field],
    };
    for (let i = 0, len_i = vars.length; i < len_i; i++) {
      props_feature[vars[i]] = +ft[vars[i]];
    }
    return props_feature;
  }).filter(ft => vars.map(ratio_name => !!ft[ratio_name]).every(v => v === true));
  const filtered_length = temp.length;

  if (!(output === 'ratio')) {
    // Return the number of features with available values within
    // the study zone, and the total number of features of the study zone
    return [filtered_length, total_length];
  }
  // Return the ratio of available values ("complétude") within
  // the study zone selected by the user:
  return Math.round((filtered_length / total_length) * 10000) / 100;
}

/**
* Compute the ratio of population covered by features on which all the variables
* of "vars" are available.
*
* @param {Object} app -The variable containing the global parameters about
*   the current state of the application.
* @param {Array} vars - A list of variable names for which completeness will be calculated.
* @return {Number} - The ratio (in %) of population covered by features for which
*   are available within the study zone.
*
*/
export function calcPopCompletudeSubset(app, vars) {
  const {
    current_level, id_field, filter_key, my_region, pop_field,
  } = app.current_config;

  // Compute the total population stock of the data (within the "study zone" if any):
  let temp;
  if (filter_key instanceof Array) {
    temp = app.full_dataset
      .filter(ft => !!+ft[current_level] && filter_key.indexOf(ft[id_field]) > -1);
  } else if (filter_key) {
    const my_category = app.full_dataset.find(ft => ft[id_field] === my_region)[filter_key];
    temp = app.full_dataset
      .filter(ft => !!+ft[current_level] && ft[filter_key] === my_category);
  } else {
    temp = app.full_dataset
      .filter(ft => !!+ft[current_level]);
  }
  let total_pop = 0;
  for (let i = 0, len = temp.length; i < len; i++) {
    total_pop += _isNaN(+temp[i][pop_field]) ? 0 : +temp[i][pop_field];
  }
  // Compute the population stock of the dataset if we filter empty features
  // on all the variables of "vars":
  temp = temp.map((ft) => {
    const props_feature = {
      id: ft[id_field],
      pop: +ft[pop_field],
    };
    for (let i = 0, len_i = vars.length; i < len_i; i++) {
      props_feature[vars[i]] = +ft[vars[i]];
    }
    return props_feature;
  }).filter(ft => vars.map(ratio_name => !!ft[ratio_name]).every(v => v === true));
  let subset_pop = 0;
  for (let i = 0, len = temp.length; i < len; i++) {
    subset_pop += _isNaN(temp[i].pop) ? 0 : temp[i].pop;
  }
  // Return the ratio of population values ("complétude") within
  // the study zone selected by the user:
  return Math.round((subset_pop / total_pop) * 10000) / 100;
}
/* eslint-enable no-param-reassign */
