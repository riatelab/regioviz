import { removeDuplicates } from './helpers';
import { app } from './../main';


const createMenu = function createMenu(names, variables, study_zones, territorial_mesh) {
  // First section, regions names:
  // const title_section1 = document.createElement('p');
  // title_section1.className = 'title_menu';
  // title_section1.innerHTML = 'Ma région';
  const title_section1 = document.createElement('div');
  title_section1.style.backgroundColor = '#4f81bd';
  title_section1.style.color = 'white';
  title_section1.style.overflow = 'hidden';
  title_section1.innerHTML = `
<div class="regio_name">
<p>Ma région : </p>
<input type = "text" id = "search"/>
<input id="autocomplete" type="text" disabled="disabled" />
<span class='down_arrow'> &#x25BE;</span>`;

  const section1 = document.createElement('div');
  section1.id = 'list_regio';
  section1.className = 'box hidden';
  section1.style.overflow = 'auto';
  // section1.style.height = '15%';
  // section1.style.height = '0';
  for (let i = 0, len_i = names.length; i < len_i; i++) {
    // const id = names[i].id;
    // const name = names[i].name;
    const { id, name } = names[i];
    const entry = document.createElement('p');
    entry.innerHTML = `<span value="${id}" class='target_region square'></span><span class="label_chk">${name}</span>`;
    section1.appendChild(entry);
  }

  // Second section, groups of variables:
  const title_section2 = document.createElement('p');
  title_section2.className = 'title_menu';
  title_section2.innerHTML = 'Indicateurs';
  const section2 = document.createElement('div');
  section2.id = 'menu_variables';
  section2.className = 'box';
  section2.style.overflow = 'auto';
  section2.style.height = '25%';

  // Filter the "variables" variable to fetch the group names :
  const groups_var = removeDuplicates(variables.map(d => d.group).filter(d => d !== 'Num/dénom'));

  for (let i = 0, len_i = groups_var.length; i < len_i; i++) {
    const gp_name = groups_var[i];
    const entry = document.createElement('p');
    entry.className = 'name_group_var';
    entry.style.cursor = 'pointer';
    entry.innerHTML = (i === 0)
      ? `<span class='arrow arrow_right'></span><span>${gp_name}</span>`
      : `<span class='arrow arrow_down'></span><span>${gp_name}</span>`;
    section2.appendChild(entry);
    const div_grp = document.createElement('div');
    div_grp.style.display = i === 0 ? null : 'none';
    const var_names = variables.filter(d => d.group === gp_name);
    for (let j = 0, len_j = var_names.length; j < len_j; j++) {
      const name_var = var_names[j].name;
      const code_var = var_names[j].id;
      const sub_entry = document.createElement('p');
      sub_entry.className = 'small';
      sub_entry.innerHTML = `<span value="${code_var}" class="target_variable small_square"></span><span class="label_chk">${name_var}</span><span class="i_info">i</span>`;
      div_grp.appendChild(sub_entry);
    }
    section2.appendChild(div_grp);
  }

  // Third section, study zone:
  const title_section3 = document.createElement('p');
  title_section3.className = 'title_menu';
  title_section3.innerHTML = 'Espace d\'étude';
  const section3 = document.createElement('div');
  section3.id = 'menu_studyzone';
  section3.className = 'box';
  section3.style.overflow = 'auto';
  section3.style.maxHeight = '25%';
  for (let i = 0, len_i = study_zones.length; i < len_i; i++) {
    const entry = document.createElement('p');
    const zone = study_zones[i];
    if (zone.id === 'filter_dist') {
      entry.innerHTML = `<span filter-value="${zone.id}" display_level="${zone.display_level}" class='filter_v square'></span><span class="label_chk">${zone.name}</span><input value="450" disabled="disabled" style="width: 55px; height: 13px;" type="number" min="0" max="100000" id="dist_filter"></input><span> km</span><span class="i_info">i</span>`;
    } else {
      entry.innerHTML = `<span filter-value="${zone.id}" display_level="${zone.display_level}" class='filter_v square'></span><span class="label_chk">${zone.name}</span><span class="i_info">i</span>`;
    }
    section3.appendChild(entry);
  }
  // Fourth section:
  const title_section4 = document.createElement('p');
  title_section4.className = 'title_menu';
  title_section4.innerHTML = 'Maillage territorial d\'analyse';
  const section4 = document.createElement('div');
  section4.id = 'menu_territ_level';
  section4.className = 'box';
  section4.style.overflow = 'auto';
  section4.style.maxHeight = '20%';
  for (let i = 0, len_i = territorial_mesh.length; i < len_i; i++) {
    const entry = document.createElement('p');
    const territ_level = territorial_mesh[i];
    entry.innerHTML = `<span value="${territ_level.id}" class='territ_level square'></span><span class="label_chk">${territ_level.name}</span><span class="i_info">i</span>`;
    section4.appendChild(entry);
  }

  const section5 = document.createElement('div');
  section4.id = 'menu_territ_level';
  section4.className = 'box';
  section4.style.overflow = 'auto';
  section4.style.maxHeight = '20%';
  const img2 = document.createElement('img');
  img2.src = 'img/Marianne_CGET_RVB.png';
  img2.style.margin = '10px';
  img2.style.width = '8em';
  img2.style.float = 'left';
  const img1 = document.createElement('img');
  img1.src = 'img/logo_riate.png';
  img1.style.margin = '20px 10px';
  img1.style.width = '8em';
  img1.style.float = 'right';
  const blabla = document.createElement('span');
  blabla.id = 'link_credits_source';
  blabla.className = 'link';
  blabla.style.margin = '0px 10px';
  blabla.style.fontSize = '0.5em';
  blabla.style.float = 'right';
  blabla.style.cursor = 'pointer';
  blabla.innerHTML = 'Crédits & informations supplémentaire';
  section5.appendChild(img2);
  section5.appendChild(img1);
  section5.appendChild(blabla);

  // The actual menu containing these 4 sections:
  const menu = document.getElementById('menu');
  menu.id = 'menu';
  menu.style.float = 'left';
  menu.appendChild(title_section1);
  menu.appendChild(section1);
  menu.appendChild(title_section2);
  menu.appendChild(section2);
  menu.appendChild(title_section3);
  menu.appendChild(section3);
  menu.appendChild(title_section4);
  menu.appendChild(section4);
  menu.appendChild(section5);
  // handleInputRegioName(names);
};

const handleInputRegioName = (allowed_names) => {
  const ids_names = {};
  allowed_names.forEach((ft) => { ids_names[ft.name.toLowerCase()] = ft.id; });
  const names = allowed_names.map(d => d.name.toUpperCase());
  const names2 = names.map(d => d.toLowerCase());

  document.getElementById('search').onblur = function () {
    if (!ids_names[this.value.toLowerCase()]) {
      document.getElementById('autocomplete').value = app.current_config.my_region_pretty_name;
      this.value = app.current_config.my_region_pretty_name;
    }
    document.getElementById('list_regio').classList.add('hidden');
  };

  document.getElementById('search').onkeyup = function (ev) {
    const value = this.value;
    if (!value || value === '') {
      // document.getElementById('autocomplete').value = app.current_config.my_region_pretty_name;
      // this.value = app.current_config.my_region_pretty_name;
      return;
    }
    document.getElementById('list_regio').classList.remove('hidden');
    const new_value = value.toLowerCase();
    document.getElementById('autocomplete').value = '';
    for (let i = 0; i < names2.length; i++) {
      if (names2[i].lastIndexOf(new_value, 0) === 0) {
        if (ev && (ev.key === 'Tab' || ev.key === 'Enter')) {
          const t = value + names2[i].substr(new_value.length, names2[i].length);
          document.getElementById('search').value = t;
          document.getElementById('autocomplete').value = t;
        }
        const str_after = names2[i].substr(new_value.length, names2[i].length);
        const new_str = value + str_after;
        document.getElementById('autocomplete').value = new_str;
        // if (ev && ev.key === 'Tab') {
        //   document.querySelector('#search').value = names2[i];
        //   document.querySelector('#autocomplete').value = names2[i];
        //   return;
        // }
        // const str_after = names2[i].substr(new_value.length, names2[i].length);
        // const new_str = value + str_after;
        // document.getElementById('autocomplete').value = new_str;
        // return;
      }
    }
    const a = document.getElementById('autocomplete').value;
    const b = document.getElementById('search').value;
    const code = ids_names[a.toLowerCase()];
    if (a === b && code) {
      document.querySelector(`.target_region.square[value="${code}"]`).click();
    }
  };
};
export { createMenu, handleInputRegioName };
