# 2.1 什么是DOM树？

到目前为止，我们编写的JavaScript代码都运行在一个“黑盒子”里，只能通过控制台看到结果。现在，我们要学习如何让JavaScript操作网页上的内容，而这一切都始于一个叫做**DOM**的概念。

## DOM：文档对象模型

**DOM** (Document Object Model，文档对象模型) 是浏览器为HTML文档创建的一个编程接口。

你可以把它想象成一棵“家族树”。浏览器会把你的HTML代码解析成一个树状结构：

- `<html>` 是根节点，是所有人的祖先。
- `<head>` 和 `<body>` 是 `<html>` 的子节点。
- `<body>` 里的 `<h1>` 和 `<p>` 又是 `<body>` 的子节点。

这个树状结构，就是DOM树。

![DOM Tree](https://mdn.mozillademos.org/files/11471/document-frame.svg)
*(图片来源: MDN Web Docs)*

## 为什么DOM很重要？

JavaScript无法直接读取或修改HTML文件本身。但是，**JavaScript可以读取和修改浏览器内存中的这个DOM树**。

当你用JavaScript对DOM树进行操作时（比如改变一个节点的文字、添加一个新节点），浏览器会立即更新页面，将这些变化实时反映给用户。

**简单来说：DOM就是JavaScript与HTML页面沟通的桥梁。**

---

本节是理论介绍，没有交互式代码。在下一节中，我们将学习如何使用JavaScript来真正地“抓住”DOM树上的这些节点。