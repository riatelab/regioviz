/*
Adapted from https://github.com/gyaikhom/beeswarm
(Copyright 2013 Gagarine Yaikhom (The MIT License))
notably in order to handle different radius on each circle
and to make the chart in an horizontal fashion
*/
function find_intersections(circle, width) {
  var effective_width = width - circle.x;
  var diameter = 2 * circle.radius;
  if (effective_width - diameter > 0) {
    return undefined;
  }
  var cy = circle.y;
  var y = Math.sqrt(diameter * diameter - effective_width * effective_width);
  var index = circle.index;
  return {
    p1: {
      index: index,
      isEnd: false,
      isValid: true,
      y: cy + y,
      x: width,
    },
    p2: {
      index: index,
      isEnd: false,
      isValid: true,
      y: cy - y,
      x: width,
    }
  };
}

function find_candidate_intervals(width, swarm_boundary) {
  const possible_intervals = [];
  let c = swarm_boundary.length;
  let i = 0;
  while (c--) {
    const isects = find_intersections(swarm_boundary[i], width);
    if (isects === undefined) {
      swarm_boundary.splice(i, 1);
      continue;
    }
    possible_intervals.push(isects.p1);
    possible_intervals.push(isects.p2);
    ++i;
  }
  return possible_intervals;
}

const get_comparator = (p, q) =>  (a, b) => {
  if (a[p] === b[p]) {
    if (q === undefined) {
      return 0;
    } else {
      if (a[q] === b[q]) return 0;
      if (a[q] < b[q]) return -1;
      return 1;
    }
  }
  if (a[p] < b[p]) return -1;
  return 1;
};


function remove_invalid_intervals(intervals) {
  const c = intervals.length;
  const valid_intervals = [];
  if (c < 1) return valid_intervals;
  const k = c - 1;
  let i;
  let j;
  intervals.sort(get_comparator('y', 'index'));
  for (i = 0; i < k; ++i) {
    if (intervals[i].isEnd) {
      continue;
    }
    for (j = i + 1; j < c; ++j) {
      if (intervals[i].index === intervals[j].index) {
        intervals[j].isEnd = true;
        break;
      } else {
        intervals[j].isValid = false;
      }
    }
  }
  for (i = 0; i < c; ++i) {
    if (intervals[i].isValid) {
      valid_intervals.push(intervals[i]);
    }
  }
  return valid_intervals;
}

function choose_y(intervals, yaxis) {
  const distance = [];
  for (let i = 0, c = intervals.length; i < c; ++i) {
    distance.push({
      i: i,
      d: Math.abs(yaxis - intervals[i].y),
    });
  }
  distance.sort(get_comparator('d'));
  return intervals[distance[0].i].y;
}

function get_y(index, datum, swarm_boundary, yaxis) {
  const x = datum.x;
  const radius = datum.radius;
  const preferred_choice = {
    index: index,
    isEnd: false,
    isValid: true,
    y: yaxis,
    x: x,
  };
  let isects = find_candidate_intervals(x, swarm_boundary);
  isects.push(preferred_choice);
  isects.push(preferred_choice);
  isects = remove_invalid_intervals(isects);
  const y = choose_y(isects, yaxis);
  swarm_boundary.push({
    index: index,
    x: x,
    y: y,
    radius: radius,
  });
  return y;
}

export default function(data, yaxis) {
  const swarm_boundary = [];
  for (let i = 0, c = data.length; i < c; i++) {
    data[i].y = get_y(i, data[i], swarm_boundary, yaxis);
  }
  return data;
}
