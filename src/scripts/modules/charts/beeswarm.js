/* Copyright 2013 Gagarine Yaikhom (The MIT License) */
export default function(data, yaxis) {
  this.data = data;
  this.yaxis = yaxis;
  this.swarm = function () {
    const self = this;
    const swarm = [];
    const swarm_boundary = [];
    const yaxis = self.yaxis;
    const data = self.data;
    const c = data.length;
    data.sort(get_comparator('y'));
    for (let i = 0, c = data.length; i < c; i++) {
      swarm.push({
        'x': data[i].x,
        'y': get_y(i, data[i], swarm_boundary, yaxis),
      });
    }
    return swarm;
  }
}

function find_intersections(circle, height) {
    var effective_height = height - circle.x,
    diameter = 2 * circle.radius;
    if (effective_height - diameter > 0)
        return undefined;

    var cy = circle.y, y = Math.sqrt(diameter * diameter
        - effective_height * effective_height), index = circle.index;
    return {
        'p1': {
            'index': index,
            'isEnd': false,
            'isValid': true,
            'y': cy + y,
            'x': height
        },
        'p2': {
            'index': index,
            'isEnd': false,
            'isValid': true,
            'y': cy - y,
            'x': height
        }
    };
}

function find_candidate_intervals(height, swarm_boundary) {
    var i = 0, c = swarm_boundary.length, possible_intervals = [];
    while (c--) {
        var isects = find_intersections(swarm_boundary[i], height);
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

function get_comparator(p, q) {
    return function(a, b) {
        if (a[p] === b[p]) {
            if (q === undefined)
                return 0;
            else {
                if (a[q] === b[q])
                    return 0;
                if (a[q] < b[q])
                    return -1;
                return 1;
            }
        }
        if (a[p] < b[p])
            return -1;
        return 1;
    };
}

function remove_invalid_intervals(intervals) {
    var c = intervals.length, valid_intervals = [];
    if (c < 1) return valid_intervals;

    var i, j, k = c - 1;
    intervals.sort(get_comparator('y', 'index'));
    for (i = 0; i < k; ++i) {
        if (intervals[i].isEnd)
            continue;
        for (j = i + 1; j < c; ++j) {
            if (intervals[i].index === intervals[j].index) {
                intervals[j].isEnd = true;
                break;
            } else
                intervals[j].isValid = false;
        }
    }
    for (i = 0; i < c; ++i)
        if (intervals[i].isValid)
            valid_intervals.push(intervals[i]);
    return valid_intervals;
}

function choose_y(intervals, yaxis) {
    var i, c = intervals.length, distance = [];
    for (i = 0; i < c; ++i) {
        distance.push({
            'i': i,
            'd': Math.abs(yaxis - intervals[i].y)
        });
    }
    distance.sort(get_comparator('d'));
    return intervals[distance[0].i].y;
}

function get_y(index, datum, swarm_boundary, yaxis) {
    var x = datum.x,
    y,
    radius = datum.radius,
    isects = find_candidate_intervals(x, swarm_boundary),
    preferred_choice = {
        'index': index,
        'isEnd': false,
        'isValid': true,
        'y': yaxis,
        'x': x
    };
    isects.push(preferred_choice);
    isects.push(preferred_choice);
    isects = remove_invalid_intervals(isects);
    y = choose_y(isects, yaxis);
    swarm_boundary.push({
        'index': index,
        'x': x,
        'y': y,
        'radius': radius
    });
    return y;
}
