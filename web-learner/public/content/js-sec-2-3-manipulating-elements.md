# 2.3 修改元素内容与样式

一旦你用JavaScript“抓取”到了一个DOM元素，你就可以像操控木偶一样，改变它的几乎所有方面。最常见的操作是修改它的内容和样式。

## 修改文本内容: `.textContent`

如果你只想改变一个元素内部的纯文本，最安全、最推荐的方式是使用 `.textContent` 属性。

```javascript
// 假设我们已经选取了 <h1 id="main-title">大家好</h1>
const title = document.getElementById('main-title');

// 读取当前的文本
console.log(title.textContent); // 输出: "大家好"

// 修改文本
title.textContent = "欢迎来到我的JavaScript课程！";
// 现在页面上的h1标题已经更新了
```

## 修改HTML内容: `.innerHTML`

有时候，你可能想在元素内部插入新的HTML标签，而不仅仅是文本。这时，你可以使用 `.innerHTML`。

**注意：** 使用 `.innerHTML` 时要特别小心！如果你插入的内容来自用户输入，可能会导致安全风险（XSS攻击）。但对于我们自己定义的、可信的HTML内容，它是非常方便的。

```javascript
// 假设我们选取了 <div id="container"></div>
const container = document.getElementById('container');

// 插入一个带链接的段落
container.innerHTML = '<p>请访问 <a href="#">我们的主页</a>。</p>';
```

## 修改样式: `.style`

每个DOM元素都有一个 `.style` 属性，它允许你直接修改元素的CSS样式。注意，这里使用的属性名是驼峰式命名（camelCase），而不是CSS中的短横线命名（kebab-case）。

- CSS: `background-color` -> JS: `backgroundColor`
- CSS: `font-size` -> JS: `fontSize`

```javascript
const title = document.getElementById('main-title');

// 修改样式
title.style.color = 'blue';
title.style.backgroundColor = '#f0f0f0'; // CSS值是字符串
title.style.fontSize = '24px';
```

---

下面的交互式示例将前面几节的知识结合了起来。它会：
1.  选取ID为 `message` 的元素。
2.  修改它的文本内容。
3.  修改它的颜色和边框样式。

请点击“运行”按钮，观察页面上文字的变化。

```html:interactive
<p id="message">这是一条原始信息。</p>
```

```javascript:interactive
// 1. 选取元素
const messageElement = document.getElementById('message');

// 2. 修改内容
messageElement.textContent = "内容已被JavaScript修改！";

// 3. 修改样式
messageElement.style.color = 'red';
messageElement.style.border = '2px solid green';
messageElement.style.padding = '10px';