<template>
  <div
    ref="reference"
    :class="[
      'el-cascader',
      realSize && `el-cascader--${realSize}`,
      { 'is-disabled': isDisabled }
    ]"
    v-clickoutside="() => toggleDropDownVisible(false)"
    @mouseenter="inputHover = true"
    @mouseleave="inputHover = false"
    @click="() => toggleDropDownVisible(readonly ? undefined : true)"
    @keydown="handleKeyDown">
<!-- 在组件外面点击时触发 toggleDropDownVisible -->
<!-- mouseenter和mouseleave表示鼠标移入移出span时切换inputHover 且mouseenter和mouseleave是冒泡而来 -->
<!-- 键盘按下键时触发handleKeyDown -->
    <el-input
      ref="input"
      v-model="multiple ? presentText : inputValue"
      :size="realSize"
      :placeholder="placeholder"
      :readonly="readonly"
      :disabled="isDisabled"
      :validate-event="false"
      :class="{ 'is-focus': dropDownVisible }"
      @focus="handleFocus"
      @blur="handleBlur"
      @input="handleInput">
      <template slot="suffix">
        <i
          v-if="clearBtnVisible"
          key="clear"
          class="el-input__icon el-icon-circle-close"
          @click.stop="handleClear"></i>
        <i
          v-else
          key="arrow-down"
          :class="[
            'el-input__icon',
            'el-icon-arrow-down',
            dropDownVisible && 'is-reverse'
          ]"
          @click.stop="toggleDropDownVisible()"></i>
      </template>
    </el-input> 
    <!-- 如果是多选, 在el-input上层覆盖el-tag和input -->
    <div v-if="multiple" class="el-cascader__tags">
      <el-tag
        v-for="(tag, index) in presentTags"
        :key="tag.key"
        type="info"
        :size="tagSize"
        :hit="tag.hitState"
        :closable="tag.closable"
        disable-transitions
        @close="deleteTag(index)">
        <span>{{ tag.text }}</span>
      </el-tag>
      <input
        v-if="filterable && !isDisabled"
        v-model.trim="inputValue"
        type="text"
        class="el-cascader__search-input"
        :placeholder="presentTags.length ? '' : placeholder"
        @input="e => handleInput(inputValue, e)"
        @click.stop="toggleDropDownVisible(true)"
        @keydown.delete="handleDelete">
    </div>
    <!-- 下拉框 -->
    <!-- transition 用来在下拉框时先调用hadnleDropdownLeave -->
    <transition name="el-zoom-in-top" @after-leave="handleDropdownLeave">
      <div
        v-show="dropDownVisible"
        ref="popper"
        :class="['el-popper', 'el-cascader__dropdown', popperClass]">
        <el-cascader-panel
          ref="panel"
          v-show="!filtering"
          v-model="checkedValue"
          :options="options"
          :props="config"
          :border="false"
          :render-label="$scopedSlots.default"
          @expand-change="handleExpandChange"
          @close="toggleDropDownVisible(false)"></el-cascader-panel>
          <!-- 搜索时， 使用el-scrollbar代替el-cascader-panel -->
        <el-scrollbar
          ref="suggestionPanel"
          v-if="filterable"
          v-show="filtering"
          tag="ul"
          class="el-cascader__suggestion-panel"
          view-class="el-cascader__suggestion-list"
          @keydown.native="handleSuggestionKeyDown">
          <!-- 搜索时的建议 -->
          <template v-if="suggestions.length">
            <li
              v-for="(item, index) in suggestions"
              :key="item.uid"
              :class="[
                'el-cascader__suggestion-item',
                item.checked && 'is-checked'
              ]"
              :tabindex="-1"
              @click="handleSuggestionClick(index)">
              <span>{{ item.text }}</span>
              <i v-if="item.checked" class="el-icon-check"></i>
            </li>
          </template>
          <slot v-else name="empty">
            <li class="el-cascader__empty-text">{{ t('el.cascader.noMatch') }}</li>
          </slot>
        </el-scrollbar>
      </div>
    </transition>
  </div>
</template>

<script>
import Popper from 'element-ui/src/utils/vue-popper';
import Clickoutside from 'element-ui/src/utils/clickoutside';
import Emitter from 'element-ui/src/mixins/emitter';
import Locale from 'element-ui/src/mixins/locale';
import Migrating from 'element-ui/src/mixins/migrating';
import ElInput from 'element-ui/packages/input';
import ElTag from 'element-ui/packages/tag';
import ElScrollbar from 'element-ui/packages/scrollbar';
import ElCascaderPanel from 'element-ui/packages/cascader-panel';
import AriaUtils from 'element-ui/src/utils/aria-utils';
import { t } from 'element-ui/src/locale';
import { isEqual, isEmpty, kebabCase } from 'element-ui/src/utils/util';
import { isUndefined, isFunction } from 'element-ui/src/utils/types';
import { isDef } from 'element-ui/src/utils/shared';
import { addResizeListener, removeResizeListener } from 'element-ui/src/utils/resize-event';
import debounce from 'throttle-debounce/debounce';

const { keys: KeyCode } = AriaUtils;
const MigratingProps = {
  expandTrigger: {
    newProp: 'expandTrigger', //次级菜单的展开方式
    type: String
  },
  changeOnSelect: {
    newProp: 'checkStrictly', // 是否严格的遵守父子节点不互相关联
    type: Boolean
  },
  hoverThreshold: {
    newProp: 'hoverThreshold',
    type: Number
  }
};
// 混入的popper的props
const PopperMixin = {
  // 传入的props
  props: {
    //下拉框显示位置
    placement: {
      type: String,
     
     default: 'bottom-start'
    },
    //下拉框是否在body下
    appendToBody: Popper.props.appendToBody,
    visibleArrow: {
      type: Boolean,
      default: true
    },
    arrowOffset: Popper.props.arrowOffset,
    // 下拉框偏移量
    offset: Popper.props.offset,
    boundariesPadding: Popper.props.boundariesPadding,
    // popper配置项
    popperOptions: Popper.props.popperOptions
  },
  // popper 方法
  methods: Popper.methods,
  data: Popper.data,
  // 销毁之前的钩子
  beforeDestroy: Popper.beforeDestroy
};
// size map
const InputSizeMap = {
  medium: 36,
  small: 32,
  mini: 28
};

export default {
  name: 'ElCascader',
  //  自定义指令
  directives: { Clickoutside },
  // 混入组件
  mixins: [PopperMixin, Emitter, Locale, Migrating],

  // 依赖注入
  inject: {
    elForm: {
      default: ''
    },
    elFormItem: {
      default: ''
    }
  },

  components: {
    ElInput,
    ElTag,
    ElScrollbar,
    ElCascaderPanel
  },
  //传入的porps
  props: {
    value: {}, // el-cascader的value
    options: Array, // 可选项数据源
    props: Object,  // 配置选项
    size: String, //尺寸
    // 输入的默认值,使用
    placeholder: {
      type: String,
      default: () => t('el.cascader.placeholder')
    },
    // 是否禁用
    disabled: Boolean,
    // 是否可清除
    clearable: Boolean,
    // 是否可搜索
    filterable: Boolean,
    // 可搜索方法
    filterMethod: Function,
    // 选项分割符
    separator: {
      type: String,
      default: ' / '
    },
    //是否显示选中值的完整路径
    showAllLevels: {
      type: Boolean,
      default: true
    },
    // 在多选模式下是否折叠Tag
    collapseTags: Boolean,
    // 搜索关键词输入的去抖延迟，毫秒	
    debounce: {
      type: Number,
      default: 300
    },
    // 筛选之前的钩子
    beforeFilter: {
      type: Function,
      default: () => (() => {})
    },
    // 自定义浮层类名
    popperClass: String
  },

  data() {
    return {
      // 控制浮层是否显示
      dropDownVisible: false,
      // 组件选择的值
      checkedValue: this.value || null,
      // input 获得焦点
      inputHover: false,
      // input 的 值
      inputValue: null,
      presentText: null,
      // 多选时已经选择的tag
      presentTags: [],
      // 选择的节点
      checkedNodes: [],
      // 搜索时的标志位
      filtering: false,
      // 搜索时过渡后的输入建议
      suggestions: [],
      inputInitialHeight: 0,
      // delete键 删除tags时标志位
      pressDeleteCount: 0
    };
  },

  computed: {
    // 获取el-cascader size
    realSize() {
      const _elFormItemSize = (this.elFormItem || {}).elFormItemSize;
      return this.size || _elFormItemSize || (this.$ELEMENT || {}).size;
    },
    // tag的标签大小
    tagSize() {
      return ['small', 'mini'].indexOf(this.realSize) > -1
        ? 'mini'
        : 'small';
    },
    // 是否在禁用状态
    isDisabled() {
      return this.disabled || (this.elForm || {}).disabled;
    },
    // props设置
    config() {
      // 获取传入的props属性值，如:props="{ expandTrigger: 'hover' }"
      const config = this.props || {};
      const { $attrs } = this;

      Object
        .keys(MigratingProps)
        .forEach(oldProp => {
          const { newProp, type } = MigratingProps[oldProp];
          let oldValue = $attrs[oldProp] || $attrs[kebabCase(oldProp)];
          if (isDef(oldProp) && !isDef(config[newProp])) {
            if (type === Boolean && oldValue === '') {
              oldValue = true;
            }
            config[newProp] = oldValue;
          }
        });
      // 返回this.props配置项
      return config;
    },
    // 是否多选
    multiple() {
      return this.config.multiple;
    },
    // checkStr默认为flae , leafOnly默认为True
    leafOnly() {
      return !this.config.checkStrictly;
    },
    // 多选或者不可过滤时只读
    readonly() {
      return !this.filterable || this.multiple;
    },
    // 是否显示关闭图标
    clearBtnVisible() {
      if (!this.clearable || this.isDisabled || this.filtering || !this.inputHover) {
        return false;
      }
      //多选时，判断是否有选择项目
      // 不是多选时，判断是否有presentText
      return this.multiple
        ? !!this.checkedNodes.filter(node => !node.isDisabled).length
        : !!this.presentText;
    },
    // 返回panel组件
    panel() {
      return this.$refs.panel;
    }
  },

  watch: {
    // 监听 disabled属性
    disabled() {
      this.computePresentContent();
    },
    // 监听value值， 并传给checkedValue
    value(val) {
      if (!isEqual(val, this.checkedValue)) {
        this.checkedValue = val;
        this.computePresentContent();
      }
    },
    // checkedValue改变时
    checkedValue(val) {
      const { value, dropDownVisible } = this;
      const { checkStrictly, multiple } = this.config;

      if (!isEqual(val, value) || isUndefined(value)) {
        this.computePresentContent();
        // hide dropdown when single mode
        if (!multiple && !checkStrictly && dropDownVisible) {
          this.toggleDropDownVisible(false);
        }
        //emit 发送 checkedValue值
        this.$emit('input', val);
        this.$emit('change', val);
        this.dispatch('ElFormItem', 'el.form.change', [val]);
      }
    },
    // 数据源改变时
    options: {
      handler: function() {
        this.$nextTick(this.computePresentContent);
      },
      deep: true
    },
    // inputValue随presentText改变
    presentText(val) {
      this.inputValue = val;
    },
    // presentTags数组改变时
    presentTags(val, oldVal) {
      // 如果是多选，更新updateStyle
      if (this.multiple && (val.length || oldVal.length)) {
        this.$nextTick(this.updateStyle);
      }
    },
    //  感觉是一个标志位
    filtering(val) {
      this.$nextTick(this.updatePopper);
    }
  },

  mounted() {
    const { input } = this.$refs;
    // 设置inputIntialHeight值
    if (input && input.$el) {
      this.inputInitialHeight = input.$el.offsetHeight || InputSizeMap[this.realSize] || 40;
    }

    if (!isEmpty(this.value)) {
      this.computePresentContent();
    }
    // 设置过滤方法
    this.filterHandler = debounce(this.debounce, () => {
      const { inputValue } = this;
      // inputValue为空时, 说明没有在搜索所以返回
      if (!inputValue) {
        this.filtering = false;
        return;
      }
      // 判断是否有beforeFilter方法
      const before = this.beforeFilter(inputValue);
      if (before && before.then) {
        before.then(this.getSuggestions);
      } else if (before !== false) {
        // 获取建议列表
        this.getSuggestions();
      } else {
        this.filtering = false;
      }
    });

    addResizeListener(this.$el, this.updateStyle);
  },

  beforeDestroy() {
    removeResizeListener(this.$el, this.updateStyle);
  },

  methods: {
    // 提示用户API已过期
    getMigratingConfig() {
      return {
        props: {
          'expand-trigger': 'expand-trigger is removed, use `props.expandTrigger` instead.',
          'change-on-select': 'change-on-select is removed, use `props.checkStrictly` instead.',
          'hover-threshold': 'hover-threshold is removed, use `props.hoverThreshold` instead'
        },
        events: {
          'active-item-change': 'active-item-change is renamed to expand-change'
        }
      };
    },

    // 展开或隐藏toggleDropDownVisible
    toggleDropDownVisible(visible) {
      // 如果禁用返回
      if (this.isDisabled) return;

      const { dropDownVisible } = this;
      const { input } = this.$refs;
      visible = isDef(visible) ? visible : !dropDownVisible;
      if (visible !== dropDownVisible) {
        // 已传入的visible的值为准
        this.dropDownVisible = visible;
        // 如果为true, 更新popper, 并且滚动到所选值
        if (visible) {
          this.$nextTick(() => {
            this.updatePopper();
            this.panel.scrollIntoView();
          });
        }
        input.$refs.input.setAttribute('aria-expanded', visible);
        // 发送visible值
        this.$emit('visible-change', visible);
      }
    },
    handleDropdownLeave() {
      this.filtering = false;
      this.inputValue = this.presentText;
    },
    // 按下键时触发
    handleKeyDown(event) {
      //判断键值code
      switch (event.keyCode) {
        case KeyCode.enter:
          this.toggleDropDownVisible();
          break;
        case KeyCode.down:
          // 不是按下event键时
          this.toggleDropDownVisible(true);
          // 聚焦在第一个值
          this.focusFirstNode();
          event.preventDefault();
          break;
        // 按下esc或者tabl键值时
        case KeyCode.esc:
        case KeyCode.tab:
          this.toggleDropDownVisible(false);
          break;
      }
    },
    // 聚焦时发送事件
    handleFocus(e) {
      this.$emit('focus', e);
    },
    // 失去焦点时发送事件
    handleBlur(e) {
      this.$emit('blur', e);
    },
    // 可输入时开启搜索
    handleInput(val, event) {
      !this.dropDownVisible && this.toggleDropDownVisible(true);

      if (event && event.isComposing) return;
      if (val) {
        this.filterHandler();
      } else {
        // 正在搜索标志位置 false
        this.filtering = false;
      }
    },
    handleClear() {
      this.presentText = '';
      this.panel.clearCheckedNodes();
    },
    // el-cascader-panel 展开时，更新popper并发送emit事件
    handleExpandChange(value) {
      this.$nextTick(this.updatePopper.bind(this));
      this.$emit('expand-change', value);
      this.$emit('active-item-change', value); // Deprecated
    },
    // 聚焦el-cascader第一个选项
    focusFirstNode() {
      this.$nextTick(() => {
        const { filtering } = this;
        const { popper, suggestionPanel } = this.$refs;
        let firstNode = null;

        if (filtering && suggestionPanel) {
          firstNode = suggestionPanel.$el.querySelector('.el-cascader__suggestion-item');
        } else {
          const firstMenu = popper.querySelector('.el-cascader-menu');
          firstNode = firstMenu.querySelector('.el-cascader-node[tabindex="-1"]');
        }

        if (firstNode) {
          firstNode.focus();
          !filtering && firstNode.click();
        }
      });
    },
    computePresentContent() {
      // nextTick is required, because checked nodes may not change right now
      this.$nextTick(() => {
        // 根据是否多选来选择设置 presentText 或者 presentTags
        if (this.config.multiple) {
          this.computePresentTags();
          this.presentText = this.presentTags.length ? ' ' : null;
        } else {
          this.computePresentText();
        }
      });
    },
    // 设置 presentText的值
    computePresentText() {
      const { checkedValue, config } = this;
      if (!isEmpty(checkedValue)) {
        const node = this.panel.getNodeByValue(checkedValue);
        if (node && (config.checkStrictly || node.isLeaf)) {
          this.presentText = node.getText(this.showAllLevels, this.separator);
          return;
        }
      }
      this.presentText = null;
    },
    computePresentTags() {
      const { isDisabled, leafOnly, showAllLevels, separator, collapseTags } = this;
      const checkedNodes = this.getCheckedNodes(leafOnly);
      const tags = [];

      const genTag = node => ({
        node,
        key: node.uid,
        text: node.getText(showAllLevels, separator),
        hitState: false,
        closable: !isDisabled && !node.isDisabled
      });

      if (checkedNodes.length) {
        const [first, ...rest] = checkedNodes;
        const restCount = rest.length;
        tags.push(genTag(first));

        if (restCount) {
          if (collapseTags) {
            tags.push({
              key: -1,
              text: `+ ${restCount}`,
              closable: false
            });
          } else {
            rest.forEach(node => tags.push(genTag(node)));
          }
        }
      }

      this.checkedNodes = checkedNodes;
      this.presentTags = tags;
    },
    getSuggestions() {
      let { filterMethod } = this;
      //如果没有filterMethd就定义
      if (!isFunction(filterMethod)) {
        filterMethod = (node, keyword) => node.text.includes(keyword);
      }
      // 调用el-casder-pane的getFlattedNodes方法
      // this.leafOnly 为 this.changeOnSelect取反
      // 通过filterMethod 和 inputValue值进行过滤
      const suggestions = this.panel.getFlattedNodes(this.leafOnly)
        .filter(node => {
          if (node.isDisabled) return false;
          node.text = node.getText(this.showAllLevels, this.separator) || '';
          return filterMethod(node, this.inputValue);
        });
      // 如果是多选, 对所有presentTags不聚焦
      if (this.multiple) {
        this.presentTags.forEach(tag => {
          tag.hitState = false;
        });
      } else {
        // 不是多选时, 设置node的checked值
        suggestions.forEach(node => {
          node.checked = isEqual(this.checkedValue, node.getValueByOption());
        });
      }

      this.filtering = true;
      this.suggestions = suggestions;
      this.$nextTick(this.updatePopper);
    },
    handleSuggestionKeyDown(event) {
      const { keyCode, target } = event;
      switch (keyCode) {
        case KeyCode.enter:
          target.click();
          break;
        case KeyCode.up:
          const prev = target.previousElementSibling;
          prev && prev.focus();
          break;
        case KeyCode.down:
          const next = target.nextElementSibling;
          next && next.focus();
          break;
        case KeyCode.esc:
        case KeyCode.tab:
          this.toggleDropDownVisible(false);
          break;
      }
    },
    //多选时 input调用， 从最后一项开始删除
    handleDelete() {
      const { inputValue, pressDeleteCount, presentTags } = this;
      // 获取索引
      const lastIndex = presentTags.length - 1;
      /// 获取最后的tag
      const lastTag = presentTags[lastIndex];
      // inputValue有值时，删除inputValue值
      this.pressDeleteCount = inputValue ? 0 : pressDeleteCount + 1;

      if (!lastTag) return;

      if (this.pressDeleteCount) {
        // 判断是否已经聚焦, 已聚焦删除
        // 没有就聚焦
        if (lastTag.hitState) {
          this.deleteTag(lastIndex);
        } else {
          lastTag.hitState = true;
        }
      }
    },
    // 搜索时，点击建议项时
    handleSuggestionClick(index) {
      const { multiple } = this;
      const targetNode = this.suggestions[index];

      if (multiple) {
        // 如果是多选
        const { checked } = targetNode;
        // 设置 targetNode已选
        // 更新 this.panel
        targetNode.doCheck(!checked);
        this.panel.calculateMultiCheckedValue();
      } else {
        // 不是多选时, 设置checkedValue 隐藏下拉框
        this.checkedValue = targetNode.getValueByOption();
        this.toggleDropDownVisible(false);
      }
    },
    // 删除多选中的一项
    deleteTag(index) {
      const { checkedValue } = this;
      const val = checkedValue[index];
      // 过滤要删除的项
      this.checkedValue = checkedValue.filter((n, i) => i !== index);
      this.$emit('remove-tag', val);
    },
    updateStyle() {
      const { $el, inputInitialHeight } = this;
      if (this.$isServer || !$el) return;

      const { suggestionPanel } = this.$refs;
      const inputInner = $el.querySelector('.el-input__inner');

      if (!inputInner) return;

      const tags = $el.querySelector('.el-cascader__tags');
      let suggestionPanelEl = null;

      if (suggestionPanel && (suggestionPanelEl = suggestionPanel.$el)) {
        const suggestionList = suggestionPanelEl.querySelector('.el-cascader__suggestion-list');
        suggestionList.style.minWidth = inputInner.offsetWidth + 'px';
      }

      if (tags) {
        const { offsetHeight } = tags;
        const height = Math.max(offsetHeight + 6, inputInitialHeight) + 'px';
        inputInner.style.height = height;
        this.updatePopper();
      }
    },

    /**
     * public methods
    */
    // 返回 选中的node
    getCheckedNodes(leafOnly) {
      return this.panel.getCheckedNodes(leafOnly);
    }
  }
};
</script>

