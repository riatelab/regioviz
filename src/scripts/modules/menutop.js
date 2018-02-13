import tingle from 'tingle.js';
import { makeModalReport, generateHtmlRapport } from './report';
import { app } from './../main';
import { clickDlPdf } from './helpers';
/**
* Function to prepare the menu, located on the top of the window, allowing to choose
* between the various kind of charts offered by the application.
* The function only creates the element on the DOM. Binding is made later.
*
* @return {Void}
*/
export function makeTopMenu() {
  const top_menu = d3.select('#menutop')
    .styles({ 'font-family': "'Signika', sans-serif", 'font-size': '0.80em', 'text-align': 'center' });

  top_menu
    .append('div')
    .attrs({ class: 'title_section t1' })
    .html('SÉLECTION');

  const type_chart = top_menu
    .append('div')
    .attr('class', 'top_section t2')
    .style('display', 'flex');

  const position = type_chart
    .append('div')
    .attr('class', 'type_comparaison');

  position.append('p')
    .attr('class', 'title_type_comp')
    .html('POSITION');

  position.append('span')
    .attrs({ class: 'type_chart chart_t1 selected', value: 'BarChart1' })
    .html('1 ind.');

  position.append('span')
    .attrs({ class: 'type_chart chart_t2 disabled', value: 'ScatterPlot2' })
    .html('2 ind.');

  position.append('span')
    .attrs({ class: 'type_chart chart_t3 disabled', value: 'RadarChart3' })
    .html('+3 ind.');

  const ressemblance = type_chart
    .append('div')
    .attr('class', 'type_comparaison');

  ressemblance.append('p')
    .attr('class', 'title_type_comp')
    .html('RESSEMBLANCES');

  ressemblance.append('span')
    .attrs({ class: 'type_chart chart_t1', value: 'Similarity1plus' })
    .html('+1 ind.');

  top_menu
    .append('div')
    .attrs({ class: 'title_section t3' })
    .html('QUELLES RÉGIONS ?');
}

/**
* Function to prepare the icons displayed on the top of the map.
* The function only creates the element on the DOM. Binding is made later.
*
* @return {Void}
*/
export function makeHeaderMapSection() {
  const header_map_section = d3.select('#map_section')
    .insert('div', '.cont_svg.cmap')
    .attr('id', 'header_map');

  header_map_section.append('div')
    .attrs({ class: 'filter_info', title: 'Espace d\'étude' });

  const completude_section = header_map_section.append('div')
    .attrs({ class: 'completude_section', title: 'Complétude de l\'information' });

  completude_section.append('p')
    .attr('id', 'completude_features');

  completude_section.append('p')
    .attr('id', 'completude_population');

  header_map_section.insert('img')
    .attrs({
      class: 'map_button active img_scale',
      width: 20,
      height: 20,
      src: 'img/gimp-tool-rect-select.png',
      id: 'img_rect_selec',
      title: 'Rectangle de sélection',
    });

  header_map_section.insert('img')
    .attrs({
      class: 'map_button img_scale',
      width: 20,
      height: 20,
      src: 'img/gimp-tool-zoom.png',
      id: 'img_map_zoom',
      title: 'Zoom',
    });

  header_map_section.insert('img')
    .attrs({
      class: 'map_button img_scale',
      width: 20,
      height: 20,
      src: 'img/gimp-cursor.png',
      id: 'img_map_select',
      title: 'Sélection par clic',
    });

  header_map_section.insert('div')
    .attrs({
      id: 'zoom_in',
      class: 'top_half_circle noselect',
      title: 'Zoom positif',
    })
    .append('span')
    .text('+');

  header_map_section.insert('div')
    .attrs({
      id: 'zoom_out',
      class: 'top_half_circle noselect',
      title: 'Zoom négatif',
    })
    .append('span')
    .text('-');
}

/**
* Function to prepare the icons displayed on the top of the chart.
* The function creates the elements on the DOM and bind click events on
* these elements (the behavior of the different dialogs created is determined
* at their opening by some informations present in the global variable 'app').
*
* @return {Void}
*/
export function makeHeaderChart() {
  const header_bar_section = d3.select('#bar_section')
    .insert('p', '.cont_svg.cchart')
    .attr('id', 'header_chart')
    .style('margin-bottom', '0')
    .style('clear', 'both');

  header_bar_section.insert('img')
    .attrs({
      width: 20,
      height: 20,
      src: 'img/picto_download2.png',
      id: 'img_table',
      title: 'Téléchargement des données',
      class: 'img_scale',
    })
    .styles({ margin: '3px', float: 'right', cursor: 'pointer' })
    .on('click', () => {
      let href_geojson;
      let href_table;
      const content = `<div id="prep_rapport"><h3>Données en cours de préparation...</h3>
<div class="spinner"><div class="cube1"></div><div class="cube2"></div></div></div>`;

      // eslint-disable-next-line new-cap
      const modal = new tingle.modal({
        stickyFooter: false,
        closeMethods: ['overlay', 'escape'],
        closeLabel: 'Close',
        onOpen() {
          document.querySelector('div.tingle-modal.tingle-modal--visible').style.background = 'rgba(0,0,0,0.4)';
        },
        onClose() {
          modal.destroy();
          URL.revokeObjectURL(href_geojson);
          URL.revokeObjectURL(href_table);
        },
      });
      modal.setContent(content);
      modal.open();

      // Prepare the link for the GeoJSON file:
      href_geojson = URL.createObjectURL(new Blob([app.geo_layer], { type: 'application/geo+json' }));

      // Prepare the data table:
      const ratios = app.current_config.ratio;
      const nums = app.current_config.num;
      const denums = app.current_config.denum;
      const columns = ['id', 'name'];
      ratios.forEach((v, i) => {
        columns.push(v);
        columns.push(nums[i]);
        columns.push(denums[i]);
        columns.push(`pr_${v}`);
      });
      let table_content = [
        columns.join(','), '\r\n'];
      app.chart.current_ids.forEach((idx) => {
        const l1 = app.current_data.find(d => d.id === idx);
        const l2 = app.chart.data.find(d => d.id === idx);
        table_content.push(columns.map(c => l1[c] || l2[c]).join(','));
        table_content.push('\r\n');
      });
      table_content = table_content.join('');

      // Prepare the link for the CSV table:
      href_table = URL.createObjectURL(new Blob([table_content], { type: 'text/plain' }));

      setTimeout(() => {
        modal.setContent(`<h3>Téléchargements</h3><div style="text-align:center;">
<p><a class="buttonDownload large" download="Regioviz_export.csv" id="dl_data" href="${href_table}">Table de données (.csv)</a></p>
<p><a class="buttonDownload large" id="dl_metadata" href="data/Metadonnees_Regioviz.pdf">Fiche de métadonnées (.pdf)</a></p>
<p><a class="buttonDownload large" download="CGET_nuts_all.geojson" id="dl_geolayer" href="${href_geojson}" download>Fond de carte (.geojson)</a></p></div>`);
        document.getElementById('dl_metadata').onclick = clickDlPdf;
        document.getElementById('dl_data').onclick = function (e) {
          e.preventDefault();
          const elem = document.createElement('a');
          elem.setAttribute('href', this.href);
          elem.setAttribute('download', 'Regioviz_export.csv');
          elem.style.display = 'none';
          document.body.appendChild(elem);
          elem.click();
          document.body.removeChild(elem);
        };

        document.getElementById('dl_geolayer').onclick = function (e) {
          e.preventDefault();
          const elem = document.createElement('a');
          elem.setAttribute('href', this.href);
          elem.setAttribute('download', 'CGET_nuts_all.geojson');
          elem.style.display = 'none';
          document.body.appendChild(elem);
          elem.click();
          document.body.removeChild(elem);
        };
      }, 550);
    });

  header_bar_section.insert('img')
    .attrs({
      width: 20,
      height: 20,
      src: 'img/picto_report2.png',
      id: 'img_printer',
      title: 'Export d\'un rapport',
      class: 'img_scale',
    })
    .styles({ margin: '3px', float: 'right', cursor: 'pointer' })
    .on('click', makeModalReport);

  header_bar_section.insert('img')
    .attrs({
      width: 20,
      height: 20,
      src: 'img/picto_information2.png',
      id: 'img_info',
      title: 'Aide',
      class: 'img_scale',
    })
    .styles({ margin: '3px', float: 'right', cursor: 'pointer' })
    .on('click', () => {
      const help_message = app.chart.getHelpMessage().split('\n').join('<br>');
      // eslint-disable-next-line new-cap
      const modal = new tingle.modal({
        stickyFooter: false,
        closeMethods: ['overlay', 'button', 'escape'],
        closeLabel: 'Close',
        onOpen() {
          document.querySelector('div.tingle-modal.tingle-modal--visible').style.background = 'rgba(0,0,0,0.4)';
          setTimeout(() => {
            const formula = document.querySelector('.tingle-modal-box__content').querySelector('#formula');
            if (formula) MathJax.Hub.Queue(['Typeset', MathJax.Hub, formula]);
          }, 15);
        },
        onClose() {
          modal.destroy();
        },
      });
      modal.setContent(help_message);
      modal.open();
    });
}
