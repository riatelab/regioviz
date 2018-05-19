export default class contextMenu {
  constructor(items, excl_class = 'ctxchart') {
    if (items) {
      this.setItems(items);
    } else {
      this.items = [];
    }
    if (excl_class) this.excl_class = excl_class;
  }

  addItem(item) {
    this.items.push({
      name: item.name,
      action: item.action,
    });
  }

  removeItem(name) {
    for (let i = this.items.length - 1; i > 0; i--) {
      if (this.items[i].name === name) {
        this.items.splice(i, 1);
        break;
      }
    }
  }

  setItems(items) {
    this.items = [];
    for (let i = 0, nb_items = items.length; i < nb_items; i++) {
      if (items[i].name && items[i].action) {
        this.addItem(items[i]);
      }
    }
  }

  showMenu(event, parent, items, position) {
    if (event.preventDefault) event.preventDefault();
    if (event.stopPropagation) event.stopPropagation();
    if (this.DOMobj) {
      this.hideMenu();
      return;
    }
    if (this.excl_class) {
      const elems = document.querySelectorAll(`.${this.excl_class}`);
      for (let i = 0, n = elems.length; i < n; i++) {
        elems[i].remove();
      }
    }
    if (items) {
      this.setItems(items);
    }

    this.initMenu(parent);
    if (!position) {
      this.DOMobj.style.top = `${event.clientY + window.scrollY}px`;
      this.DOMobj.style.left = `${event.clientX}px`;
    } else {
      this.DOMobj.style.top = `${position[1]}px`;
      this.DOMobj.style.left = `${position[0]}px`;
    }
    this.displayed = true;
    setTimeout(() => {
      document.addEventListener('click', () => this.hideMenu());
    }, 225);
  }

  removeMenu() {
    if (this.DOMobj && this.DOMobj.parentNode && this.DOMobj.parentNode.removeChild) {
      this.DOMobj.parentNode.removeChild(this.DOMobj);
      this.DOMobj = null;
    }
  }

  hideMenu() {
    this.removeMenu();
    this.displayed = false;
    document.removeEventListener('click', this.hideMenu);
  }

  initMenu(parent) {
    this.removeMenu();
    const self = this;
    const menu = document.createElement('div');
    const list = document.createElement('ul');
    menu.className = 'context-menu';
    menu.appendChild(list);
    for (let i = 0, nb_item = this.items.length; i < nb_item; i++) {
      const item = document.createElement('li');
      item.setAttribute('data-index', i);
      item.innerHTML = `<span class="context-menu-item-name">${this.items[i].name}</span>`;
      list.appendChild(item);
      item.onclick = function () {
        const ix = this.getAttribute('data-index');
        self.items[ix].action();
      };
    }
    this.DOMobj = menu;
    parent.appendChild(menu);
  }
}
