# 2.4 创建与插入新元素

动态地向页面添加新内容是JavaScript最强大的功能之一。我们可以完全通过代码来创建新的HTML元素，并把它们放置到DOM树的任何位置。

这个过程通常分为两步：
1.  **创建**一个新的元素节点。
2.  将这个新节点**插入**到DOM树中。

## 1. 创建元素: `document.createElement()`

这个方法就像一个元素工厂，你告诉它想要什么标签，它就为你创建一个对应的空白元素。

```javascript
// 创建一个新的 <p> 元素
const newParagraph = document.createElement('p');

// 创建一个新的 <div> 元素
const newDiv = document.createElement('div');
```

刚创建出来的元素存在于内存中，页面上还看不到它。我们可以像操作普通元素一样，先设置好它的内容和样式。

```javascript
newParagraph.textContent = "这是动态创建的段落。";
newParagraph.style.color = "purple";
```

## 2. 插入元素: `.appendChild()`

创建并设置好新元素后，我们需要把它“挂”到DOM树上。最常用的方法是 `.appendChild()`，它会将新元素作为**最后一个子元素**添加到指定的父元素中。

```javascript
// 假设我们已经选取了 <div id="container"></div>
const container = document.getElementById('container');

// 将我们刚创建的段落添加到 container 中
container.appendChild(newParagraph);
// 现在，页面上就能看到这个新的紫色段落了！
```

---

下面的交互式示例演示了完整的流程。

点击“运行”按钮，代码会：
1.  找到ID为 `list-container` 的 `<div>`。
2.  创建一个新的 `<li>` 元素。
3.  设置新 `<li>` 的文本内容。
4.  将它添加到页面上的 `<ul>` 列表中。

你可以试着修改代码，添加更多不同的列表项。

```html:interactive
<div id="list-container">
  <ul id="item-list">
    <li>第一项</li>
    <li>第二项</li>
  </ul>
</div>
```

```javascript:interactive
// 1. 选取父元素
const list = document.getElementById('item-list');

// 2. 创建新元素
const newItem = document.createElement('li');

// 3. 设置新元素的内容
newItem.textContent = "我是新来的第三项！";

// 4. 将新元素插入到父元素中
list.appendChild(newItem);