import { toggleRowStatus, getKeysMap, getRowIdentity } from '../util';

export default {
  data() {
    return {
      states: {
        defaultExpandAll: false,
        expandRows: []
      }
    };
  },

  methods: {
    // 更新要展开的行
    updateExpandRows() {
      const { data = [], rowKey, defaultExpandAll, expandRows } = this.states;
      // 设置states.expandRows
      // defaultExpandAll为true,默认展开所有
      if (defaultExpandAll) {
        this.states.expandRows = data.slice();
      } else if (rowKey) {
        // TODO：这里的代码可以优化
        const expandRowsMap = getKeysMap(expandRows, rowKey);
        this.states.expandRows = data.reduce((prev, row) => {
          const rowId = getRowIdentity(row, rowKey);
          const rowInfo = expandRowsMap[rowId];
          if (rowInfo) {
            prev.push(row);
          }
          return prev;
        }, []);
      } else {
        this.states.expandRows = [];
      }
    },

    toggleRowExpansion(row, expanded) {
      const changed = toggleRowStatus(this.states.expandRows, row, expanded);
      if (changed) {
        this.table.$emit('expand-change', row, this.states.expandRows.slice());
        // 更新表格布局
        this.scheduleLayout();
      }
    },
    // 设置展开行
    // 设置states.expandRows
    setExpandRowKeys(rowKeys) {
      this.assertRowKey();
      // TODO：这里的代码可以优化
      const { data, rowKey } = this.states;
      const keysMap = getKeysMap(data, rowKey);
      this.states.expandRows = rowKeys.reduce((prev, cur) => {
        const info = keysMap[cur];
        if (info) {
          prev.push(info.row);
        }
        return prev;
      }, []);
    },
    // 行是否展开
    isRowExpanded(row) {
      const { expandRows = [], rowKey } = this.states;
      if (rowKey) {
        const expandMap = getKeysMap(expandRows, rowKey);
        return !!expandMap[getRowIdentity(row, rowKey)];
      }
      return expandRows.indexOf(row) !== -1;
    }
  }
};
