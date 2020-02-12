<template>
<!-- @click为向上冒泡结果 -->
<!-- switchDisabled为组件是否禁用 -->
<!-- checked 状态是否为激活状态-->
  <div
    class="el-switch"
    :class="{ 'is-disabled': switchDisabled, 'is-checked': checked }"
    role="switch"
    :aria-checked="checked"
    :aria-disabled="switchDisabled"
    @click.prevent="switchValue"
  >
    <input
      class="el-switch__input"
      type="checkbox"
      @change="handleChange"
      ref="input"
      :id="id"
      :name="name"
      :true-value="activeValue"
      :false-value="inactiveValue"
      :disabled="switchDisabled"
      @keydown.enter="switchValue"
    >
    <span
      :class="['el-switch__label', 'el-switch__label--left', !checked ? 'is-active' : '']"
      v-if="inactiveIconClass || inactiveText">
      <!-- inactiveIconClass存在时绑定类 -->
      <!-- inactiveIconClass和inactiveText互斥 -->
      <i :class="[inactiveIconClass]" v-if="inactiveIconClass"></i>
      <span v-if="!inactiveIconClass && inactiveText" :aria-hidden="checked">{{ inactiveText }}</span>
    </span>
    <!-- 组件实际显示样式 -->
    <!-- coreWidth为宽度 -->
    <span class="el-switch__core" ref="core" :style="{ 'width': coreWidth + 'px' }">
    </span>
    <!-- 右侧样式 -->
    <span
      :class="['el-switch__label', 'el-switch__label--right', checked ? 'is-active' : '']"
      v-if="activeIconClass || activeText">
      <!-- activeIconClass和activeText互斥 -->
      <i :class="[activeIconClass]" v-if="activeIconClass"></i>
      <span v-if="!activeIconClass && activeText" :aria-hidden="!checked">{{ activeText }}</span>
    </span>
  </div>
</template>
<script>
  import emitter from 'element-ui/src/mixins/emitter';
  // 用于组件聚焦
  import Focus from 'element-ui/src/mixins/focus';
  // 对过期的props值进行提醒
  import Migrating from 'element-ui/src/mixins/migrating';

  export default {
    name: 'ElSwitch',
    mixins: [Focus('input'), Migrating, emitter],
    inject: {
      elForm: {
        default: ''
      }
    },
    props: {
      // 绑定值
      value: {
        type: [Boolean, String, Number],
        default: false
      },
      // 是否禁用
      disabled: {
        type: Boolean,
        default: false
      },
      // el-switch宽度
      width: {
        type: Number,
        default: 40
      },
      // 打开时显示图标类名
      activeIconClass: {
        type: String,
        default: ''
      },
      // 关闭时显示图标类名
      inactiveIconClass: {
        type: String,
        default: ''
      },
      // 打开时文字描述
      activeText: String,
      // 关闭时文字描述
      inactiveText: String,
      // 打开时背景色
      activeColor: {
        type: String,
        default: ''
      },
      // 关闭时背景色
      inactiveColor: {
        type: String,
        default: ''
      },
      // 打开时的值
      activeValue: {
        type: [Boolean, String, Number],
        default: true
      },
      // 关闭时的值
      inactiveValue: {
        type: [Boolean, String, Number],
        default: false
      },
      // 对应的name属性值
      name: {
        type: String,
        default: ''
      },
      // 改变switch状态时是否触发表单的校验
      validateEvent: {
        type: Boolean,
        default: true
      },
      id: String
    },
    data() {
      return {
        coreWidth: this.width
      };
    },
    created() {
      if (!~[this.activeValue, this.inactiveValue].indexOf(this.value)) {
        this.$emit('input', this.inactiveValue);
      }
    },
    computed: {
      // 是否是打开状态
      checked() {
        return this.value === this.activeValue;
      },
      // 是否是禁用状态，如组件未设置，需要遍历到el-form
      switchDisabled() {
        return this.disabled || (this.elForm || {}).disabled;
      }
    },
    watch: {
      checked() {
        // 当打开状态改变时，input状态改变
        this.$refs.input.checked = this.checked;
        // 打开或关闭，背景色存在时，需要改变背景色
        if (this.activeColor || this.inactiveColor) {
          this.setBackgroundColor();
        }
        // 如果validateEvent为true时，触发表单校验
        if (this.validateEvent) {
          this.dispatch('ElFormItem', 'el.form.change', [this.value]);
        }
      }
    },
    methods: {
      // el-switch改变时触发
      handleChange(event) {
        // 根据checked值判断val值
        const val = this.checked ? this.inactiveValue : this.activeValue;
        // 同步更新value值
        this.$emit('input', val);
        // 发送change事件
        this.$emit('change', val);
        this.$nextTick(() => {
          // 更新input的check值
          // set input's checked property
          // in case parent refuses to change component's value
          this.$refs.input.checked = this.checked;
        });
      },
      // 如有设置时，设置背景色
      setBackgroundColor() {
        // 根据checked值选择背景色
        let newColor = this.checked ? this.activeColor : this.inactiveColor;
        this.$refs.core.style.borderColor = newColor;
        this.$refs.core.style.backgroundColor = newColor;
      },
      switchValue() {
        // 不是禁用状态时， 调用handleChange
        !this.switchDisabled && this.handleChange();
      },
      // 对过期的props值进行提示，具体实现在混合组件Migrating中
      getMigratingConfig() {
        return {
          props: {
            'on-color': 'on-color is renamed to active-color.',
            'off-color': 'off-color is renamed to inactive-color.',
            'on-text': 'on-text is renamed to active-text.',
            'off-text': 'off-text is renamed to inactive-text.',
            'on-value': 'on-value is renamed to active-value.',
            'off-value': 'off-value is renamed to inactive-value.',
            'on-icon-class': 'on-icon-class is renamed to active-icon-class.',
            'off-icon-class': 'off-icon-class is renamed to inactive-icon-class.'
          }
        };
      }
    },
    mounted() {
      /* istanbul ignore if */
      // 设置el-switch的宽度
      this.coreWidth = this.width || 40;
      // 设置背景色
      if (this.activeColor || this.inactiveColor) {
        this.setBackgroundColor();
      }
      // 设置input的cheked值
      this.$refs.input.checked = this.checked;
    }
  };
</script>
