# 2.2 选取页面元素

知道了DOM是一棵树，我们接下来的任务就是学习如何从这棵树上精确地找到我们想要的那个节点（也就是HTML元素）。JavaScript提供了多种方法来“抓取”这些元素。

`document` 对象代表了整个HTML文档，它是我们所有查询的起点。

## 1. 通过 ID 选取 (最精确)

如果一个HTML元素拥有一个独一无二的 `id` 属性，这是找到它的最快、最可靠的方法。

**方法**: `document.getElementById('元素的id')`

```html
<!-- 假设这是你的HTML -->
<h1 id="main-title">我的学习主页</h1>
```

```javascript
// 在JavaScript中这样选取它
const titleElement = document.getElementById('main-title');

// titleElement 现在就代表了那个<h1>元素
console.log(titleElement);
```

## 2. 通过 CSS 选择器选取 (最灵活)

现代JavaScript中最强大、最灵活的方式是使用CSS选择器。如果你了解CSS，那么你已经知道如何使用它了。

### 选取单个元素

**方法**: `document.querySelector('CSS选择器')`

这个方法会返回它找到的**第一个**匹配的元素。

```html
<!-- 假设这是你的HTML -->
<div class="content">
  <p>这是一个段落。</p>
  <p class="special">这是另一个特别的段落。</p>
</div>
```

```javascript
// 选取第一个 <p> 元素
const firstParagraph = document.querySelector('p');

// 通过类名选取
const specialParagraph = document.querySelector('.special');

console.log(specialParagraph);
```

### 选取多个元素

**方法**: `document.querySelectorAll('CSS选择器')`

这个方法会返回一个包含**所有**匹配元素的列表（NodeList）。

```javascript
// 选取所有的 <p> 元素
const allParagraphs = document.querySelectorAll('p');

// allParagraphs 是一个列表，包含了两个<p>元素
console.log(allParagraphs.length); // 输出: 2

// 我们通常需要用循环来处理列表中的每一个元素
allParagraphs.forEach(p => {
  console.log(p);
});
```

---

在本节中，我们学习了如何“找到”元素。在下一节，我们将学习找到它们之后，如何去修改它们的内容和样式。