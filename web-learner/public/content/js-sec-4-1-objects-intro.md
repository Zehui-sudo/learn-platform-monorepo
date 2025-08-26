# 4.1 对象：属性与方法

在JavaScript中，**对象（Object）**是一种极其重要和灵活的数据结构。它允许我们将多个相关的数据和功能打包在一起，形成一个独立的实体。

## 什么是对象？

如果说变量是一个只能装一件东西的盒子，那么对象就是一个可以分门别类装很多东西的柜子。

一个对象由一系列的**属性（Properties）**组成，每个属性都是一个“键-值”对（Key-Value Pair）。
-   **键 (Key)**: 是一个字符串，相当于柜子上抽屉的标签。
-   **值 (Value)**: 可以是任何数据类型，比如字符串、数字、布尔值，甚至是另一个对象，或者一个函数。

```javascript
// 创建一个描述“用户”的对象
let user = {
  // 属性1: name 是键, "Alice" 是值
  name: "Alice",
  
  // 属性2: age 是键, 30 是值
  age: 30,
  
  // 属性3: isVip 是键, true 是值
  isVip: true
};
```

## 访问对象属性

我们可以使用“点表示法” (`.`) 或者“方括号表示法” (`[]`) 来访问对象的属性。

```javascript
// 使用点表示法 (更常用)
console.log(user.name); // 输出: "Alice"
console.log(user.age);  // 输出: 30

// 使用方括号表示法
console.log(user['isVip']); // 输出: true
```

## 方法：属于对象的函数

当一个对象的属性值是一个函数时，我们通常称之为**方法（Method）**。方法定义了这个对象能够执行的“动作”。

```javascript
let user = {
  name: "Bob",
  
  // greet 是一个方法
  greet: function() {
    // 在方法内部，我们可以使用 `this` 关键字来引用对象自身
    console.log("你好, 我是 " + this.name);
  }
};

// 调用对象的方法
user.greet(); // 输出: 你好, 我是 Bob
```

---

下面的交互式示例创建了一个 `car` 对象。请尝试：
1.  使用 `console.log` 打印出这辆车的颜色（`color`）和年份（`year`）。
2.  调用 `start` 方法，看看会发生什么。

```javascript:interactive
let car = {
  brand: "Tesla",
  model: "Model 3",
  color: "红色",
  year: 2023,
  
  // 启动方法
  start: function() {
    console.log("引擎启动！ " + this.brand + " " + this.model + " 准备出发。");
  },
  
  // 鸣笛方法
  honk: function() {
    console.log("嘀嘀！");
  }
};

// 在这里访问属性和调用方法
console.log(car.brand);
car.honk();
