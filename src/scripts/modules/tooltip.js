/**
* Function to prepare a tooltip zone to be used/bound later.
*
* @param {Object} parent - The d3 node selection for the parent.
* @param {String} before - The selector describing the before element.
* @param {String} classname - The className value to be used for
*                             this tooltip (default 'tooltip').
* @return {Object} - The d3 node element for this tooltip zone.
*
*/
export function prepareTooltip(parent, before, classname = 'tooltip') {
  const t = parent.select('.tooltip');
  if (t.node()) {
    return t;
  }
  const tooltip = parent.insert('div', before)
    .attr('class', classname)
    .style('display', 'none');

  tooltip.append('p').attr('class', 'title');
  tooltip.append('p').attr('class', 'content');

  return tooltip;
}

/**
* Function to bind a tooltip (on mousedown/mousemove)
* on each element described by the given 'selector'.
* Options can contains the name of attribute containing
* the tooltip value, the name of the class to be used for
* the tooltip and the parent DOM element on which appending
* these tooltips (these tooltips are created and destroyed
* each time they are displayed).
*
* @param {String} selector
* @param {Object} options
* @return {Void}
*
*/
export const Tooltipsify = (selector, options = {}) => {
  const opts = {
    parent: options.parent || document.body,
    className: options.className || 'tooltip-black',
    dataAttr: options.dataAttr || 'title-tooltip',
    timeout: options.timeout || 5,
  };
  const elems = d3.selectAll(selector);
  if (elems._groups[0].length === 0) return;

  let tooltip_parent = d3.select(opts.parent).select(`.${opts.className}`);
  let tooltip;
  let t;

  if (!tooltip_parent.node()) {
    tooltip_parent = d3.select(opts.parent).insert('div')
      .attr('class', opts.className)
      .style('display', 'none');
    tooltip = tooltip_parent.append('p').attr('class', 'content');
  } else {
    tooltip = tooltip_parent.select('.content');
  }

  elems
    .on('mouseover', () => {
      clearTimeout(t);
      tooltip_parent.style('display', null);
    })
    .on('mouseout', () => {
      clearTimeout(t);
      t = setTimeout(() => { tooltip_parent.style('display', 'none'); }, opts.timeout);
    })
    .on('mousemove mousedown', function () {
      clearTimeout(t);
      tooltip
        .html(this.getAttribute(opts.dataAttr));
      const b = tooltip.node().getBoundingClientRect();
      tooltip_parent
        .styles({
          display: null,
          left: `${d3.event.pageX - 5}px`,
          top: `${d3.event.pageY - b.height - 15}px`,
        });
    });
};
