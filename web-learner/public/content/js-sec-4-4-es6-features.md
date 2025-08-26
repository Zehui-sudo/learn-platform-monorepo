# 4.4 ES6常用新特性

ES6 (ECMAScript 2015) 是JavaScript语言的一次重大更新，它引入了许多让开发者爱不释手的新特性。除了我们已经学过的 `class` 和 `Promise`，还有一些语法糖能极大地提升我们的编码效率和代码可读性。

## 1. `let` 和 `const`

在ES6之前，我们只有 `var` 来声明变量。`var` 存在一些问题（比如变量提升、没有块级作用域）。ES6引入了 `let` 和 `const` 来解决这些问题。
-   **`let`**: 用于声明一个可以被重新赋值的变量。
-   **`const`**: 用于声明一个常量，声明后其值不能被重新赋值。

**最佳实践**：优先使用 `const`，只有当你确定变量需要被重新赋值时，才使用 `let`。尽量避免使用 `var`。

```javascript
const PI = 3.14;
let score = 100;
score = 99; // let可以被重新赋值
// PI = 3.1415; // 这行会报错，因为const不能被重新赋值
```

## 2. 箭头函数 (Arrow Functions)

箭头函数提供了一种更简洁的函数写法。

```javascript
// 传统函数写法
function add(a, b) {
  return a + b;
}

// 箭头函数写法
const addArrow = (a, b) => {
  return a + b;
};

// 如果函数体只有一行return语句，可以写得更简洁
const multiply = (a, b) => a * b;
```
除了简洁，箭头函数在处理 `this` 关键字时有特殊的行为（它会捕获定义时所在上下文的`this`），这在很多场景下非常有用。

## 3. 模板字符串 (Template Literals)

模板字符串允许我们在字符串中嵌入变量和表达式，比传统的字符串拼接更直观、更方便。它使用反引号 `` ` `` 来定义。

```javascript
const name = "世界";
const greeting = `你好, ${name}!`; // 使用 ${} 嵌入变量
console.log(greeting); // 输出: 你好, 世界!

const price = 10;
const tax = 0.05;
const message = `总价是: ${price * (1 + tax)}`; // 可以嵌入表达式
console.log(message); // 输出: 总价是: 10.5
```

## 4. 解构赋值 (Destructuring)

解构允许我们从数组或对象中方便地提取值并赋给变量。

```javascript
// 对象解构
const user = {
  id: 1,
  username: "dev_user",
  email: "dev@example.com"
};
const { username, email } = user; // 从user对象中提取username和email
console.log(username); // "dev_user"

// 数组解构
const colors = ["red", "green", "blue"];
const [firstColor, secondColor] = colors;
console.log(firstColor); // "red"
```

---

下面的交互式代码块综合运用了这些新特性，请仔细阅读并理解它们。

```javascript:interactive
// 1. const 和 let
const userName = "CodeLearner";
let level = 5;

// 2. 模板字符串
const welcomeMessage = `欢迎, ${userName}! 你的等级是 ${level}.`;
console.log(welcomeMessage);

// 3. 箭头函数
const getNextLevel = (currentLevel) => currentLevel + 1;
console.log(`下一等级是: ${getNextLevel(level)}`);

// 4. 解构
const userData = {
  id: 42,
  role: "admin",
  lastLogin: "2023-10-27"
};

const { role } = userData;
console.log(`你的角色是: ${role}`);