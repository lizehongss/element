<template>
  <!-- v-clickoutside指令用于在el-select外部点击时，关闭下拉菜单-->
  <div
    class="el-select"
    :class="[selectSize ? 'el-select--' + selectSize : '']"
    @click.stop="toggleMenu"
    v-clickoutside="handleClose">
    <!-- 多选时tag显示 -->
    <div
      class="el-select__tags"
      v-if="multiple"
      ref="tags"
      :style="{ 'max-width': inputWidth - 32 + 'px', width: '100%' }">
      <!-- 使用el-tag组件 显示多选内容 -->
      <!-- 多选时将选中值按文字形式展示时  -->
      <span v-if="collapseTags && selected.length">
        <el-tag
          :closable="!selectDisabled"
          :size="collapseTagSize"
          :hit="selected[0].hitState"
          type="info"
          @close="deleteTag($event, selected[0])"
          disable-transitions>
          <span class="el-select__tags-text">{{ selected[0].currentLabel }}</span>  
        </el-tag>
        <!-- 多选择大于1时，使用 +1, +2, +3显示 -->
        <el-tag
          v-if="selected.length > 1"
          :closable="false"
          :size="collapseTagSize"
          type="info"
          disable-transitions>
          <span class="el-select__tags-text">+ {{ selected.length - 1 }}</span>
        </el-tag>
      </span>
      <transition-group @after-leave="resetInputHeight" v-if="!collapseTags">
        <el-tag
          v-for="item in selected"
          :key="getValueKey(item)"
          :closable="!selectDisabled"
          :size="collapseTagSize"
          :hit="item.hitState"
          type="info"
          @close="deleteTag($event, item)"
          disable-transitions>
          <span class="el-select__tags-text">{{ item.currentLabel }}</span>
        </el-tag>
      </transition-group>
      <!-- 可搜索时使用 -->
      <input
        type="text"
        class="el-select__input"
        :class="[selectSize ? `is-${ selectSize }` : '']"
        :disabled="selectDisabled"
        :autocomplete="autoComplete || autocomplete"
        @focus="handleFocus"
        @blur="softFocus = false"
        @keyup="managePlaceholder"
        @keydown="resetInputState"
        @keydown.down.prevent="navigateOptions('next')"
        @keydown.up.prevent="navigateOptions('prev')"
        @keydown.enter.prevent="selectOption"
        @keydown.esc.stop.prevent="visible = false"
        @keydown.delete="deletePrevTag"
        @keydown.tab="visible = false"
        @compositionstart="handleComposition"
        @compositionupdate="handleComposition"
        @compositionend="handleComposition"
        v-model="query"
        @input="debouncedQueryChange"
        v-if="filterable"
        :style="{ 'flex-grow': '1', width: inputLength / (inputWidth - 32) + '%', 'max-width': inputWidth - 42 + 'px' }"
        ref="input">
    </div>
    <el-input
      ref="reference"
      v-model="selectedLabel"
      type="text"
      :placeholder="currentPlaceholder"
      :name="name"
      :id="id"
      :autocomplete="autoComplete || autocomplete"
      :size="selectSize"
      :disabled="selectDisabled"
      :readonly="readonly"
      :validate-event="false"
      :class="{ 'is-focus': visible }"
      :tabindex="(multiple && filterable) ? '-1' : null"
      @focus="handleFocus"
      @blur="handleBlur"
      @keyup.native="debouncedOnInputChange"
      @keydown.native.down.stop.prevent="navigateOptions('next')"
      @keydown.native.up.stop.prevent="navigateOptions('prev')"
      @keydown.native.enter.prevent="selectOption"
      @keydown.native.esc.stop.prevent="visible = false"
      @keydown.native.tab="visible = false"
      @paste.native="debouncedOnInputChange"
      @mouseenter.native="inputHovering = true"
      @mouseleave.native="inputHovering = false">
      <template slot="prefix" v-if="$slots.prefix">
        <slot name="prefix"></slot>
      </template>
      <template slot="suffix">
        <i v-show="!showClose" :class="['el-select__caret', 'el-input__icon', 'el-icon-' + iconClass]"></i>
        <i v-if="showClose" class="el-select__caret el-input__icon el-icon-circle-close" @click="handleClearClick"></i>
      </template>
    </el-input>
    <transition
      name="el-zoom-in-top"
      @before-enter="handleMenuEnter"
      @after-leave="doDestroy">
      <el-select-menu
        ref="popper"
        :append-to-body="popperAppendToBody"
        v-show="visible && emptyText !== false">
        <!-- el-option 置于滚动组件中 -->
        <el-scrollbar
          tag="ul"
          wrap-class="el-select-dropdown__wrap"
          view-class="el-select-dropdown__list"
          ref="scrollbar"
          :class="{ 'is-empty': !allowCreate && query && filteredOptionsCount === 0 }"
          v-show="options.length > 0 && !loading">
          <el-option
            :value="query"
            created
            v-if="showNewOption">
          </el-option>
          <slot></slot>
        </el-scrollbar>
        <template v-if="emptyText && (!allowCreate || loading || (allowCreate && options.length === 0 ))">
          <slot name="empty" v-if="$slots.empty"></slot>
          <p class="el-select-dropdown__empty" v-else>
            {{ emptyText }}
          </p>
        </template>
      </el-select-menu>
    </transition>
  </div>
</template>

<script type="text/babel">
  import Emitter from 'element-ui/src/mixins/emitter';
  import Focus from 'element-ui/src/mixins/focus';
  import Locale from 'element-ui/src/mixins/locale';
  import ElInput from 'element-ui/packages/input';
  import ElSelectMenu from './select-dropdown.vue';
  import ElOption from './option.vue';
  import ElTag from 'element-ui/packages/tag';
  import ElScrollbar from 'element-ui/packages/scrollbar';
  import debounce from 'throttle-debounce/debounce';
  import Clickoutside from 'element-ui/src/utils/clickoutside';
  import { addResizeListener, removeResizeListener } from 'element-ui/src/utils/resize-event';
  import { t } from 'element-ui/src/locale';
  import scrollIntoView from 'element-ui/src/utils/scroll-into-view';
  import { getValueByPath, valueEquals, isIE, isEdge } from 'element-ui/src/utils/util';
  import NavigationMixin from './navigation-mixin';
  import { isKorean } from 'element-ui/src/utils/shared';

  export default {
    mixins: [Emitter, Locale, Focus('reference'), NavigationMixin],

    name: 'ElSelect',

    componentName: 'ElSelect',

    inject: {
      elForm: {
        default: ''
      },

      elFormItem: {
        default: ''
      }
    },
    // 向子组件依赖注入select
    provide() {
      return {
        'select': this
      };
    },

    computed: {
      _elFormItemSize() {
        return (this.elFormItem || {}).elFormItemSize;
      },

      readonly() {
        // 多选， 不可搜索时只读
        return !this.filterable || this.multiple || (!isIE() && !isEdge() && !this.visible);
      },

      showClose() {
        // 判断hasValue有值
        let hasValue = this.multiple
          ? Array.isArray(this.value) && this.value.length > 0
          : this.value !== undefined && this.value !== null && this.value !== '';
        let criteria = this.clearable &&
          !this.selectDisabled &&
          this.inputHovering &&
          hasValue;
        return criteria;
      },

      iconClass() {
        // 为远程和搜索时， 不显示上三角和下三角图标'
        // 根据this.visible判断图标
        return this.remote && this.filterable ? '' : (this.visible ? 'arrow-up is-reverse' : 'arrow-up');
      },
      // 根据是否远程设置防抖时间
      debounce() {
        return this.remote ? 300 : 0;
      },
      // 下拉菜单提示文字内容
      emptyText() {
        if (this.loading) {
          // 提示加载 
          return this.loadingText || this.t('el.select.loading');
        } else {
          if (this.remote && this.query === '' && this.options.length === 0) return false;
          if (this.filterable && this.query && this.options.length > 0 && this.filteredOptionsCount === 0) {
            // 提示暂无匹配
            return this.noMatchText || this.t('el.select.noMatch');
          }
          if (this.options.length === 0) {
            // 提示暂无数据
            return this.noDataText || this.t('el.select.noData');
          }
        }
        return null;
      },
      // 是否显示用户创建的自定义条目
      showNewOption() {
        let hasExistingOption = this.options.filter(option => !option.created)
          .some(option => option.currentLabel === this.query);
        return this.filterable && this.allowCreate && this.query !== '' && !hasExistingOption;
      },
      // 获取size值
      selectSize() {
        return this.size || this._elFormItemSize || (this.$ELEMENT || {}).size;
      },
      // 获取disabled值
      selectDisabled() {
        return this.disabled || (this.elForm || {}).disabled;
      },
      // 根据el-select有大小选择el-tags的size大小
      collapseTagSize() {
        return ['small', 'mini'].indexOf(this.selectSize) > -1
          ? 'mini'
          : 'small';
      }
    },

    components: {
      ElInput,
      ElSelectMenu,
      ElOption,
      ElTag,
      ElScrollbar
    },
    // 自定义指令
    directives: { Clickoutside },

    props: {
      // select input 的 name 属性
      name: String,
      id: String,
      value: {  
        required: true
      },
      autocomplete: {
        type: String,
        default: 'off'
      },
      /** @Deprecated in next major version */
      autoComplete: {
        type: String,
        validator(val) {
          process.env.NODE_ENV !== 'production' &&
            console.warn('[Element Warn][Select]\'auto-complete\' property will be deprecated in next major version. please use \'autocomplete\' instead.');
          return true;
        }
      },
      // 对于不可搜索的 Select，是否在输入框获得焦点后自动弹出选项菜单
      automaticDropdown: Boolean,
      size: String,
      disabled: Boolean,
      // 是否可以清空选项
      clearable: Boolean,
      filterable: Boolean,
      // 是否允许用户创建新条目，需配合 filterable 使用 
      allowCreate: Boolean,
      loading: Boolean,
      // Select 下拉框的类名
      popperClass: String,
      // 	是否为远程搜索
      remote: Boolean,
      // 加载时的文字
      loadingText: String,
      // 搜索条件无匹配时显示的文字
      noMatchText: String,
      // 选项为空时显示的文字
      noDataText: String,
      remoteMethod: Function,
      filterMethod: Function,
      // 是否多选
      multiple: Boolean,
      // 多选时用户最多可以选择的项目数
      multipleLimit: {
        type: Number,
        default: 0
      },
      // 占位符 
      placeholder: {
        type: String,
        default() {
          return t('el.select.placeholder');
        }
      },
      // 在输入框按下回车，选择第一个匹配项。需配合 filterable 或 remote 使用	
      defaultFirstOption: Boolean,
      // 多选且可搜索时，是否在选中一个选项后保留当前的搜索关键词
      reserveKeyword: Boolean,
      // 作为 value 唯一标识的键名，绑定值为对象类型时必填
      valueKey: {
        type: String,
        default: 'value'
      },
      // 多选时是否将选中值按文字的形式展示
      collapseTags: Boolean,
      // 是否将弹出框插入至 body 元素。
      popperAppendToBody: {
        type: Boolean,
        default: true
      }
    },

    data() {
      return {
        options: [],
        cachedOptions: [],
        createdLabel: null,
        createdSelected: false,
        selected: this.multiple ? [] : {},
        inputLength: 20,
        inputWidth: 0,
        initialInputHeight: 0,
        cachedPlaceHolder: '',
        optionsCount: 0,
        filteredOptionsCount: 0,
        // 下拉框是否隐藏
        visible: false,
        softFocus: false,
        selectedLabel: '',
        hoverIndex: -1,
        query: '',
        previousQuery: null,
        // 是否hover到input 输入框， 主要用来显示清空输入内容按钮
        inputHovering: false,
        // 输入框默认值
        currentPlaceholder: '',
        menuVisibleOnFocus: false,
        isOnComposition: false,
        isSilentBlur: false
      };
    },

    watch: {
      // disabled值改变时, restetInputHeight
      selectDisabled() {
        this.$nextTick(() => {
          this.resetInputHeight();
        });
      },
      // 默认值改变时, 更新cachedPlaceHolder, currentPlaceholder
      placeholder(val) {
        this.cachedPlaceHolder = this.currentPlaceholder = val;
      },
      // v-model的值改变时
      value(val, oldVal) {
        // 如果是多选
        if (this.multiple) {
          // resetInputHeight
          this.resetInputHeight();
          // val有值，或者在搜索时有query，清空输入框默认值
          if ((val && val.length > 0) || (this.$refs.input && this.query !== '')) {
            this.currentPlaceholder = '';
          } else {
            // 如果无值使用cachePlaceHolder
            this.currentPlaceholder = this.cachedPlaceHolder;
          }
          // 如果是可搜索的，且不保留搜索关键词时，query置空
          if (this.filterable && !this.reserveKeyword) {
            this.query = '';
            // 改变query值时调用handleQueryChange
            this.handleQueryChange(this.query);
          }
        }
        // 设置el-option选中值
        this.setSelected();
        if (this.filterable && !this.multiple) {
          this.inputLength = 20;
        }
        // 如果在form表单中使用，而且值不相同， el-form-item发送change事件
        if (!valueEquals(val, oldVal)) {
          this.dispatch('ElFormItem', 'el.form.change', val);
        }
      },
      // 下拉框显示隐匿时
      visible(val) {
        // 下拉框隐藏时
        if (!val) {
          // 广播 el-selectDropdown触发destroyPopper事件，销毁下拉框
          this.broadcast('ElSelectDropdown', 'destroyPopper');
          // 如果是可搜索的,移除焦点
          if (this.$refs.input) {
            this.$refs.input.blur();
          }
          // 查询参数为空
          this.query = '';
          this.previousQuery = null;
          // el-input v-model值为空
          this.selectedLabel = '';
          this.inputLength = 20;
          // 下拉框不聚焦
          this.menuVisibleOnFocus = false;
          // 重置hoverIndex
          this.resetHoverIndex();
          // resetHoverIndex使用了setTimeout，所以使用$nextTick`
          this.$nextTick(() => {
            if (this.$refs.input &&
              this.$refs.input.value === '' &&
              this.selected.length === 0) {
                // 可搜索并且value值为空， 无选中值时，输入框默认值为cachePlaceHolder
              this.currentPlaceholder = this.cachedPlaceHolder;
            }
          });
          // 如果不是多选
          if (!this.multiple) {
            //已有选中值
            if (this.selected) {
              // 允许搜索且用户创建新条目存在时
              if (this.filterable && this.allowCreate &&
                this.createdSelected && this.createdLabel) {
              // el-input的selectedLabel值为createdLabel
                this.selectedLabel = this.createdLabel;
              } else {
                // 选择当前选中的值
                this.selectedLabel = this.selected.currentLabel;
              }
              if (this.filterable) this.query = this.selectedLabel;
            }

            if (this.filterable) {
              // 搜索时的输入框为cachedPlaceHolder
              this.currentPlaceholder = this.cachedPlaceHolder;
            }
          }
          // 下拉框显示时
        } else {
          // 广播el-select-dropdown触发updatePopper事件
          this.broadcast('ElSelectDropdown', 'updatePopper');
          // 可搜索时
          if (this.filterable) {
            this.query = this.remote ? '' : this.selectedLabel;
            // 调用handleQueryChange
            this.handleQueryChange(this.query);
            if (this.multiple) {
              this.$refs.input.focus();
            } else {
              // 不是多选且不是远程时
              if (!this.remote) {
                // 调用queryChange搜索满足条件的el-option
                this.broadcast('ElOption', 'queryChange', '');
                this.broadcast('ElOptionGroup', 'queryChange');
              }

              if (this.selectedLabel) {
                // 将选中值置为默认值
                this.currentPlaceholder = this.selectedLabel;
                this.selectedLabel = '';
              }
            }
          }
        }
        // 触发visible-change事件
        this.$emit('visible-change', val);
      },
      // 每一个el-option创建时都会向optonspush组件实例
      // this.select.options.push(this)
      options() {
        if (this.$isServer) return;
        this.$nextTick(() => {
          // 当el-options更新时, el-select-dropdown也要更新定位位置
          this.broadcast('ElSelectDropdown', 'updatePopper');
        });
        // 如果是多选
        if (this.multiple) {
          // resetInputHeight()
          this.resetInputHeight();
        }
        let inputs = this.$el.querySelectorAll('input');
        if ([].indexOf.call(inputs, document.activeElement) === -1) {
          this.setSelected();
        }
        // 如果是多选或者远程并且选择第一个匹配项
        if (this.defaultFirstOption && (this.filterable || this.remote) && this.filteredOptionsCount) {
          this.checkDefaultFirstOption();
        }
      }
    },

    methods: {
      // 为中文输入时,设置isOncomposition标志位
      handleComposition(event) {
        const text = event.target.value;
        if (event.type === 'compositionend') {
          this.isOnComposition = false;
          this.$nextTick(_ => this.handleQueryChange(text));
        } else {
          const lastCharacter = text[text.length - 1] || '';
          this.isOnComposition = !isKorean(lastCharacter);
        }
      },
      // query参数改变时触发
      handleQueryChange(val) {
        // 与前一搜索值相同时或者没输入完成时，返回
        if (this.previousQuery === val || this.isOnComposition) return;
        if (
          this.previousQuery === null &&
          (typeof this.filterMethod === 'function' || typeof this.remoteMethod === 'function')
        ) {
          // 用户自定义了搜索方法和远程搜索方法时返回
          this.previousQuery = val;
          return;
        }
        this.previousQuery = val;
        // 触发下拉框更新
        this.$nextTick(() => {
          if (this.visible) this.broadcast('ElSelectDropdown', 'updatePopper');
        });
        // hoverIndex重置
        this.hoverIndex = -1;
        // 如果是多选而且可搜索
        if (this.multiple && this.filterable) {
          this.$nextTick(() => {
            // 设置ref="input"的长度
            const length = this.$refs.input.value.length * 15 + 20;
            this.inputLength = this.collapseTags ? Math.min(50, length) : length;
            this.managePlaceholder();
            // resetInputHeight
            this.resetInputHeight();
          });
        }
        if (this.remote && typeof this.remoteMethod === 'function') {
          // 远程方法存在时，取消选中
          this.hoverIndex = -1;
          this.remoteMethod(val);
        } else if (typeof this.filterMethod === 'function') {
          this.filterMethod(val);
          this.broadcast('ElOptionGroup', 'queryChange');
        } else {
          // 在el-option中搜索
          // 计算options个数
          this.filteredOptionsCount = this.optionsCount;
          /// el-option中不符合条件的filteredOptionsCount--
          this.broadcast('ElOption', 'queryChange', val);
          this.broadcast('ElOptionGroup', 'queryChange');
        }
        if (this.defaultFirstOption && (this.filterable || this.remote) && this.filteredOptionsCount) {
          // 选择第一个匹配项
          this.checkDefaultFirstOption();
        }
      },
      // 自动滚动到所指定的option
      scrollToOption(option) {
        const target = Array.isArray(option) && option[0] ? option[0].$el : option.$el;
        if (this.$refs.popper && target) {
          const menu = this.$refs.popper.$el.querySelector('.el-select-dropdown__wrap');
          scrollIntoView(menu, target);
        }
        this.$refs.scrollbar && this.$refs.scrollbar.handleScroll();
      },
       //  进入el-select-dropdown之前设定滚动到选中的el-option
      handleMenuEnter() {
        this.$nextTick(() => this.scrollToOption(this.selected));
      },
      // 发送值改变
      emitChange(val) {
        if (!valueEquals(this.value, val)) {
          this.$emit('change', val);
        }
      },

      getOption(value) {
        let option;
        const isObject = Object.prototype.toString.call(value).toLowerCase() === '[object object]';
        const isNull = Object.prototype.toString.call(value).toLowerCase() === '[object null]';
        const isUndefined = Object.prototype.toString.call(value).toLowerCase() === '[object undefined]';

        for (let i = this.cachedOptions.length - 1; i >= 0; i--) {
          const cachedOption = this.cachedOptions[i];
          const isEqual = isObject
            ? getValueByPath(cachedOption.value, this.valueKey) === getValueByPath(value, this.valueKey)
            : cachedOption.value === value;
          if (isEqual) {
            option = cachedOption;
            break;
          }
        }
        if (option) return option;
        const label = (!isObject && !isNull && !isUndefined)
          ? value : '';
        let newOption = {
          value: value,
          currentLabel: label
        };
        if (this.multiple) {
          newOption.hitState = false;
        }
        return newOption;
      },

      setSelected() {
        if (!this.multiple) {
          let option = this.getOption(this.value);
          if (option.created) {
            this.createdLabel = option.currentLabel;
            this.createdSelected = true;
          } else {
            this.createdSelected = false;
          }
          this.selectedLabel = option.currentLabel;
          this.selected = option;
          if (this.filterable) this.query = this.selectedLabel;
          return;
        }
        let result = [];
        if (Array.isArray(this.value)) {
          this.value.forEach(value => {
            result.push(this.getOption(value));
          });
        }
        this.selected = result;
        this.$nextTick(() => {
          this.resetInputHeight();
        });
      },

      handleFocus(event) {
        if (!this.softFocus) {
          if (this.automaticDropdown || this.filterable) {
            this.visible = true;
            if (this.filterable) {
              this.menuVisibleOnFocus = true;
            }
          }
          // 发送focus事件
          this.$emit('focus', event);
        } else {
          this.softFocus = false;
        }
      },

      blur() {
        this.visible = false;
        this.$refs.reference.blur();
      },

      handleBlur(event) {
        setTimeout(() => {
          if (this.isSilentBlur) {
            this.isSilentBlur = false;
          } else {
            this.$emit('blur', event);
          }
        }, 50);
        this.softFocus = false;
      },

      handleClearClick(event) {
        this.deleteSelected(event);
      },

      doDestroy() {
        this.$refs.popper && this.$refs.popper.doDestroy();
      },

      handleClose() {
        this.visible = false;
      },

      toggleLastOptionHitState(hit) {
        if (!Array.isArray(this.selected)) return;
        const option = this.selected[this.selected.length - 1];
        if (!option) return;

        if (hit === true || hit === false) {
          option.hitState = hit;
          return hit;
        }

        option.hitState = !option.hitState;
        return option.hitState;
      },

      deletePrevTag(e) {
        if (e.target.value.length <= 0 && !this.toggleLastOptionHitState()) {
          const value = this.value.slice();
          value.pop();
          this.$emit('input', value);
          this.emitChange(value);
        }
      },

      managePlaceholder() {
        if (this.currentPlaceholder !== '') {
          this.currentPlaceholder = this.$refs.input.value ? '' : this.cachedPlaceHolder;
        }
      },

      resetInputState(e) {
        if (e.keyCode !== 8) this.toggleLastOptionHitState(false);
        this.inputLength = this.$refs.input.value.length * 15 + 20;
        this.resetInputHeight();
      },
      // 
      resetInputHeight() {
        if (this.collapseTags && !this.filterable) return;
        this.$nextTick(() => {
          if (!this.$refs.reference) return;
          let inputChildNodes = this.$refs.reference.$el.childNodes;
          let input = [].filter.call(inputChildNodes, item => item.tagName === 'INPUT')[0];
          const tags = this.$refs.tags;
          const sizeInMap = this.initialInputHeight || 40;
          input.style.height = this.selected.length === 0
            ? sizeInMap + 'px'
            : Math.max(
              tags ? (tags.clientHeight + (tags.clientHeight > sizeInMap ? 6 : 0)) : 0,
              sizeInMap
            ) + 'px';
          if (this.visible && this.emptyText !== false) {
            this.broadcast('ElSelectDropdown', 'updatePopper');
          }
        });
      },

      resetHoverIndex() {
        setTimeout(() => {
          if (!this.multiple) {
            this.hoverIndex = this.options.indexOf(this.selected);
          } else {
            if (this.selected.length > 0) {
              this.hoverIndex = Math.min.apply(null, this.selected.map(item => this.options.indexOf(item)));
            } else {
              this.hoverIndex = -1;
            }
          }
        }, 300);
      },

      handleOptionSelect(option, byClick) {
        if (this.multiple) {
          const value = (this.value || []).slice();
          const optionIndex = this.getValueIndex(value, option.value);
          if (optionIndex > -1) {
            value.splice(optionIndex, 1);
          } else if (this.multipleLimit <= 0 || value.length < this.multipleLimit) {
            value.push(option.value);
          }
          this.$emit('input', value);
          this.emitChange(value);
          if (option.created) {
            this.query = '';
            this.handleQueryChange('');
            this.inputLength = 20;
          }
          if (this.filterable) this.$refs.input.focus();
        } else {
          this.$emit('input', option.value);
          this.emitChange(option.value);
          this.visible = false;
        }
        this.isSilentBlur = byClick;
        this.setSoftFocus();
        if (this.visible) return;
        this.$nextTick(() => {
          this.scrollToOption(option);
        });
      },

      setSoftFocus() {
        this.softFocus = true;
        const input = this.$refs.input || this.$refs.reference;
        if (input) {
          input.focus();
        }
      },

      getValueIndex(arr = [], value) {
        const isObject = Object.prototype.toString.call(value).toLowerCase() === '[object object]';
        if (!isObject) {
          return arr.indexOf(value);
        } else {
          const valueKey = this.valueKey;
          let index = -1;
          arr.some((item, i) => {
            if (getValueByPath(item, valueKey) === getValueByPath(value, valueKey)) {
              index = i;
              return true;
            }
            return false;
          });
          return index;
        }
      },
      // 显示下拉框
      toggleMenu() {
        if (!this.selectDisabled) {
          if (this.menuVisibleOnFocus) {
            this.menuVisibleOnFocus = false;
          } else {
            this.visible = !this.visible;
          }
          if (this.visible) {
            (this.$refs.input || this.$refs.reference).focus();
          }
        }
      },

      selectOption() {
        if (!this.visible) {
          this.toggleMenu();
        } else {
          if (this.options[this.hoverIndex]) {
            this.handleOptionSelect(this.options[this.hoverIndex]);
          }
        }
      },

      deleteSelected(event) {
        event.stopPropagation();
        const value = this.multiple ? [] : '';
        this.$emit('input', value);
        this.emitChange(value);
        this.visible = false;
        this.$emit('clear');
      },

      deleteTag(event, tag) {
        let index = this.selected.indexOf(tag);
        if (index > -1 && !this.selectDisabled) {
          const value = this.value.slice();
          value.splice(index, 1);
          this.$emit('input', value);
          this.emitChange(value);
          this.$emit('remove-tag', tag.value);
        }
        event.stopPropagation();
      },

      onInputChange() {
        if (this.filterable && this.query !== this.selectedLabel) {
          this.query = this.selectedLabel;
          this.handleQueryChange(this.query);
        }
      },

      onOptionDestroy(index) {
        if (index > -1) {
          this.optionsCount--;
          this.filteredOptionsCount--;
          this.options.splice(index, 1);
        }
      },

      resetInputWidth() {
        // 获取el-input 的宽度
        this.inputWidth = this.$refs.reference.$el.getBoundingClientRect().width;
      },

      handleResize() {
        this.resetInputWidth();
        if (this.multiple) this.resetInputHeight();
      },
      // 选择第一个匹配项
      checkDefaultFirstOption() {
        this.hoverIndex = -1;
        // highlight the created option
        let hasCreated = false;
        for (let i = this.options.length - 1; i >= 0; i--) {
          if (this.options[i].created) {
            hasCreated = true;
            this.hoverIndex = i;
            break;
          }
        }
        if (hasCreated) return;
        for (let i = 0; i !== this.options.length; ++i) {
          const option = this.options[i];
          if (this.query) {
            // highlight first options that passes the filter
            if (!option.disabled && !option.groupDisabled && option.visible) {
              this.hoverIndex = i;
              break;
            }
          } else {
            // highlight currently selected option
            if (option.itemSelected) {
              this.hoverIndex = i;
              break;
            }
          }
        }
      },

      getValueKey(item) {
        if (Object.prototype.toString.call(item.value).toLowerCase() !== '[object object]') {
          return item.value;
        } else {
          return getValueByPath(item.value, this.valueKey);
        }
      }
    },

    created() {
      this.cachedPlaceHolder = this.currentPlaceholder = this.placeholder;
      if (this.multiple && !Array.isArray(this.value)) {
        this.$emit('input', []);
      }
      if (!this.multiple && Array.isArray(this.value)) {
        this.$emit('input', '');
      }
      // 远程搜索时防抖
      this.debouncedOnInputChange = debounce(this.debounce, () => {
        this.onInputChange();
      });

      this.debouncedQueryChange = debounce(this.debounce, (e) => {
        this.handleQueryChange(e.target.value);
      });

      this.$on('handleOptionClick', this.handleOptionSelect);
      this.$on('setSelected', this.setSelected);
    },

    mounted() {
      if (this.multiple && Array.isArray(this.value) && this.value.length > 0) {
        this.currentPlaceholder = '';
      }
      addResizeListener(this.$el, this.handleResize);

      const reference = this.$refs.reference;
      if (reference && reference.$el) {
        const sizeMap = {
          medium: 36,
          small: 32,
          mini: 28
        };
        const input = reference.$el.querySelector('input');
        // el-input的高度
        this.initialInputHeight = input.getBoundingClientRect().height || sizeMap[this.selectSize];
      }
      if (this.remote && this.multiple) {
        this.resetInputHeight();
      }
      this.$nextTick(() => {
        if (reference && reference.$el) {
          this.inputWidth = reference.$el.getBoundingClientRect().width;
        }
      });
      this.setSelected();
    },

    beforeDestroy() {
      if (this.$el && this.handleResize) removeResizeListener(this.$el, this.handleResize);
    }
  };
</script>
