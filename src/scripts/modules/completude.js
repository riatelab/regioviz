export default class CompletudeSection {
  constructor() {
    this.completude_population = document.querySelector('.completude_section > #completude_population');
    this.completude_features = document.querySelector('.completude_section > #completude_features');
    this.completude_features.className = 'active';
    this.completude_population.className = '';
    const self = this;
    this.completude_features.onclick = function () {
      this.classList.remove('active');
      self.completude_population.classList.add('active');
    };
    this.completude_population.onclick = function () {
      this.classList.remove('active');
      self.completude_features.classList.add('active');
    };
  }

  update(value_features, value_pop) {
    this.completude_features.innerHTML = `Données disponibles pour ${value_features[0]}/${value_features[1]} régions.`;
    this.completude_population.innerHTML = `Données disponibles pour ${value_pop}% de la population de l'espace d'étude.`;
  }

  // remove() {
  //   this.section.remove();
  //   this.section = null;
  //   this.completude_population = null;
  //   this.completude_features = null;
  // }
}


// export default class CompletudeSection {
//   constructor(parent, before) {
//     this.section = document.createElement('div');
//     this.section.className = 'completude_section';
//     this.category_filter = document.createElement('p');
//     this.completude_population = document.createElement('p');
//     this.completude_features = document.createElement('p');
//     this.completude_features.className = 'active';
//     this.category_filter.style.display = 'initial';
//     this.section.appendChild(this.completude_features);
//     this.section.appendChild(this.completude_population);
//     this.section.appendChild(this.category_filter);
//     const self = this;
//     parent.insertBefore(this.section, before);
//     this.completude_features.onclick = function () {
//       this.classList.remove('active');
//       self.completude_population.classList.add('active');
//     };
//     this.completude_population.onclick = function () {
//       this.classList.remove('active');
//       self.completude_features.classList.add('active');
//     };
//   }
//
//   update(value_features, value_pop) {
//     this.completude_features.innerHTML = `Données disponibles pour ${value_features[0]}/${value_features[1]} régions.`;
//     this.completude_population.innerHTML = `Données disponibles pour ${value_pop}% de la population de l'espace d'étude.`;
//   }
//
//   updateFilterInfo(value) {
//     this.category_filter.innerHTML = value;
//   }
//
//   remove() {
//     this.section.remove();
//     this.section = null;
//     this.completude_population = null;
//     this.completude_features = null;
//   }
// }
