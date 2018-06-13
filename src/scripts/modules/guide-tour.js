import introJs from 'intro.js';

function getBbox(elements) {
  let xmin = Infinity;
  let xmax = -Infinity;
  let ymin = Infinity;
  let ymax = -Infinity;
  for (let i = 0, n_elem = elements.length; i < n_elem; i++) {
    const bbox = elements[i].getBoundingClientRect();
    if (bbox.left < xmin) xmin = bbox.left;
    if (bbox.right > xmax) xmax = bbox.right;
    if (bbox.top < ymin) ymin = bbox.top;
    if (bbox.bottom > ymax) ymax = bbox.bottom;
  }
  return {
    xmin, xmax, ymin, ymax,
  };
}

function makeDivSizeElements(elements, padding) {
  const {
    xmin, xmax, ymin, ymax,
  } = getBbox(elements);
  const elem = document.createElement('div');
  elem.className = 'temp_tour_overlay';
  elem.style.position = 'absolute';
  elem.style.left = `${xmin - padding}px`;
  elem.style.top = `${ymin - padding}px`;
  elem.style.width = `${padding + xmax - xmin}px`;
  elem.style.height = `${padding + ymax - ymin}px`;
  document.body.insertBefore(elem, document.querySelector('#overlay'));
  return elem;
}

export default function makeTour() {
  const elem_top_chart = makeDivSizeElements(document.querySelectorAll('#header_chart > img'), 10);
  const elem_top_map = makeDivSizeElements(document.querySelectorAll('#header_map > img'), 10);

  const tour = introJs.introJs();
  tour.setOption('scrollToElement', false);
  tour.setOption('keyboardNavigation', true);

  tour.addStep({
    tooltipClass: 'steptour',
    intro: '<p class="titlestep">INTRODUCTION</p>',
    disableInteraction: true,
  });

  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('#menu.t1'),
    intro: '<p class="titlestep">Regioviz est organisé en trois panneaux. La partie de gauche est consacré aux paramètres d\'entrées (quelle unité territoriale ? Quel indicateur ? Quel espace d\'étude ? Quelle maille territoriale ?).</p>',
    position: 'right',
    disableInteraction: true,
  });

  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('#bar_section'),
    intro: '<p class="titlestep">L\'espace central est consacré au graphique. Plusieurs représentations et méthodes sont proposées en fonction du nombre d\'indicateurs sélectionnés et du but recherché dans l\'analyse (positionner, évaluer les ressemblances).</p>',
    position: 'left',
    disableInteraction: true,
  });

  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('#map_section'),
    intro: '<p class="titlestep">L\'espace latéral droit est consacré à la carte.</p>',
    position: 'left',
    disableInteraction: true,
  });

  tour.addStep({
    tooltipClass: 'steptour',
    intro: '<p class="titlestep">PARAMÉTRER REGIOVIZ</p>',
    disableInteraction: true,
  });

  // Left menu..
  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('.regio_name').parentElement,
    intro: `<p class="titlestep">Étape 1 : Choix d'une unité territoriale.</p>
Un territoire de référence doit être choisi pour débuter les analyses de Regioviz (saisie avec autocomplétion ou choix dans un menu déroulant).
Les territoires proposés à la sélection dépendent du choix du maillage territorial. Changer de maillage territorial aura un impact sur les territoires disponibles en sélection.`,
    position: 'right',
    disableInteraction: true,
  });

  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('#menu_territ_level'),
    intro: `<p class="titlestep">Étape 1 (suite) : choix d'un type d'unité territoriale.</p>
Les territoires proposés à la sélection ainsi que les espaces d'études permettant de restreindre l'analyse à des territoires proches ou présentant des similarités dépendent de ce choix d'unité territoriales`,
    position: 'right',
    disableInteraction: true,
  });

  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('#menu_variables'),
    intro: '<p class="titlestep">Étape 2 : Choix d\'un ou plusieurs indicateurs.</p> Un indicateur doit être sélectionné au minimum. Il est possible de sélectionner jusqu\'à 7 indicateurs simultanément.',
    position: 'right',
    disableInteraction: true,
  });

  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('div#menu_studyzone'),
    intro: '<p class="titlestep">Étape 3 : Choix d\'un espace d\'étude.</p> Par défaut, l\'ensemble de l\'espace d\'étude est considéré dans les analyses. Il est possible de restreindre cet espace d\'étude à des régions proches ou présentant des similarités sur des critères statistiques, institutionnels ou géographiques.',
    position: 'right',
    disableInteraction: true,
  });

  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('.top_section.t2'),
    intro: '<p class="titlestep">Étape 4 : Choix d\'une fonctionnalité d\'analyse.</p> Les fonctionnalités disponibles (non-grisée) correspondent au nombre de variables disponibles.',
    position: 'bottom',
    disableInteraction: true,
  });

  tour.addStep({
    tooltipClass: 'steptour',
    intro: '<p class="titlestep">LES OPTIONS DE NAVIGATION</p>',
    disableInteraction: true,
  });

  // Chart..
  tour.addStep({
    tooltipClass: 'steptour',
    element: elem_top_chart,
    intro: '<p class="titlestep">Les options au dessus du graphique permettent de visualiser les aides pour chaque mode de représentation (méthode de construction, scénario d\'utilisation), de générer un rapport automatiquement contenant des clés de lecture des représentations proposées et de télécharger les données, métadonnées et géométries contenues dans l\'application.</p>',
    disableInteraction: true,
  });

  // tour.addStep({
  //   tooltipClass: 'steptour',
  //   element: document.getElementById('svg_bar'),
  //   intro: '<p class="titlestep">Le graphique...</p>',
  //   position: 'bottom',
  //   disableInteraction: true,
  // });

  tour.addStep({
    tooltipClass: 'steptour',
    element: document.getElementById('menu_selection'),
    intro: '<p class="titlestep">Pour chaque graphique, un menu permet de modifier des paramètres. Des sélections prédéfinies permettent de faciliter la visualisation de certains phénomènes.</p>',
    position: 'bottom',
    disableInteraction: true,
  });

  // Map..
  tour.addStep({
    tooltipClass: 'steptour',
    element: elem_top_map,
    intro: '<p class="titlestep">Les options situées au dessus de la carte permettent d\'effectuer des actions sur celle-ci (zoom, sélection, nom des unités territoriales) et rappellent le niveau de disponibilité des données.</p>',
    position: 'bottom',
    disableInteraction: true,
  });

  // tour.addStep({
  //   tooltipClass: 'steptour',
  //   element: document.getElementById('svg_map'),
  //   intro: '<p class="titlestep">La carte ....</p>',
  //   position: 'bottom',
  //   disableInteraction: true,
  // });

  tour.addStep({
    tooltipClass: 'steptour',
    element: document.getElementById('svg_legend'),
    intro: '<p class="titlestep">La légende est adaptée à chaque type de graphique et aux couleurs qui en sont issues.</p>',
    position: 'bottom',
    disableInteraction: true,
  });

  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('.minitable_container'),
    intro: '<p class="titlestep">Le tableau sous la carte rappelle les ordres de grandeur de la distribution (minimum, moyenne, médiane, maximum) des indicateurs sélectionnés ainsi que les valeurs pour l\'unité territoriale sélectionnée.</p>',
    position: 'bottom',
    disableInteraction: true,
  });

  tour.addStep({
    tooltipClass: 'steptour',
    element: document.getElementById('img_table'),
    intro: '<p class="titlestep">Les indicateurs, espaces d\'étude et maillages territoriaux sont documentés en cliquant sur cette icône.</p>',
    position: 'bottom',
    disableInteraction: true,
  });

  // const refreshTour = () => {
  //   tour.refresh();
  // };

  // tour.onafterchange(() => {
  //   switch (tour._currentStep) {
  //     case 4:
  //       document.querySelector('.regio_name')
  //         .parentElement.addEventListener('click', refreshTour);
  //       break;
  //     case 5:
  //       document.querySelector('#menu_variables').addEventListener('click', refreshTour);
  //       break;
  //     default:
  //       break;
  //   }
  // });
  tour.onexit(() => {
    Array.prototype.slice.call(document.querySelectorAll('.temp_tour_overlay'))
      .forEach((elem) => {
        elem.remove();
      });
    // document.querySelector('.regio_name')
    //   .parentElement.removeEventListener('click', refreshTour);
    // document.querySelector('#menu_variables').removeEventListener('click', refreshTour);
  });

  return tour;
}
