# 1.2 变量与数据类型

如果说 `console.log` 是我们与程序沟通的方式，那么**变量（Variables）**就是程序用来存储和记忆信息的工具。

## 什么是变量？

你可以把变量想象成一个贴着标签的盒子。你可以把各种信息（数据）放进这个盒子里，然后通过标签（变量名）随时找到并使用它。

在JavaScript中，我们通常使用 `let` 关键字来声明一个变量。

```javascript
// 声明一个名为 message 的变量，并把字符串 "Hello" 存进去
let message = "Hello";

// 通过变量名来使用它
console.log(message); // 输出: Hello
```

## 基础数据类型

JavaScript可以处理多种类型的数据。最基础的三种是：

- **`string` (字符串)**: 用于表示文本，需要用引号（单引号 `'` 或双引号 `"`）包裹。例如: `"你好"`, `'JavaScript'`。
- **`number` (数字)**: 用于表示数字，包括整数和浮点数。例如: `100`, `3.14`。
- **`boolean` (布尔值)**: 只有两个值：`true` (真) 和 `false` (假)，通常用于逻辑判断。

---

下面的交互式代码块已经为你声明了几个不同类型的变量。请尝试：

1.  使用 `console.log()` 打印出每个变量的值。
2.  试着修改变量的值，看看输出会发生什么变化。
3.  试着声明一个你自己的新变量。

```javascript:interactive
let greeting = "你好，JavaScript！"; // 这是一个字符串
let userAge = 25; // 这是一个数字
let isLearning = true; // 这是一个布尔值

// 在这里使用 console.log() 来查看上面变量的值
console.log(greeting);
