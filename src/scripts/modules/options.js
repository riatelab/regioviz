/*
*  Color options (applied on the map and on the chart):
*/
export const color_countries = 'rgb(147, 144, 252)'; // Color for features within the study zone but not highlighted
export const color_disabled = 'white'; // Color for features outside the study zone / without data
export const color_sup = 'green'; // Color for selected feature with "better" values than the reference feature
export const color_inf = 'red'; // Color for selected feature with "worse" values than the reference feature
export const color_highlight = 'yellow'; // Color for the reference feature ("Ma région")
export const color_default_dissim = '#980043'; // 'darkred'; // Neutral color for selected features when green/red can't be used
export const color_q4 = '#5184bf'; // '#3b6cb3'; // '#4bac33'; // '#4e8731';//'#ffffb2';
export const color_q3 = '#70bee5'; // '#3799d3'; // '#4e8731'; // '#4bac33'; //'#fecc5c';
export const color_q2 = '#f3ad7c'; // '#fd8d3c';
export const color_q1 = '#ec656c'; // '#e31a1c';
/*
* Options regarding the formatting of numbers as string
*
*/
export const formatnb_decimal_sep = ',';
export const formatnb_thousands_sep = ' ';

/*
*  Misc. options:
*/
// The maximum number of variables that can be selected simultaneously:
export const MAX_VARIABLES = 7;

// Fixed viewBox dimensions for svg elements:
export const fixed_dimension = {
  map: { width: 470, height: 534 },
  chart: { width: 600, height: 569 },
  legend: { width: 470, height: 90 },
};
