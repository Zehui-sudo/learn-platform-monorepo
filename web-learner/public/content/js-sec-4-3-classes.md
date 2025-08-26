# 4.3 `class`：创建对象的蓝图

当我们想创建多个具有相同属性和方法的对象时，一个一个地写对象字面量会非常重复。**类（Class）**就是为了解决这个问题而生的。

你可以把 `class` 想象成一个用于创建对象的“蓝图”或“模具”。它定义了所有由它创建的对象应该具有的共同特征。

## 定义一个类

我们使用 `class` 关键字来定义一个类。按照惯例，类名的首字母大写。

```javascript
class User {
  // ... 类的定义
}
```

## `constructor` 方法

`constructor` 是一个特殊的方法，用于创建和初始化一个由 `class` 创建的对象。当我们使用 `new` 关键字来创建类的实例时，`constructor` 会被自动调用。

```javascript
class User {
  constructor(name, email) {
    // `this` 指向即将被创建的新对象
    console.log("正在创建一个新用户...");
    this.name = name;
    this.email = email;
    this.isOnline = false; // 可以设置默认属性
  }
}
```

## 创建实例

定义好类之后，我们就可以使用 `new` 关键字，像盖章一样，根据这个蓝图创建出具体的对象实例。

```javascript
// 使用 User 蓝图创建两个不同的用户实例
const user1 = new User("Alice", "alice@example.com");
const user2 = new User("Bob", "bob@example.com");

console.log(user1.name); // 输出: "Alice"
console.log(user2.email); // 输出: "bob@example.com"
```

## 在类中定义方法

我们可以在 `class` 内部直接定义方法，所有由该类创建的实例都将共享这些方法。

```javascript
class User {
  constructor(name) {
    this.name = name;
  }
  
  // 定义一个 greet 方法
  greet() {
    console.log(`你好，我是 ${this.name}！`);
  }
}

const user1 = new User("Charlie");
user1.greet(); // 输出: 你好，我是 Charlie！
```

---

下面的交互式示例定义了一个 `Rectangle` (矩形) 类。请尝试：
1.  使用这个类创建几个不同尺寸的矩形实例。
2.  调用实例的 `getArea()` 方法来计算并打印它们的面积。

```javascript:interactive
class Rectangle {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }
  
  // 计算面积的方法
  getArea() {
    return this.width * this.height;
  }
  
  // 打印描述信息的方法
  describe() {
    console.log(`这是一个宽${this.width}、高${this.height}的矩形。`);
  }
}

// 创建一个实例
const rect1 = new Rectangle(10, 5);
rect1.describe();
console.log("它的面积是: " + rect1.getArea());

// TODO: 创建你自己的矩形实例并计算面积
