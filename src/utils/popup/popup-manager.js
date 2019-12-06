//  此文件主要用来管理element用到的所有弹窗
import Vue from 'vue';
import { addClass, removeClass } from 'element-ui/src/utils/dom';

let hasModal = false;
let hasInitZIndex = false;
let zIndex;
// 创建一个div并绑定click事件
const getModal = function() {
  if (Vue.prototype.$isServer) return;
  let modalDom = PopupManager.modalDom;
  if (modalDom) {
    hasModal = true;
  } else {
    hasModal = false;
    modalDom = document.createElement('div');
    PopupManager.modalDom = modalDom;

    modalDom.addEventListener('touchmove', function(event) {
      event.preventDefault();
      event.stopPropagation();
    });

    modalDom.addEventListener('click', function() {
      PopupManager.doOnModalClick && PopupManager.doOnModalClick();
    });
  }

  return modalDom;
};

const instances = {};

const PopupManager = {
  // 是否开启 modal淡入淡出
  modalFade: true,
  // 获取弹窗组件
  getInstance: function(id) {
    return instances[id];
  },
  // 注册弹窗组件
  register: function(id, instance) {
    if (id && instance) {
      instances[id] = instance;
    }
  },
  // 注销弹窗组件
  deregister: function(id) {
    if (id) {
      instances[id] = null;
      delete instances[id];
    }
  },

  nextZIndex: function() {
    return PopupManager.zIndex++;
  },
  // 虚拟的modal蒙层数组,每一个弹窗组件对应一个虚拟的modal蒙层,
  // 实际上在页面中只存在一个modal蒙层,所有的弹窗组件共用一个蒙层即可,可以参考嵌套弹窗demo
  modalStack: [],
  // 当有多个弹窗组件时,只有最上面的弹窗组件层级关系是在modalDom上,所以此时点击modal,应该去执行最上层弹窗组件的回调方法
  doOnModalClick: function() {
    const topItem = PopupManager.modalStack[PopupManager.modalStack.length - 1];
    if (!topItem) return;

    const instance = PopupManager.getInstance(topItem.id);
    if (instance && instance.closeOnClickModal) {
      instance.close();
    }
  },
  // 弹窗组件调用过openModal方法后,PopupManager会将弹窗组件(id,zIndex)push进modalStack中进行管理
  // 弹窗窗组件调用PopupManager.closeModal方法后,PopupManager会将弹窗组件从modalStack中删除
  openModal: function(id, zIndex, dom, modalClass, modalFade) { 
    if (Vue.prototype.$isServer) return;
    if (!id || zIndex === undefined) return;
    this.modalFade = modalFade;

    const modalStack = this.modalStack;

    for (let i = 0, j = modalStack.length; i < j; i++) {
      const item = modalStack[i];
      if (item.id === id) {
        return;
      }
    }

    const modalDom = getModal();
    // 添加classname
    addClass(modalDom, 'v-modal');
    if (this.modalFade && !hasModal) {
      addClass(modalDom, 'v-modal-enter');
    }
    if (modalClass) {
      let classArr = modalClass.trim().split(/\s+/);
      classArr.forEach(item => addClass(modalDom, item));
    }
    setTimeout(() => {
      removeClass(modalDom, 'v-modal-enter');
    }, 200);
    // // 根据传入的dom元素,判断modalDom应该插入的节点
    if (dom && dom.parentNode && dom.parentNode.nodeType !== 11) {
      dom.parentNode.appendChild(modalDom);
    } else {
      document.body.appendChild(modalDom);
    }
    // 设置z-index
    if (zIndex) {
      modalDom.style.zIndex = zIndex;
    }
    modalDom.tabIndex = 0;
    modalDom.style.display = '';

    this.modalStack.push({ id: id, zIndex: zIndex, modalClass: modalClass });
  },

  closeModal: function(id) {
    const modalStack = this.modalStack;
    const modalDom = getModal();

    if (modalStack.length > 0) {
      const topItem = modalStack[modalStack.length - 1];
      if (topItem.id === id) {
        if (topItem.modalClass) {
          let classArr = topItem.modalClass.trim().split(/\s+/);
          classArr.forEach(item => removeClass(modalDom, item));
        }

        modalStack.pop();
        // 如果是最上层的弹窗组件,且下面还存在其他的弹窗组件,则重新设置modalDOm的zindex
        if (modalStack.length > 0) {
          modalDom.style.zIndex = modalStack[modalStack.length - 1].zIndex;
        }
      } else {
        for (let i = modalStack.length - 1; i >= 0; i--) {
          if (modalStack[i].id === id) {
            modalStack.splice(i, 1);
            break;
          }
        }
      }
    }
    // 如果没有其他弹窗组件了,则隐藏modalDom
    if (modalStack.length === 0) {
      if (this.modalFade) {
        addClass(modalDom, 'v-modal-leave');
      }
      setTimeout(() => {
        if (modalStack.length === 0) {
          if (modalDom.parentNode) modalDom.parentNode.removeChild(modalDom);
          modalDom.style.display = 'none';
          PopupManager.modalDom = undefined;
        }
        removeClass(modalDom, 'v-modal-leave');
      }, 200);
    }
  }
};

Object.defineProperty(PopupManager, 'zIndex', {
  configurable: true,
  get() {
    if (!hasInitZIndex) {
      zIndex = zIndex || (Vue.prototype.$ELEMENT || {}).zIndex || 2000;
      hasInitZIndex = true;
    }
    return zIndex;
  },
  set(value) {
    zIndex = value;
  }
});

const getTopPopup = function() {
  if (Vue.prototype.$isServer) return;
  if (PopupManager.modalStack.length > 0) {
    const topPopup = PopupManager.modalStack[PopupManager.modalStack.length - 1];
    if (!topPopup) return;
    const instance = PopupManager.getInstance(topPopup.id);

    return instance;
  }
};

if (!Vue.prototype.$isServer) {
  // handle `esc` key when the popup is shown
  window.addEventListener('keydown', function(event) {
    if (event.keyCode === 27) {
      const topPopup = getTopPopup();

      if (topPopup && topPopup.closeOnPressEscape) {
        topPopup.handleClose
          ? topPopup.handleClose()
          : (topPopup.handleAction ? topPopup.handleAction('cancel') : topPopup.close());
      }
    }
  });
}

export default PopupManager;
