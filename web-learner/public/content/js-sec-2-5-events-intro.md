# 2.5 事件监听与处理

静态的页面是无趣的。网页的生命力来源于它能响应用户的各种操作，比如点击、悬停、输入等等。在JavaScript中，这些用户的操作被称为**事件（Events）**。

我们可以编写代码来“监听”这些事件，并在事件发生时执行特定的任务。

## 事件处理流程

事件处理通常遵循“三步走”的模式：

1.  **选取目标元素**：首先，确定你希望用户与哪个元素进行交互。
2.  **添加事件监听器**：使用 `.addEventListener()` 方法告诉浏览器：“请帮我留意这个元素上发生的某种特定事件。”
3.  **定义处理函数**：提供一个函数，这个函数里的代码会在事件发生时被执行。

## `.addEventListener()`

这是现代JavaScript中处理事件的标准方法。它接受两个主要参数：

1.  **事件类型（字符串）**：你想要监听的事件名称，比如 `'click'`（点击）、`'mouseover'`（鼠标悬停）。
2.  **处理函数（函数）**：当事件发生时要执行的函数。

```javascript
// 1. 选取目标元素 (一个按钮)
const myButton = document.getElementById('my-btn');

// 3. 定义处理函数
function handleClick() {
  console.log("按钮被点击了！");
  alert("你点我了！");
}

// 2. 添加事件监听器
myButton.addEventListener('click', handleClick);
```

现在，每当用户点击那个按钮，`handleClick` 函数就会被自动调用。

---

下面的交互式示例为你准备好了一个按钮。

请点击“运行”以激活事件监听，然后试着点击页面上的“点我”按钮，看看会发生什么。

```html:interactive
<button id="action-button">点我!</button>
<p id="status-text">等待操作...</p>
```

```javascript:interactive
// 1. 选取目标元素
const btn = document.getElementById('action-button');
const statusText = document.getElementById('status-text');

// 3. 定义处理函数
function onButtonClick() {
  // 当按钮被点击时，修改p标签的文字
  statusText.textContent = "按钮在 " + new Date().toLocaleTimeString() + " 被点击了！";
  statusText.style.color = 'green';
}

// 2. 添加事件监听器
btn.addEventListener('click', onButtonClick);