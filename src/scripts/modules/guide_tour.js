import introJs from 'intro.js';

export const makeTour = () => {
  const tour = introJs.introJs();
  tour.setOption('scrollToElement', false);
  tour.setOption('keyboardNavigation', true);
  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('#menu.t1'),
    intro: '<p class="titlestep">La partie de gauche est consacré aux paramètres d\'entrée</p>',
    position: 'right',
    disableInteraction: true,
  });

  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('#bar_section'),
    intro: '<p class="titlestep">L\'espace central est consacré au graphique</p>',
    position: 'left',
    disableInteraction: true,
  });

  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('#map_section'),
    intro: '<p class="titlestep">L\'espace latéral droit est consacré à la carte</p>',
    position: 'left',
    disableInteraction: true,
  });

  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('.regio_name').parentElement,
    intro: '<p class="titlestep">Étape 1 : Choix de la région</p>Une région de référence doit être choisie pour débuter les analyses de Regioviz (saisie avec autocomplétion ou choix dans un menu déroulant).',
    position: 'right',
    disableInteraction: true,
  });

  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('#menu_variables'),
    intro: '<p class="titlestep">Étape 2 : Choix d\'un ou de plusieurs indicateurs</p>Un indicateur doit être sélectionné au minimum. Il est possible de sélectionner jusqu\'à 7 indicateurs.',
    position: 'right',
    text: '',
  });

  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('div#menu_studyzone'),
    intro: '<p class="titlestep">Étape 3 : Choix d\'un espace d\'étude</p>Par défaut, l\'ensemble de l\'espace d\'étude est considéré dans les analyses. Il est possible de restreindre cete espace d\'étude à des régions proches ou présentant des similarités.',
    position: 'right',
  });

  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('.top_section.t2'),
    intro: '<p class="titlestep">Étape 4 : Choix d\'une fonctionnalité d\'analyse</p>Les fonctionnalités disponibles <i>(non-grisée)</i> correspondent au nombre de variables disponibles.',
    position: 'bottom',
  });

  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('#mainframe'),
    intro: '<p class="titlestep">À vous de jouer!</p>',
    hideNext: true,
    hidePrev: true,
  });

  const refreshTour = () => {
    tour.refresh();
  };

  tour.onafterchange(function(targetElement) {
    switch (tour._currentStep){
      case 4:
        document.querySelector('.regio_name').parentElement.addEventListener('click', refreshTour);
      case 5:
        document.querySelector('#menu_variables').addEventListener('click', refreshTour);
    }
  });
  tour.onexit(function() {
    document.querySelector('.regio_name').parentElement.removeEventListener('click', refreshTour);
    document.querySelector('#menu_variables').removeEventListener('click', refreshTour);
  });

  return tour;
};
