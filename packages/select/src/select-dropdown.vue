<template>
  <div
    class="el-select-dropdown el-popper"
    :class="[{ 'is-multiple': $parent.multiple }, popperClass]"
    :style="{ minWidth: minWidth }">
    <slot></slot>
  </div>
</template>

<script type="text/babel">
  import Popper from 'element-ui/src/utils/vue-popper';

  export default {
    name: 'ElSelectDropdown',

    componentName: 'ElSelectDropdown',

    mixins: [Popper],

    props: {
      // 默认位置
      placement: {
        default: 'bottom-start'
      },

      boundariesPadding: {
        default: 0
      },

      popperOptions: {
        default() {
          return {
            gpuAcceleration: false
          };
        }
      },

      visibleArrow: {
        default: true
      },

      appendToBody: {
        type: Boolean,
        default: true
      }
    },

    data() {
      return {
        minWidth: ''
      };
    },

    computed: {
      popperClass() {
        return this.$parent.popperClass;
      }
    },

    watch: {
      '$parent.inputWidth'() {
        this.minWidth = this.$parent.$el.getBoundingClientRect().width + 'px';
      }
    },

    mounted() {
      // referenceElm为el-select中的el-input组件元素
      this.referenceElm = this.$parent.$refs.reference.$el;
      this.$parent.popperElm = this.popperElm = this.$el;
      // 在当前组件上绑定事件
      // <select-dropdown :destroyPopper ="destroyPopper"></select-dropdown>
      this.$on('updatePopper', () => {
        if (this.$parent.visible) this.updatePopper();
      });
      this.$on('destroyPopper', this.destroyPopper);
    }
  };
</script>
