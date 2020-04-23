<template>
  <div class="el-table"
    :class="[{
      'el-table--fit': fit,
      'el-table--striped': stripe,
      'el-table--border': border || isGroup,
      'el-table--hidden': isHidden,
      'el-table--group': isGroup,
      'el-table--fluid-height': maxHeight,
      'el-table--scrollable-x': layout.scrollX,
      'el-table--scrollable-y': layout.scrollY,
      'el-table--enable-row-hover': !store.states.isComplex,
      'el-table--enable-row-transition': (store.states.data || []).length !== 0 && (store.states.data || []).length < 100
    }, tableSize ? `el-table--${ tableSize }` : '']"
    @mouseleave="handleMouseLeave($event)">
    <!-- hover离开表格时,触发handleMouseLev  -->
    <div class="hidden-columns" ref="hiddenColumns"><slot></slot></div>
    <!-- 是否显示表头 -->
    <div
      v-if="showHeader"
      v-mousewheel="handleHeaderFooterMousewheel"
      class="el-table__header-wrapper"
      ref="headerWrapper">
      <!-- 表头组件, store传入组件, border是否显示边框  defaultSort: 默认排序-->
      
      <table-header
        ref="tableHeader"
        :store="store"
        :border="border"
        :default-sort="defaultSort"
        :style="{
          width: layout.bodyWidth ? layout.bodyWidth + 'px' : ''
        }">
      </table-header>
    </div>
    <!-- 表格主体 -->
    <div
      class="el-table__body-wrapper"
      ref="bodyWrapper"
      :class="[layout.scrollX ? `is-scrolling-${scrollPosition}` : 'is-scrolling-none']"
      :style="[bodyHeight]">
      <!-- 表格组件 传入store数据  stripe是否间隔, 行class和行style传入, highlightCurrentRow是否高亮当前行 -->
      <table-body
        :context="context"
        :store="store"
        :stripe="stripe"
        :row-class-name="rowClassName"
        :row-style="rowStyle"
        :highlight="highlightCurrentRow"
        :style="{
           width: bodyWidth
        }">
      </table-body>
      <!-- 无数据时显示内容 -->
      <div
        v-if="!data || data.length === 0"
        class="el-table__empty-block"
        ref="emptyBlock"
        :style="emptyBlockStyle">
        <span class="el-table__empty-text" >
          <slot name="empty">{{ emptyText || t('el.table.emptyText') }}</slot>
        </span>
      </div>
      <!-- append存在时 加入append所代表的行 -->
      <div
        v-if="$slots.append"
        class="el-table__append-wrapper"
        ref="appendWrapper">
        <slot name="append"></slot>
      </div>
    </div>
    <!-- 合计行 -->
    <div
      v-if="showSummary"
      v-show="data && data.length > 0"
      v-mousewheel="handleHeaderFooterMousewheel"
      class="el-table__footer-wrapper"
      ref="footerWrapper">
      <!-- 表尾合计 -->
      <!-- summaryMethod 自定义表尾合计方法 -->
      <table-footer
        :store="store"
        :border="border"
        :sum-text="sumText || t('el.table.sumText')"
        :summary-method="summaryMethod"
        :default-sort="defaultSort"
        :style="{
          width: layout.bodyWidth ? layout.bodyWidth + 'px' : ''
        }">
      </table-footer>
    </div>
    <!-- 如果有固定列 -->
    <div
      v-if="fixedColumns.length > 0"
      v-mousewheel="handleFixedMousewheel"
      class="el-table__fixed"
      ref="fixedWrapper"
      :style="[{
        width: layout.fixedWidth ? layout.fixedWidth + 'px' : ''
      },
      fixedHeight]">
      <div
        v-if="showHeader"
        class="el-table__fixed-header-wrapper"
        ref="fixedHeaderWrapper" >
        <!-- 表头 -->
        <table-header
          ref="fixedTableHeader"
          fixed="left"
          :border="border"
          :store="store"
          :style="{
            width: bodyWidth
          }"></table-header>
      </div>
      <div
        class="el-table__fixed-body-wrapper"
        ref="fixedBodyWrapper"
        :style="[{
          top: layout.headerHeight + 'px'
        },
        fixedBodyHeight]">
        <!-- 表内容  -->
        <table-body
          fixed="left"
          :store="store"
          :stripe="stripe"
          :highlight="highlightCurrentRow"
          :row-class-name="rowClassName"
          :row-style="rowStyle"
          :style="{
            width: bodyWidth
          }">
        </table-body>
        <!-- append存在 -->
        <div
          v-if="$slots.append"
          class="el-table__append-gutter"
          :style="{ height: layout.appendHeight + 'px'}"></div>
      </div>
      <!-- 表合计存在 -->
      <div
        v-if="showSummary"
        v-show="data && data.length > 0"
        class="el-table__fixed-footer-wrapper"
        ref="fixedFooterWrapper">
        <table-footer
          fixed="left"
          :border="border"
          :sum-text="sumText || t('el.table.sumText')"
          :summary-method="summaryMethod"
          :store="store"
          :style="{
            width: bodyWidth
          }"></table-footer>
      </div>
    </div>
    <!-- 最右侧固定列大于1 -->
    <div
      v-if="rightFixedColumns.length > 0"
      v-mousewheel="handleFixedMousewheel"
      class="el-table__fixed-right"
      ref="rightFixedWrapper"
      :style="[{
        width: layout.rightFixedWidth ? layout.rightFixedWidth + 'px' : '',
        right: layout.scrollY ? (border ? layout.gutterWidth : (layout.gutterWidth || 0)) + 'px' : ''
      },
      fixedHeight]">
      <div v-if="showHeader"
        class="el-table__fixed-header-wrapper"
        ref="rightFixedHeaderWrapper">
        <table-header
          ref="rightFixedTableHeader"
          fixed="right"
          :border="border"
          :store="store"
          :style="{
            width: bodyWidth
          }"></table-header>
      </div>
      <div
        class="el-table__fixed-body-wrapper"
        ref="rightFixedBodyWrapper"
        :style="[{
          top: layout.headerHeight + 'px'
        },
        fixedBodyHeight]">
        <table-body
          fixed="right"
          :store="store"
          :stripe="stripe"
          :row-class-name="rowClassName"
          :row-style="rowStyle"
          :highlight="highlightCurrentRow"
          :style="{
            width: bodyWidth
          }">
        </table-body>
         <div
          v-if="$slots.append"
          class="el-table__append-gutter"
          :style="{ height: layout.appendHeight + 'px' }"></div>
      </div>
      <div
        v-if="showSummary"
        v-show="data && data.length > 0"
        class="el-table__fixed-footer-wrapper"
        ref="rightFixedFooterWrapper">
        <table-footer
          fixed="right"
          :border="border"
          :sum-text="sumText || t('el.table.sumText')"
          :summary-method="summaryMethod"
          :store="store"
          :style="{
            width: bodyWidth
          }"></table-footer>
      </div>
    </div>
    <div
      v-if="rightFixedColumns.length > 0"
      class="el-table__fixed-right-patch"
      ref="rightFixedPatch"
      :style="{
        width: layout.scrollY ? layout.gutterWidth + 'px' : '0',
        height: layout.headerHeight + 'px'
      }"></div>
    <div class="el-table__column-resize-proxy" ref="resizeProxy" v-show="resizeProxyVisible"></div>
  </div>
</template>

<script type="text/babel">
  import ElCheckbox from 'element-ui/packages/checkbox';
  import { debounce, throttle } from 'throttle-debounce';
  import { addResizeListener, removeResizeListener } from 'element-ui/src/utils/resize-event';
  import Mousewheel from 'element-ui/src/directives/mousewheel';
  import Locale from 'element-ui/src/mixins/locale';
  import Migrating from 'element-ui/src/mixins/migrating';
  import { createStore, mapStates } from './store/helper';
  import TableLayout from './table-layout';
  import TableBody from './table-body';
  import TableHeader from './table-header';
  import TableFooter from './table-footer';
  import { parseHeight } from './util';

  let tableIdSeed = 1;

  export default {
    name: 'ElTable',

    mixins: [Locale, Migrating],

    directives: {
      Mousewheel
    },

    props: {
      // 表格数据
      data: {
        type: Array,
        default: function() {
          return [];
        }
      },
      // table 尺寸
      size: String,

      width: [String, Number],
      // table的高度
      height: [String, Number],
      // table最大高度
      maxHeight: [String, Number],
      // 列的宽度是否自撑开
      fit: {
        type: Boolean,
        default: true
      },
      // 是否为斑马纹 table
      stripe: Boolean,
      // 是否带有纵向边框
      border: Boolean,
      // 行数据的key用来优化table，为树状表格时必填
      rowKey: [String, Function],

      context: {},
      // 是否显示表头
      showHeader: {
        type: Boolean,
        default: true
      },
      // 是否在表尾显示合计行
      showSummary: Boolean,
      // 合计行第一列的文本	
      sumText: String,
      // 自定义的合计计算方法
      summaryMethod: Function,
      // 行的 className 的回调方法，
      // 也可以使用字符串为所有行设置一个固定的 className
      rowClassName: [String, Function],
      // 行的 style 的回调方法，
      // 也可以使用一个固定的 Object 为所有行设置一样的 Style
      rowStyle: [Object, Function],
      // 同上，不过用在单元格
      cellClassName: [String, Function],
      // 同上，不过用在单元格
      cellStyle: [Object, Function],
      // 同上，不过用在表头
      headerRowClassName: [String, Function],
      // 同上，不过用在表头
      headerRowStyle: [Object, Function],
      // 同上，不过用在表头单元格
      headerCellClassName: [String, Function],
      // 同上，不过用在表头单元格
      headerCellStyle: [Object, Function],
      // 是否高亮当前行
      highlightCurrentRow: Boolean,
      // 当前行的 key，只写属性
      currentRowKey: [String, Number],
      // 空数据时显示的文本内容，也可以通过 slot="empty" 设置
      emptyText: String,
      // 可以通过该属性设置 Table 目前的展开行，需要设置 row-key 属性才能使用，该属性为展开行的 keys 数组。
      expandRowKeys: Array,
      // 是否默认展开所有行
      defaultExpandAll: Boolean,
      // 默认的排序列的 prop 和顺序。它的prop属性指定默认的排序的列，order指定默认排序的顺序
      defaultSort: Object,
      // tooltip effect 属性
      tooltipEffect: String,
      // 合并行或列的计算方法
      spanMethod: Function,
      // 在多选表格中，当仅有部分行被选中时，点击表头的多选框时的行为。若为 true，则选中所有行；若为 false，则取消选择所有行
      selectOnIndeterminate: {
        type: Boolean,
        default: true
      },
      // 展示树形数据时，树节点的缩进
      indent: {
        type: Number,
        default: 16
      },
      // 渲染嵌套数据的配置选项
      treeProps: {
        type: Object,
        default() {
          return {
            hasChildren: 'hasChildren',
            children: 'children'
          };
        }
      },
      // 是否懒加载子节点数据
      lazy: Boolean,
      // 	加载子节点数据的函数，lazy 为 true 时生效，函数第二个参数包含了节点的层级信息
      load: Function
    },

    components: {
      TableHeader,
      TableFooter,
      TableBody,
      ElCheckbox
    },

    methods: {
      // 提示props值更改
      getMigratingConfig() {
        return {
          events: {
            expand: 'expand is renamed to expand-change'
          }
        };
      },
      // 设定选择的列
      setCurrentRow(row) {
        this.store.commit('setCurrentRow', row);
      },
      // 用于多选表格，切换某一行的选中状态，
      // 如果使用了第二个参数，则是设置这一行选中与否（selected 为 true 则选中）
      toggleRowSelection(row, selected) {
        this.store.toggleRowSelection(row, selected, false);
        this.store.updateAllSelected();
      },
      // 用于可展开表格，切换某一行的展开状态，如果使用了第二个参数，则是设置这一行展开与否（expanded 为 true 则展开）
      toggleRowExpansion(row, expanded) {
        this.store.toggleRowExpansionAdapter(row, expanded);
      },
      // 清空用户选择
      clearSelection() {
        this.store.clearSelection();
      },
      // 	不传入参数时用于清空所有过滤条件，数据会恢复成未过滤的状态，也可传入由columnKey组成的数组以清除指定列的过滤条件
      clearFilter(columnKeys) {
        this.store.clearFilter(columnKeys);
      },
      // 清空排序条件
      clearSort() {
        this.store.clearSort();
      },

      handleMouseLeave() {
        this.store.commit('setHoverRow', null);
        if (this.hoverState) this.hoverState = null;
      },

      updateScrollY() {
        const changed = this.layout.updateScrollY();
        if (changed) {
          this.layout.notifyObservers('scrollable');
          this.layout.updateColumnsWidth();
        }
      },

      handleFixedMousewheel(event, data) {
        const bodyWrapper = this.bodyWrapper;
        if (Math.abs(data.spinY) > 0) {
          const currentScrollTop = bodyWrapper.scrollTop;
          if (data.pixelY < 0 && currentScrollTop !== 0) {
            event.preventDefault();
          }
          if (data.pixelY > 0 && bodyWrapper.scrollHeight - bodyWrapper.clientHeight > currentScrollTop) {
            event.preventDefault();
          }
          bodyWrapper.scrollTop += Math.ceil(data.pixelY / 5);
        } else {
          bodyWrapper.scrollLeft += Math.ceil(data.pixelX / 5);
        }
      },

      handleHeaderFooterMousewheel(event, data) {
        const { pixelX, pixelY } = data;
        if (Math.abs(pixelX) >= Math.abs(pixelY)) {
          this.bodyWrapper.scrollLeft += data.pixelX / 5;
        }
      },

      // TODO 使用 CSS transform
      // 节流
      syncPostion: throttle(20, function() {
        const { scrollLeft, scrollTop, offsetWidth, scrollWidth } = this.bodyWrapper;
        // 获取组成el-table的各部分dom的scrollLeft和scrollTop
        const { headerWrapper, footerWrapper, fixedBodyWrapper, rightFixedBodyWrapper } = this.$refs;
        if (headerWrapper) headerWrapper.scrollLeft = scrollLeft;
        if (footerWrapper) footerWrapper.scrollLeft = scrollLeft;
        if (fixedBodyWrapper) fixedBodyWrapper.scrollTop = scrollTop;
        if (rightFixedBodyWrapper) rightFixedBodyWrapper.scrollTop = scrollTop;
        // 设置scrollPosition
        const maxScrollLeftPosition = scrollWidth - offsetWidth - 1;
        if (scrollLeft >= maxScrollLeftPosition) {
          this.scrollPosition = 'right';
        } else if (scrollLeft === 0) {
          this.scrollPosition = 'left';
        } else {
          this.scrollPosition = 'middle';
        }
      }),
      // table=body绑定scroll事件
      bindEvents() {
        this.bodyWrapper.addEventListener('scroll', this.syncPostion, { passive: true });
        // 如果列宽度自定义撑开
        if (this.fit) {
          addResizeListener(this.$el, this.resizeListener);
        }
      },
      // 解绑table-bodyscroll事件
      unbindEvents() {
        this.bodyWrapper.removeEventListener('scroll', this.syncPostion, { passive: true });
        if (this.fit) {
          removeResizeListener(this.$el, this.resizeListener);
        }
      },
      // 
      resizeListener() {
        if (!this.$ready) return;
        let shouldUpdateLayout = false;
        const el = this.$el;
        const { width: oldWidth, height: oldHeight } = this.resizeState;

        const width = el.offsetWidth;
        // 宽度或者高度不同时，更新layout
        if (oldWidth !== width) {
          shouldUpdateLayout = true;
        }

        const height = el.offsetHeight;
        if ((this.height || this.shouldUpdateHeight) && oldHeight !== height) {
          shouldUpdateLayout = true;
        }

        if (shouldUpdateLayout) {
          // 更新resizeState的宽度和高度
          this.resizeState.width = width;
          this.resizeState.height = height;
          this.doLayout();
        }
      },
      // 对 Table 进行重新布局
      doLayout() {
        if (this.shouldUpdateHeight) {
          this.layout.updateElsHeight();
        }
        this.layout.updateColumnsWidth();
      },
      // 手动对 Table 进行排序
      sort(prop, order) {
        this.store.commit('sort', { prop, order });
      },
      // 用于多选表格，切换所有行的选中状态
      toggleAllSelection() {
        this.store.commit('toggleAllSelection');
      }

    },

    computed: {
      // 获取表格尺寸
      tableSize() {
        return this.size || (this.$ELEMENT || {}).size;
      },
      // 返回table-body的dom结构
      bodyWrapper() {
        return this.$refs.bodyWrapper;
      },
      // 是否需要更新高度
      shouldUpdateHeight() {
        return this.height ||
          this.maxHeight ||
          this.fixedColumns.length > 0 ||
          this.rightFixedColumns.length > 0;
      },
      // 表格宽度
      bodyWidth() {
        const { bodyWidth, scrollY, gutterWidth } = this.layout;
        //根据scrollY是否为true 获取表格原有宽度
        return bodyWidth ? bodyWidth - (scrollY ? gutterWidth : 0) + 'px' : '';
      },
      // 表格高度
      bodyHeight() {
        const { headerHeight = 0, bodyHeight, footerHeight = 0} = this.layout;
        if (this.height) {
          return {
            height: bodyHeight ? bodyHeight + 'px' : ''
          };
        } else if (this.maxHeight) {
          const maxHeight = parseHeight(this.maxHeight);
          if (typeof maxHeight === 'number') {
            return {
              'max-height': (maxHeight - footerHeight - (this.showHeader ? headerHeight : 0)) + 'px'
            };
          }
        }
        return {};
      },
      // 计算后的表格高度 为Table Height - Table Header Height - Scroll Bar Height
      fixedBodyHeight() {
        if (this.height) {
          return {
            height: this.layout.fixedBodyHeight ? this.layout.fixedBodyHeight + 'px' : ''
          };
        } else if (this.maxHeight) {
          let maxHeight = parseHeight(this.maxHeight);
          if (typeof maxHeight === 'number') {
            maxHeight = this.layout.scrollX ? maxHeight - this.layout.gutterWidth : maxHeight;
            if (this.showHeader) {
              maxHeight -= this.layout.headerHeight;
            }
            maxHeight -= this.layout.footerHeight;
            return {
              'max-height': maxHeight + 'px'
            };
          }
        }
        return {};
      },
      // 有固定列时表格样式
      fixedHeight() {
        if (this.maxHeight) {
          if (this.showSummary) {
            return {
              bottom: 0
            };
          }
          return {
            bottom: (this.layout.scrollX && this.data.length) ? this.layout.gutterWidth + 'px' : ''
          };
        } else {
          if (this.showSummary) {
            return {
              height: this.layout.tableHeight ? this.layout.tableHeight + 'px' : ''
            };
          }
          return {
            height: this.layout.viewportHeight ? this.layout.viewportHeight + 'px' : ''
          };
        }
      },
      // 无值时,表格样式
      emptyBlockStyle() {
        if (this.data && this.data.length) return null;
        let height = '100%';
        if (this.layout.appendHeight) {
          height = `calc(100% - ${this.layout.appendHeight}px)`;
        }
        return {
          width: this.bodyWidth,
          height
        };
      },
      // 返回store.state的值
      ...mapStates({
        selection: 'selection',
        columns: 'columns',
        tableData: 'data',
        fixedColumns: 'fixedColumns',
        rightFixedColumns: 'rightFixedColumns'
      })
    },

    watch: {
      // 观察高度
      height: {
        immediate: true,
        handler(value) {
          this.layout.setHeight(value);
        }
      },
      // 观察最大高度
      maxHeight: {
        immediate: true,
        handler(value) {
          this.layout.setMaxHeight(value);
        }
      },
      // 观察当前行的key
      currentRowKey: {
        immediate: true,
        handler(value) {
          if (!this.rowKey) return;
          this.store.setCurrentRowKey(value);
        }
      },
      //观察数据
      data: {
        immediate: true,
        handler(value) {
          this.store.commit('setData', value);
        }
      },
      // 观察展开行的keys
      expandRowKeys: {
        immediate: true,
        handler(newVal) {
          if (newVal) {
            this.store.setExpandRowKeysAdapter(newVal);
          }
        }
      }
    },

    created() {
      // 设置表格tableId
      this.tableId = 'el-table_' + tableIdSeed++;
      // 设置防抖
      this.debouncedUpdateLayout = debounce(50, () => this.doLayout());
    },

    mounted() {
      // 绑定事件
      this.bindEvents();
      // store更新列
      this.store.updateColumns();
      // 对table重新布局
      this.doLayout();
      // 对resizeState给值
      this.resizeState = {
        width: this.$el.offsetWidth,
        height: this.$el.offsetHeight
      };

      // 初始化filtered
      this.store.states.columns.forEach(column => {
        if (column.filteredValue && column.filteredValue.length) {
          this.store.commit('filterChange', {
            column,
            values: column.filteredValue,
            silent: true
          });
        }
      });

      this.$ready = true;
    },

    destroyed() {
      //  解绑事件
      this.unbindEvents();
    },

    data() {
      // 设置 this.treeProps
      const { hasChildren = 'hasChildren', children = 'children' } = this.treeProps;
      // 构造store
      this.store = createStore(this, {
        rowKey: this.rowKey,
        defaultExpandAll: this.defaultExpandAll,
        selectOnIndeterminate: this.selectOnIndeterminate,
        // TreeTable 的相关配置
        indent: this.indent,
        lazy: this.lazy,
        lazyColumnIdentifier: hasChildren,
        childrenColumnName: children
      });
      // 构造layout对象
      const layout = new TableLayout({
        store: this.store,
        table: this,
        fit: this.fit,
        showHeader: this.showHeader
      });
      return {
        layout,
        isHidden: false,
        renderExpanded: null,
        resizeProxyVisible: false,
        resizeState: {
          width: null,
          height: null
        },
        // 是否拥有多级表头
        isGroup: false,
        // 滚动位置
        scrollPosition: 'left'
      };
    }
  };
</script>
