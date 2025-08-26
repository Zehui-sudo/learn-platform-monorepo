# 1.3 运算符

有了变量来存储数据后，我们就需要**运算符（Operators）**来对这些数据进行操作。运算符是执行计算、赋值和比较的特殊符号。

## 算术运算符

这些运算符用于执行基本的数学计算，与我们小学学过的符号非常相似。

- `+` (加法)
- `-` (减法)
- `*` (乘法)
- `/` (除法)

```javascript
let a = 10;
let b = 5;

console.log(a + b); // 输出: 15
console.log(a - b); // 输出: 5
console.log(a * b); // 输出: 50
console.log(a / b); // 输出: 2
```

特别地，`+` 运算符也可以用于连接字符串：

```javascript
let firstName = "John";
let lastName = "Doe";
console.log(firstName + " " + lastName); // 输出: "John Doe"
```

## 赋值运算符

最常见的赋值运算符是 `=`，我们已经用过它很多次了。它的作用是把右边的值赋给左边的变量。

```javascript
let myAge = 30; // 把 30 赋给 myAge
```

---

现在，轮到你来练习了。

在下面的交互式代码块中，请尝试：
1.  完成 `sum` 和 `difference` 变量的计算。
2.  创建一个名为 `fullName` 的新变量，通过连接 `part1` 和 `part2` 得到你的全名。
3.  使用 `console.log` 打印出所有结果。

```javascript:interactive
let price = 199;
let quantity = 3;
let total = price * quantity; // 乘法示例

let x = 100;
let y = 25;
let sum = x + y; // TODO: 计算 x 和 y 的和
let difference = x - y; // TODO: 计算 x 和 y 的差

let part1 = "Jane";
let part2 = "Smith";
// TODO: 在这里创建 fullName 变量

console.log("总价是: " + total);
console.log("和是: " + sum);
// 在这里打印其他结果
