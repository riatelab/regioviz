import { app, territorial_mesh } from './../main';

/**
* Updates the section (located on the top of the map, just above the completude section)
* with informations about the name of the current territorial mesh and study zone.
*
*
* @return {void}
*
*/
export default function updateMyCategorySection() {
  const content_section = document.querySelector('.filter_info');
  let name_territorial_mesh = territorial_mesh
    .find(d => d.id === app.current_config.current_level).name;
  name_territorial_mesh = name_territorial_mesh.toLowerCase();
  if (app.current_config.filter_key === 'REG' || app.current_config.filter_key === 'OLD_REG') {
    name_territorial_mesh =
      name_territorial_mesh.charAt(0).toUpperCase() + name_territorial_mesh.slice(1);
    content_section.innerHTML = `${name_territorial_mesh} de la région ${app.current_config.my_category}`;
  } else if (app.current_config.my_category) {
    content_section.innerHTML = app.current_config.my_category;
  } else if (app.current_config.filter_type === 'SPAT' && app.current_config.filter_key instanceof Array) {
    name_territorial_mesh =
      name_territorial_mesh.charAt(0).toUpperCase() + name_territorial_mesh.slice(1);
    const dist_value = +d3.select('#dist_filter').property('value');
    content_section.innerHTML = `${name_territorial_mesh} dans un voisinage de ${dist_value} km`;
  } else if (app.current_config.filter_type === 'CUSTOM' && app.current_config.filter_key instanceof Array) {
    content_section.innerHTML = `Sélection personnalisée de ${name_territorial_mesh}`;
  } else {
    content_section.innerHTML = `Ensemble des ${name_territorial_mesh}`;
  }
}
