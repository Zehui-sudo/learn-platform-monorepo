# 1.6 函数初探

我们已经学习了变量、条件和循环，这些是编程的基石。现在，我们将学习一个极其重要的概念：**函数（Functions）**。函数是用来封装可重用代码块的工具。

## 什么是函数？

想象一下，你有一个经常需要执行的任务，比如“向某人问好”。每次都重写同样的代码会很繁琐。函数允许你将这个任务的指令打包，并给它一个名字。之后，你只需要“调用”这个名字，就可以执行整个任务。

## 定义与调用函数

定义一个函数的基本语法如下：

```javascript
// 使用 function 关键字定义一个名为 greet 的函数
// name 是一个“参数”，就像一个占位符，等待被填充
function greet(name) {
  console.log("你好, " + name + "!");
}

// 调用函数，并传入具体的“参数值”
greet("Alice"); // 输出: 你好, Alice!
greet("Bob");   // 输出: 你好, Bob!
```

## 函数的返回值

函数不仅可以执行操作，还可以计算一个结果并“返回”它。我们使用 `return` 关键字来实现。

```javascript
function add(a, b) {
  return a + b; // 计算 a + b 的结果并返回
}

let sum = add(5, 3); // 调用函数，并将返回值存入 sum 变量
console.log(sum); // 输出: 8
```

---

现在，你来亲手编写一个函数。

在下面的交互式代码块中：
1.  有一个名为 `calculateArea` 的函数，它接受 `width` 和 `height` 两个参数。
2.  请在函数内部完成计算矩形面积的代码，并使用 `return` 关键字返回结果。
3.  调用这个函数，并用 `console.log` 打印出计算得到的面积。

```javascript:interactive
function calculateArea(width, height) {
  // TODO: 在这里计算面积 (width * height) 并返回结果
  let area = width * height;
  return area;
}

// TODO: 调用 calculateArea 函数，传入你想要的宽度和高度
let result = calculateArea(10, 5);

// TODO: 打印出结果
console.log("矩形的面积是: " + result);