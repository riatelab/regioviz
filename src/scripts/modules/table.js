// import DataTable from 'vanilla-datatables';
// import { color_highlight } from './options';
// import '../vendor/css/vanilla-dataTables.min.css';
//
// function createTableDOM(data, opts, config) {
//   const { num, denum, ratio, my_region } = config;
//   const options = opts || {};
//   options.id = options.id || 'myTable';
//   const doc = document;
//   const nb_features = data.length;
//   const column_names = Object.getOwnPropertyNames(data[0]);
//   const nb_columns = column_names.length;
//   const myTable = doc.createElement('table');
//   const headers = doc.createElement('thead');
//   const body = doc.createElement('tbody');
//   const headers_row = doc.createElement('tr');
//   // TODO: Only display ratios values if there is more than 1 variable currently selected
//   for (let i = 0; i < nb_columns; i++) {
//     const cell = doc.createElement('th');
//     const col_name = column_names[i];
//     if (num.indexOf(col_name) > -1) {
//       cell.innerHTML = `Num<br><span class="small">${col_name}`;
//     } else if (denum.indexOf(col_name) > -1) {
//       cell.innerHTML = `Denum<br><span class="small">${col_name}`;
//     } else if (ratio.indexOf(col_name) > -1) {
//       cell.innerHTML = `Ratio<br><span class="small">${col_name}`;
//     } else if (col_name === 'rang') {
//       cell.innerHTML = 'Rang ';
//     } else {
//       cell.innerHTML = col_name;
//     }
//     headers_row.appendChild(cell);
//   }
//   headers.appendChild(headers_row);
//   myTable.appendChild(headers);
//   for (let i = 0; i < nb_features; i++) {
//     const row = doc.createElement('tr');
//     row.id = `row_${data[i].id}`;
//     if (data[i].id === my_region) {
//       row.className = color_highlight;
//     }
//     for (let j = 0; j < nb_columns; j++) {
//       const cell = doc.createElement('td');
//       const col_name = column_names[j];
//       if (num.indexOf(col_name) > -1
//           || denum.indexOf(col_name) > -1 || ratio.indexOf(col_name) > -1) {
//         cell.innerHTML = Math.round(data[i][col_name] * 100) / 10;
//       } else {
//         cell.innerHTML = data[i][col_name];
//       }
//       row.appendChild(cell);
//     }
//     body.appendChild(row);
//   }
//   myTable.appendChild(body);
//   myTable.setAttribute('id', options.id);
//   return myTable;
// }

// export function makeTable(data_no_empty, config) {
//   document.querySelector('.dataTable-wrapper').remove();
//   const table = createTableDOM(data_no_empty, undefined, config);
//   document.querySelector('#map_section').appendChild(table);
//   const dataTable = new DataTable('#myTable');
//   const t = document.querySelector('.dataTable-wrapper');
//   t.style.marginTop = '20px';
//   t.style.display = 'none';
//   t.style.fontSize = '0.7em';
//   t.querySelector('.dataTable-top').remove();
//   Array.prototype.slice.call(t.querySelectorAll('span.small'))
//     .forEach((el) => {
//       el.onclick = () => { el.parentElement.click(); }; // eslint-disable-line no-param-reassign
//     });
// }
