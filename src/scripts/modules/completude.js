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
    this.completude_features.innerHTML = `Données disponibles pour ${value_features[0]}/${value_features[1]} territoires.`;
    this.completude_population.innerHTML = `Données disponibles pour ${value_pop}% de la population de l'espace d'étude.`;
  }
}
