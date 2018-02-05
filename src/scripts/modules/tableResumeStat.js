import { formatNumber } from './helpers';

export default class TableResumeStat {
  constructor(summary_features, options = {}) {
    const doc = document;
    const nb_features = summary_features.length;
    const column_names = ['Variable', 'Min', 'Moy', 'Med', 'Max', 'Ma région'];
    const nb_columns = column_names.length;
    const container_div = doc.createElement('div');
    const myTable = doc.createElement('table');
    const headers = doc.createElement('thead');
    const table_body = doc.createElement('tbody');
    const headers_row = doc.createElement('tr');
    myTable.className = 'minitable selectable';
    container_div.className = 'minitable_container';
    for (let i = 0; i < nb_columns; i++) {
      const cell = doc.createElement('th');
      cell.innerHTML = ['Variable', 'Ma région'].indexOf(column_names[i]) > -1
        ? column_names[i]
        : `${column_names[i]}.`;
      headers_row.appendChild(cell);
    }
    headers.appendChild(headers_row);
    myTable.appendChild(headers);
    for (let i = 0; i < nb_features; i++) {
      const row = doc.createElement('tr');
      row.id = `row_${summary_features[i].id}`;
      for (let j = 0; j < nb_columns; j++) {
        const cell = doc.createElement('td');
        const col_name = column_names[j];
        if (col_name !== 'Variable') {
          // cell.innerHTML = Math.round(summary_features[i][col_name] * 10) / 10;
          cell.innerHTML = formatNumber(summary_features[i][col_name], 1);
        } else {
          cell.innerHTML = summary_features[i][col_name];
        }
        row.appendChild(cell);
      }
      table_body.appendChild(row);
    }
    myTable.appendChild(table_body);
    myTable.setAttribute('id', options.id || 'table_summary');
    container_div.appendChild(myTable);
    document.querySelector('#map_section').appendChild(container_div);
    this.nb_columns = nb_columns;
    this.column_names = column_names;
    this.table_body = table_body;
  }

  addFeatures(summary_features) {
    for (let i = 0, len = summary_features.length; i < len; i++) {
      this.addFeature(summary_features[i]);
    }
  }

  addFeature(summary) {
    const row = document.createElement('tr');
    row.id = `row_${summary.id}`;
    for (let j = 0; j < this.nb_columns; j++) {
      const cell = document.createElement('td');
      const col_name = this.column_names[j];
      if (col_name !== 'Variable') {
        cell.innerHTML = Math.round(summary[col_name] * 10) / 10;
      } else {
        cell.innerHTML = summary[col_name];
      }
      row.appendChild(cell);
    }
    this.table_body.appendChild(row);
  }

  removeFeature(id_variable) {
    const row = this.table_body.querySelector(`tr#row_${id_variable}`);
    if (row) row.remove();
  }

  removeAll() {
    const rows = this.table_body.querySelectorAll('tr');
    for (let i = rows.length - 1; i > -1; i--) {
      rows[i].remove();
    }
  }

  remove() {
    this.table_body.parentElement.parentElement.remove();
    this.table_body = null;
  }
}
