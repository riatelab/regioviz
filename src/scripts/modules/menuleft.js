import makeTour from './guide-tour';
import { removeDuplicates, toggleVisibilityLeftMenu } from './helpers';
import { app } from './../main';


const handleInputRegioName = (allowed_names, levels) => {
  const ids_names = {};
  const names_lower = {}; // names.map(d => d.toLowerCase());

  levels.forEach((level) => {
    ids_names[level] = [];
    names_lower[level] = [];
  });
  allowed_names.forEach((ft) => {
    const ft_level = levels.find(level => +ft[level] === 1);
    ids_names[ft_level].push(ft.id);
    names_lower[ft_level].push(ft.name.toLowerCase());
  });
  const autocomplete = document.getElementById('autocomplete');
  const search = document.getElementById('search');
  const list_regio = document.getElementById('list_regio');
  search.onblur = function () {
    if (!ids_names[app.current_config.current_level][this.value.toLowerCase()]) {
      autocomplete.value = app.current_config.my_region_pretty_name;
      this.value = app.current_config.my_region_pretty_name;
    }
    list_regio.classList.add('hidden');
  };
  let tm;
  search.onkeyup = function (ev) {
    const value = this.value;
    clearTimeout(tm);
    tm = setTimeout(() => {
      const codes_level = ids_names[app.current_config.current_level];
      if (!value || value === '') {
        for (let i = 0, n_i = codes_level.length; i < n_i; i++) {
          document.querySelector(`span[value="r_${codes_level[i]}"]`)
            .parentElement.style.display = null;
        }
        return;
      }
      const names_lower_current_level = names_lower[app.current_config.current_level];
      list_regio.classList.remove('hidden');
      autocomplete.value = '';
      let ix = null;
      let maybe_ix = null;
      const _false = [];
      let fast_path = false;
      for (let i = 0; i < names_lower_current_level.length; i++) {
        if (fast_path) {
          document.querySelector(`span[value="r_${codes_level[i]}"]`)
            .parentElement.style.display = 'none';
        } else if (names_lower_current_level[i].lastIndexOf(value.toLowerCase(), 0) === 0) {
          maybe_ix = i;
          const str_after = names_lower_current_level[i].substr(
            value.length,
            names_lower_current_level[i].length,
          );
          const new_str = value + str_after;
          autocomplete.value = new_str;
          document.querySelector(`span[value="r_${codes_level[i]}"]`)
            .parentElement.style.display = null;
          if (ev && (ev.key === 'Tab' || ev.key === 'Enter')) {
            search.value = new_str;
            ix = i;
          }
        } else {
          document.querySelector(`span[value="r_${codes_level[i]}"]`)
            .parentElement.style.display = 'none';
          if (maybe_ix || value.charAt(0) > names_lower_current_level[i].charAt(0)) {
            if (_false.length > 2) {
              fast_path = true;
            }
            _false.push(1);
          }
        }
      }
      if (!maybe_ix) {
        for (let i = 0, n_i = codes_level.length; i < n_i; i++) {
          document.querySelector(`span[value="r_${codes_level[i]}"]`)
            .parentElement.style.display = null;
        }
        return;
      }
      const a = autocomplete.value;
      const b = search.value;
      if (a === b) {
        ix = ix !== null
          ? ix
          : names_lower_current_level.findIndex(d => d === a.toLowerCase());
        const code = codes_level[ix];
        if (code) {
          document.querySelector(`.target_region.square[value="r_${code}"]`).click();
        }
      }
    }, 100);
  };
};

const makeButtonTour = () => {
  const i = document.createElement('img');
  const d = document.createElement('div');
  i.src = 'img/road-sign.png';
  i.title = 'Visite guidée de l\'applciation';
  i.style.paddingTop = '10px';
  d.id = 'tour_link';
  d.style.cursor = 'pointer';
  d.style.position = 'absolute';
  d.style.right = '10px';
  d.style.top = '-50px';
  d.onclick = function () {
    makeTour().start();
  };
  d.appendChild(i);
  return d;
};

const makeButtonMenuLeft = () => {
  const s = document.createElement('button');
  const d = document.createElement('div');
  s.innerHTML = '◀';
  s.onclick = toggleVisibilityLeftMenu;
  d.id = 'button_hide_menu';
  d.style.float = 'left';
  d.style.cursor = 'pointer';
  d.style.position = 'absolute';
  d.style.padding = '0.9em';
  d.style.margin = '0 0.2em';
  d.title = 'Cacher le menu';
  d.appendChild(s);
  document.getElementById('menutop').appendChild(d);
  d.onclick = s.click;
};

export default function createMenu(names, variables, study_zones, territorial_mesh) {
  const button_tour = makeButtonTour();
  const title_section1 = document.createElement('div');
  title_section1.style.backgroundColor = '#4f81bd';
  title_section1.style.color = 'white';
  title_section1.style.overflow = 'hidden';
  title_section1.innerHTML = `
<div class="regio_name">
<p>Mon territoire : </p>
<input type = "text" id = "search"/>
<input id="autocomplete" type="text" disabled="disabled" />
<span class='down_arrow'> &#x25BE;</span>
<p id="curr_regio_level"></p>`;

  const section1 = document.createElement('div');
  section1.id = 'list_regio';
  section1.className = 'box hidden';
  section1.style.overflow = 'auto';
  // section1.style.height = '15%';
  // section1.style.height = '0';
  const dsection1 = d3.select(section1);
  dsection1.selectAll('p')
    .data(names)
    .enter()
    .append('p')
    .attr('class', 'regioname')
    .style('display', d => (+d[app.current_config.current_level] === 1 ? null : 'none'))
    .html(d => `
<span value="r_${d.id}" class='target_region square'></span><span style="margin-right:5px;" class="label_chk">${d.name}</span>`)
    .on('mouseover', function () {
      d3.select(this).selectAll('span.minibutton').style('display', null);
    })
    .on('mouseout', function () {
      d3.select(this).selectAll('span.minibutton').style('display', 'none');
    });

  const levels = [];
  // Fourth section:
  const title_section4 = document.createElement('p');
  title_section4.className = 'title_menu';
  title_section4.innerHTML = 'Unités territoriales';
  const section4 = document.createElement('div');
  section4.id = 'menu_territ_level';
  section4.className = 'box';
  section4.style.overflow = 'auto';
  section4.style.maxHeight = '20%';
  for (let i = 0, len_i = territorial_mesh.length; i < len_i; i++) {
    const entry = document.createElement('p');
    const territ_level = territorial_mesh[i];
    levels.push(territ_level.id);
    entry.innerHTML = `<span value="${territ_level.id}" class='territ_level square'></span><span class="label_chk">${territ_level.name}</span><span class="i_info">i</span>`;
    section4.appendChild(entry);
  }

  // Second section, groups of variables:
  const title_section2 = document.createElement('p');
  title_section2.className = 'title_menu';
  title_section2.innerHTML = 'Indicateurs';
  const section2 = document.createElement('div');
  section2.id = 'menu_variables';
  section2.className = 'box';
  section2.style.overflow = 'auto';
  section2.style.height = 'auto';
  section2.style.maxHeight = '35%';

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
    const zone = study_zones[i];
    const entry = document.createElement('p');
    entry.setAttribute('filter-value', zone.id);
    if (zone.id === 'DEFAULT') {
      entry.innerHTML = `<span display_level="" class="filter_v square"></span><span class="label_chk">${zone.name}</span><span class="i_info">i</span>`;
    } else if (zone.id === 'SPAT') {
      entry.innerHTML = '<span display_level="" class="filter_v square"></span><span class="label_chk">Territoires dans un rayon de </span><input value="450" disabled="disabled" style="width: 55px; height: 13px;" type="number" min="0" max="100000" id="dist_filter"></input><span> km</span><span class="i_info">i</span>';
    } else {
      entry.innerHTML = `<span display_level="${zone.display_level}" class='filter_v square'></span><span class="label_chk">${zone.name}</span><span class="i_info">i</span>`;
    }
    section3.appendChild(entry);
  }

  const section5 = document.createElement('div');
  const img2 = document.createElement('img');
  img2.className = 'img_scale_logo';
  img2.src = 'img/Marianne_CGET_RVB.png';
  img2.style.margin = '0.9em 0.5em';
  // img2.style.width = '7.5em';
  img2.style.float = 'left';
  const link2 = document.createElement('a');
  link2.href = 'http://www.cget.gouv.fr/';
  link2.target = '_blank';
  link2.appendChild(img2);
  const logo_regioviz = document.createElement('img');
  logo_regioviz.className = 'img_scale_logo';
  logo_regioviz.src = 'img/logo_regioviz.png';
  logo_regioviz.style.margin = '0.4em';
  // logo_regioviz.style.width = '7.5em';
  logo_regioviz.style.float = 'right';
  const img1 = document.createElement('img');
  img1.className = 'img_scale_logo';
  img1.src = 'img/logo_riate.png';
  img1.style.margin = '0.9em 0.5em';
  // img1.style.width = '7.5em';
  img1.style.float = 'right';
  const link1 = document.createElement('a');
  link1.href = 'http://riate.cnrs.fr';
  link1.target = '_blank';
  link1.appendChild(img1);
  const blabla = document.createElement('span');
  blabla.id = 'link_credits_source';
  blabla.className = 'link';
  blabla.style.margin = '0em 0.5em';
  blabla.style.fontSize = '0.65em';
  blabla.style.float = 'right';
  blabla.style.cursor = 'pointer';
  blabla.innerHTML = 'Crédits & informations supplémentaires';
  // const tour_link = document.createElement('span');
  // tour_link.id = 'tour_link';
  // tour_link.className = 'link';
  // tour_link.style.margin = '1.4em 0.5em 0em 0.5em';
  // tour_link.style.fontSize = '0.65em';
  // tour_link.style.float = 'right';
  // tour_link.style.cursor = 'pointer';
  // tour_link.style.clear = 'both';
  // tour_link.innerHTML = 'Visite guidée de l\'application';

  section5.appendChild(link2);
  section5.appendChild(logo_regioviz);
  section5.appendChild(link1);
  section5.appendChild(blabla);
  // section5.appendChild(tour_link);

  // The actual menu containing these 5 sections:
  const menu = document.getElementById('menu');
  menu.style.float = 'left';
  menu.appendChild(button_tour);
  menu.appendChild(title_section1);
  menu.appendChild(section1);
  menu.appendChild(title_section4);
  menu.appendChild(section4);
  menu.appendChild(title_section2);
  menu.appendChild(section2);
  menu.appendChild(title_section3);
  menu.appendChild(section3);
  menu.appendChild(section5);
  handleInputRegioName(names, levels);
  makeButtonMenuLeft();
}
