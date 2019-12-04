let hiddenTextarea;
// hidden_style
const HIDDEN_STYLE = `
  height:0 !important;
  visibility:hidden !important;
  overflow:hidden !important;
  position:absolute !important;
  z-index:-1000 !important;
  top:0 !important;
  right:0 !important
`;
// context_style
const CONTEXT_STYLE = [
  'letter-spacing',
  'line-height',
  'padding-top',
  'padding-bottom',
  'font-family',
  'font-weight',
  'font-size',
  'text-rendering',
  'text-transform',
  'width',
  'text-indent',
  'padding-left',
  'padding-right',
  'border-width',
  'box-sizing'
];

// 对目标元素的样式进行处理分割并返回
function calculateNodeStyling(targetElement) {
  // Window.getComputedStyle()方法返回一个对象，
  // 该对象在应用活动样式表并解析这些值可能包含的任何基本计算后报告元素的所有CSS属性的值
  const style = window.getComputedStyle(targetElement);

  const boxSizing = style.getPropertyValue('box-sizing');
  // parseFloat() 函数可解析一个字符串，并返回一个浮点数

  // paddingSize 获取padding-bottom 和padding-top的总高度
  const paddingSize = (
    parseFloat(style.getPropertyValue('padding-bottom')) +
    parseFloat(style.getPropertyValue('padding-top'))
  );
  // 获取顶部和底部边框宽度
  const borderSize = (
    parseFloat(style.getPropertyValue('border-bottom-width')) +
    parseFloat(style.getPropertyValue('border-top-width'))
  );

  const contextStyle = CONTEXT_STYLE
    .map(name => `${name}:${style.getPropertyValue(name)}`)
    .join(';');

  return { contextStyle, paddingSize, borderSize, boxSizing };
}
// 传入元素, 最小和最大行
export default function calcTextareaHeight(
  targetElement,
  minRows = 1,
  maxRows = null
) {
  // 如果不存在hiddenTextarea则创建
  if (!hiddenTextarea) {
    hiddenTextarea = document.createElement('textarea');
    document.body.appendChild(hiddenTextarea);
  }

  let {
    paddingSize,
    borderSize,
    boxSizing,
    contextStyle
  } = calculateNodeStyling(targetElement);

  hiddenTextarea.setAttribute('style', `${contextStyle};${HIDDEN_STYLE}`);
  hiddenTextarea.value = targetElement.value || targetElement.placeholder || '';
  // scrollHeight 的值等于该元素在不使用滚动条的情况下为了适应视口中所用内容所需的最小高度
  // 包括元素的padding，但不包括元素的border和margin
  let height = hiddenTextarea.scrollHeight;
  const result = {};

  // border-box和content-box要返回的height值应该不同
  // border-box的height值应包括border和padding
  // content-box的height只有内容区的值
  if (boxSizing === 'border-box') {
    height = height + borderSize;
    // 此时height值为 内容区高度+ paddingSize +borderSize
  } else if (boxSizing === 'content-box') {
    height = height - paddingSize;
    // 此时height值为 内容区高度 + paddingSize -paddingSize
  }

  // hiddenTextarea的值为空时,获取当前hiddenTextarea的高度值
  hiddenTextarea.value = '';
  // scrollHeight包括元素的padding,singleRowHeight获取的是内容区高度值
  let singleRowHeight = hiddenTextarea.scrollHeight - paddingSize;

  if (minRows !== null) {
    // 获取设定的最小行数的内容区高度值
    let minHeight = singleRowHeight * minRows;
    // 为border-box时 height值为内容区 + boreder + padding
    if (boxSizing === 'border-box') {
      minHeight = minHeight + paddingSize + borderSize;
    }
    // heiht取最大值
    height = Math.max(minHeight, height);
    // result返回minHeight值
    result.minHeight = `${ minHeight }px`;
  }
  if (maxRows !== null) {
    let maxHeight = singleRowHeight * maxRows;
    if (boxSizing === 'border-box') {
      maxHeight = maxHeight + paddingSize + borderSize;
    }
    // height取最小值
    height = Math.min(maxHeight, height);
  }
  result.height = `${ height }px`;
  // 移除hiddenTextarea
  hiddenTextarea.parentNode && hiddenTextarea.parentNode.removeChild(hiddenTextarea);
  hiddenTextarea = null;
  // 返回result值
  return result;
};
