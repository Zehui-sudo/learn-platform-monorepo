# 4.5 模块化：import与export

当我们的项目越来越大时，把所有代码都写在一个文件里是不可行的。**模块化（Modularity）**允许我们将代码分割成多个独立、可复用的文件（模块），每个模块都可以专注于一个特定的功能。

ES6引入了官方的、标准化的模块系统，它使用 `export` 和 `import` 关键字。

## `export`: 导出模块成员

`export` 关键字用于从一个模块中“暴露”出变量、函数或类，以便其他模块可以使用它们。

一个模块可以有多个**命名导出（Named Exports）**和一个**默认导出（Default Export）**。

**文件: `utils.js`**
```javascript
// 命名导出: 导出一个常量
export const PI = 3.14159;

// 命名导出: 导出一个函数
export function add(a, b) {
  return a + b;
}

// 默认导出: 一个模块只能有一个
// 通常用于导出该模块最核心的功能
export default function greet(name) {
  return `Hello, ${name}!`;
}
```

## `import`: 导入模块成员

`import` 关键字用于在一个模块中引入另一个模块导出的成员。

**文件: `main.js`**
```javascript
// 导入默认导出，可以给它起任何名字 (这里是 myGreet)
import myGreet from './utils.js';

// 导入命名导出，必须使用花括号{}，且名称要匹配
import { PI, add } from './utils.js';

// 也可以一次性导入所有命名导出
// import * as utils from './utils.js';

console.log(myGreet("World")); // 输出: Hello, World!
console.log("PI 的值是: " + PI); // 输出: PI 的值是: 3.14159
console.log("2 + 3 = " + add(2, 3)); // 输出: 2 + 3 = 5
```

## 在浏览器中使用模块

要在浏览器中直接使用ES模块，你需要在 `<script>` 标签中添加 `type="module"` 属性。

```html
<!DOCTYPE html>
<html>
  <body>
    <!-- 告诉浏览器这是一个模块脚本 -->
    <script type="module" src="main.js"></script>
  </body>
</html>
```

---

由于本平台的交互环境限制，我们无法直接演示多文件模块系统。但请务必理解 `import` 和 `export` 的核心思想，因为它是所有现代JavaScript框架（如React, Vue, Angular）和项目构建的基础。

**恭喜你！** 学完本节，你已经掌握了从基础语法到现代特性的JavaScript核心知识体系，为后续更深入的学习打下了坚实的基础。