# 1.4 条件语句

程序真正的威力在于它能够根据不同的情况执行不同的代码。**条件语句（Conditional Statements）**就赋予了我们这种决策能力。

## `if`...`else`：如果...否则...

最核心的条件语句是 `if`。它的逻辑是：“如果（if）某个条件为真（true），就执行这里的代码。”

我们可以用 `else` 来补充它，表示“否则（else），就执行那里的代码。”

```javascript
let age = 20;

if (age >= 18) {
  console.log("你已经是成年人了。");
} else {
  console.log("你还是个未成年人。");
}
```

## 比较运算符

在 `if` 的条件中，我们经常使用**比较运算符**来判断真假：

- `>`: 大于
- `<`: 小于
- `>=`: 大于或等于
- `<=`: 小于或等于
- `===`: 严格等于（值和类型都相等）
- `!==`: 不严格等于

## `else if`：处理多种情况

当有两种以上的情况时，我们可以使用 `else if` 来添加更多的条件分支。

```javascript
let score = 85;

if (score >= 90) {
  console.log("优秀");
} else if (score >= 75) {
  console.log("良好");
} else if (score >= 60) {
  console.log("及格");
} else {
  console.log("不及格");
}
// 输出: 良好
```

---

现在，请在下面的交互式代码块中，通过修改 `temperature` 变量的值，来测试不同的条件分支会输出什么建议。

```javascript:interactive
let temperature = 15; // 试着改成 30, 5, 或者 -5

let suggestion = ""; // 用于存储建议的变量

if (temperature > 25) {
  suggestion = "天气炎热，适合穿短袖。";
} else if (temperature > 10) {
  suggestion = "天气温和，一件薄外套就好。";
} else {
  suggestion = "天气寒冷，记得穿厚一点！";
}

console.log(suggestion);