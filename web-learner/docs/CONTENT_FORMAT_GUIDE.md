# 课程内容文件格式指南

本文档定义了 `public/content/` 目录下课程内容 `.md` 文件的编写规范。

## 1. 文件与知识点的对应关系

- 每一个 `.md` 文件代表一个独立的知识点（Section）。
- 文件的名称（不含`.md`后缀）必须与该知识点的 `id` 完全对应。
  - 例如：知识点 `js-sec-1-1-hello-world` 的内容应存储在 `public/content/js-sec-1-1-hello-world.md` 文件中。

## 2. 内容块的定义

系统会将整个 `.md` 文件解析成一个由【Markdown内容块】和【交互式代码块】组成的序列。

### 2.1 Markdown 内容块 (`MarkdownBlock`)

所有标准的 Markdown 文本，包括标题、段落、列表、图片以及**不带特殊标记的普通代码块**，都会被视为 Markdown 内容。解析器会将连续的 Markdown 内容合并成一个 `MarkdownBlock`。

**示例：**
```markdown
# 这是一个标题

这是一段说明文字。

下面是一个静态的代码示例，用于展示语法，但不能运行：

```javascript
function sayHello(name) {
  return `Hello, ${name}!`;
}
```

以上所有内容，包括标题、文字和上面的静态代码块，都属于同一个 `MarkdownBlock`。
```

### 2.2 交互式代码块 (`InteractiveCodeBlock`)

为了定义一个可交互、可运行的代码块，我们需要使用标准的 Markdown 围栏代码块语法，并在语言标识符后面紧跟一个特殊的标记：**:interactive**。

**格式：**
````
```javascript:interactive
// 在这里编写可运行的代码
```
````

**示例：**
```markdown
现在，让我们来尝试一个真正的交互式例子。你可以修改下面的代码，然后点击“运行”按钮查看效果。

```javascript:interactive
// 修改引号内的文字，然后点击运行
console.log("你好，交互式编程！");
```

上面这个带有 `:interactive` 标记的代码块，将被解析成一个独立的 `InteractiveCodeBlock`。
```

## 3. 总结

- **默认是静态**：所有内容默认都是静态 Markdown。
- **显式声明交互**：只有当你需要用户能够运行代码时，才使用 `language:interactive` 标记。

这种方式让我们能够用最少的特殊语法，清晰地定义出课程内容的结构。