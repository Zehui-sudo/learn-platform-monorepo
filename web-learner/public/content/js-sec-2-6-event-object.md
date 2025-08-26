# 2.6 理解事件对象

当我们使用 `.addEventListener()` 监听一个事件时，浏览器在调用我们的处理函数时，会自动向该函数传入一个非常重要的参数——**事件对象（Event Object）**。

这个对象里包含了关于刚刚发生的事件的所有详细信息。

## 什么是事件对象？

事件对象通常在函数参数中被命名为 `event`、`evt` 或 `e`。它就像一份“事件报告”，记录了：

-   事件的类型（如 `'click'`）。
-   事件的目标元素（用户实际点击的那个元素）。
-   鼠标点击的坐标位置。
-   键盘按下的具体是哪个键。
-   ...等等

## `event.target`：事件的源头

事件对象中最有用的属性之一就是 `event.target`。它指向**触发事件的那个具体元素**。

这在处理多个子元素共享同一个父级事件监听器时特别有用（这个高级技巧被称为“事件委托”）。

```javascript
const container = document.getElementById('container');

function handleContainerClick(event) {
  // event.target 就是你实际点击的那个元素
  // 可能是 h1, 也可能是 p
  console.log("你点击了: ", event.target.tagName);
}

container.addEventListener('click', handleContainerClick);
```

## `event.preventDefault()`：阻止默认行为

有些HTML元素有自己的默认行为。比如：
-   `<a>` 标签被点击时，会跳转到新的URL。
-   `<form>` 表单里的提交按钮被点击时，会刷新页面并提交表单。

有时候，我们希望阻止这些默认行为，只执行我们自己的JavaScript代码。这时，`event.preventDefault()` 就派上用场了。

```javascript
const link = document.getElementById('my-link');

link.addEventListener('click', function(event) {
  // 阻止链接的默认跳转行为
  event.preventDefault();
  
  // 执行我们自己的逻辑
  alert("链接跳转被我阻止了！");
});
```

---

下面的交互式示例中，有一个链接。我们给它添加了事件监听，并使用 `event.preventDefault()` 来阻止它跳转。

```html:interactive
<a id="test-link" href="https://www.example.com">试着点我跳转</a>
<p id="link-status"></p>
```

```javascript:interactive
const testLink = document.getElementById('test-link');
const status = document.getElementById('link-status');

testLink.addEventListener('click', function(e) {
  // 阻止默认行为
  e.preventDefault();
  
  // 更新状态文本
  status.textContent = "链接的默认跳转行为已被阻止！";
  status.style.color = 'orange';
});