import Vue from 'vue';
import Watcher from './watcher';
import { arrayFind } from 'element-ui/src/utils/util';
// 定义mutations
Watcher.prototype.mutations = {
  // 设置数据 
  setData(states, data) {
    const dataInstanceChanged = states._data !== data;
    states._data = data;
    // 过滤data
    this.execQuery();
    // 数据变化，更新部分数据。
    // 没有使用 computed，而是手动更新部分数据 https://github.com/vuejs/vue/issues/6660#issuecomment-331417140
    // 更新currentRowData
    this.updateCurrentRowData();
    // 更新展开数据
    this.updateExpandRows();
    // 根据reserveSelection更新selection
    if (states.reserveSelection) {
      this.assertRowKey();
      this.updateSelectionByRowKey();
    } else {
      if (dataInstanceChanged) {
        this.clearSelection();
      } else {
        this.cleanSelection();
      }
    }
    this.updateAllSelected();
    // 更新滚动条
    this.updateTableScrollY();
  },
  // 插入列
  insertColumn(states, column, index, parent) {
    let array = states._columns;
    if (parent) {
      array = parent.children;
      if (!array) array = parent.children = [];
    }

    if (typeof index !== 'undefined') {
      array.splice(index, 0, column);
    } else {
      array.push(column);
    }

    if (column.type === 'selection') {
      states.selectable = column.selectable;
      states.reserveSelection = column.reserveSelection;
    }

    if (this.table.$ready) {
      this.updateColumns(); // hack for dynamics insert column
      this.scheduleLayout();
    }
  },
  // 移除列
  removeColumn(states, column, parent) {
    let array = states._columns;
    if (parent) {
      array = parent.children;
      if (!array) array = parent.children = [];
    }
    if (array) {
      array.splice(array.indexOf(column), 1);
    }

    if (this.table.$ready) {
      this.updateColumns(); // hack for dynamics remove column
      this.scheduleLayout();
    }
  },
  // sort
  sort(states, options) {
    const { prop, order, init } = options;
    if (prop) {
      const column = arrayFind(states.columns, column => column.property === prop);
      if (column) {
        column.order = order;
        this.updateSort(column, prop, order);
        this.commit('changeSortCondition', { init });
      }
    }
  },

  changeSortCondition(states, options) {
    // 修复 pr https://github.com/ElemeFE/element/pull/15012 导致的 bug
    const { sortingColumn: column, sortProp: prop, sortOrder: order } = states;
    if (order === null) {
      states.sortingColumn = null;
      states.sortProp = null;
    }
    const ingore = { filter: true };
    this.execQuery(ingore);

    if (!options || !(options.silent || options.init)) {
      this.table.$emit('sort-change', {
        column,
        prop,
        order
      });
    }

    this.updateTableScrollY();
  },
  // 过滤数据
  filterChange(states, options) {
    let { column, values, silent } = options;
    const newFilters = this.updateFilters(column, values);

    this.execQuery();

    if (!silent) {
      this.table.$emit('filter-change', newFilters);
    }

    this.updateTableScrollY();
  },

  toggleAllSelection() {
    this.toggleAllSelection();
  },

  rowSelectedChanged(states, row) {
    this.toggleRowSelection(row);
    this.updateAllSelected();
  },

  setHoverRow(states, row) {
    states.hoverRow = row;
  },

  setCurrentRow(states, row) {
    this.updateCurrentRow(row);
  }
};
// 定义commit方法
Watcher.prototype.commit = function(name, ...args) {
  const mutations = this.mutations;
  if (mutations[name]) {
    mutations[name].apply(this, [this.states].concat(args));
  } else {
    throw new Error(`Action not found: ${name}`);
  }
};

Watcher.prototype.updateTableScrollY = function() {
  Vue.nextTick(this.table.updateScrollY);
};

export default Watcher;
