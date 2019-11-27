<template>
<!-- 外层包裹label标签可扩大用户点击input切换的范围 -->
<!-- 第一个span里包裹一个span和input,sapn用来替换原生的radio样式,input在实际使用中会透明化，用来触发事件 -->


<!-- role :aria-checked :aria-disabled 为不方便的人士提供的功能 -->
<!-- tabindex规定了按下tab键该元素获取焦点的顺序 -->
<!-- @keydown.space.stop用于空格切换radio -->
  <label
    class="el-radio"
    :class="[
      border && radioSize ? 'el-radio--' + radioSize : '',
      { 'is-disabled': isDisabled },
      { 'is-focus': focus },
      { 'is-bordered': border },
      { 'is-checked': model === label }
    ]"
    role="radio"
    :aria-checked="model === label"
    :aria-disabled="isDisabled"
    :tabindex="tabIndex"
    @keydown.space.stop.prevent="model = isDisabled ? model : label"
  >
    <span class="el-radio__input"
      :class="{
        'is-disabled': isDisabled,
        'is-checked': model === label
      }"
    >
      <span class="el-radio__inner"></span>
      <input
        ref="radio"
        class="el-radio__original"
        :value="label"
        type="radio"
        aria-hidden="true"
        v-model="model"
        @focus="focus = true"
        @blur="focus = false"
        @change="handleChange"
        :name="name"
        :disabled="isDisabled"
        tabindex="-1"
      >
    </span>
    <span class="el-radio__label" @keydown.stop>
      <slot></slot>
      <template v-if="!$slots.default">{{label}}</template>
    </span>
  </label>
</template>
<script>
  import Emitter from 'element-ui/src/mixins/emitter';

  export default {
    name: 'ElRadio',

    mixins: [Emitter],
    //依赖注入
    inject: {
      elForm: {
        default: ''
      },

      elFormItem: {
        default: ''
      }
    },

    componentName: 'ElRadio',

    props: {
      value: {},
      label: {},
      disabled: Boolean,
      name: String,
      border: Boolean,
      size: String
    },

    data() {
      return {
        focus: false
      };
    },
    computed: {
      //  判断组件是否是在el-radio-group中
      isGroup() {
        let parent = this.$parent;
        while (parent) {
          if (parent.$options.componentName !== 'ElRadioGroup') {
            parent = parent.$parent;
          } else {
            this._radioGroup = parent;
            return true;
          }
        }
        return false;
      },
      // model为当前选中的值， label为选择当前组件所代表的值
      model: {
        // get方法中判断是否在el-radio-group中,是就调用el-radion-group的value
        get() {
          return this.isGroup ? this._radioGroup.value : this.value;
        },
        set(val) {
          // 在el-radio-grou中,就向最近的el-radio-group父级组件发送事件, dispatch来源于Emitter混合组件
          if (this.isGroup) {
            this.dispatch('ElRadioGroup', 'input', [val]);
          } else {
            this.$emit('input', val);
          }
          // 设置input选中状态
          this.$refs.radio && (this.$refs.radio.checked = this.model === this.label);
        }
      },
      _elFormItemSize() {
        return (this.elFormItem || {}).elFormItemSize;
      },
      radioSize() {
        // this.$ElEMENT为全局设置的size
        //  this._elFormItemSize 为在form表单中使用时， form表单定义的size
        const temRadioSize = this.size || this._elFormItemSize || (this.$ELEMENT || {}).size;
        // 如果在el-radio-group中 如果el-radio-group设置size使用
        return this.isGroup
          ? this._radioGroup.radioGroupSize || temRadioSize
          : temRadioSize;
      },
      isDisabled() {
        // 与size的获取类似,从el-radio-group和form表单中获取，然后再从本组件获取
        return this.isGroup
          ? this._radioGroup.disabled || this.disabled || (this.elForm || {}).disabled
          : this.disabled || (this.elForm || {}).disabled;
      },
      tabIndex() {
        // tabtab键该元素获取焦点的顺序. 禁用时或者在el-radio-group中使用且未选中时为-1，
        // 这里的逻辑就是tab只能访问到选中状态下的单选按钮
        return (this.isDisabled || (this.isGroup && this.model !== this.label)) ? -1 : 0;
      }
    },

    methods: {
      // 当选中状态发生改变时,发送事件
      // 使用$nextTick方法等待model中set完model并更新完DOM后再派发事件
      handleChange() {
        this.$nextTick(() => {
          this.$emit('change', this.model);
          this.isGroup && this.dispatch('ElRadioGroup', 'handleChange', this.model);
        });
      }
    }
  };
</script>
