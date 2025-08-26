# 3.5 async/await

`async/await` 是在ES2017中引入的，它被誉为“JavaScript异步编程的终极解决方案”。它本质上是建立在Promise之上的**语法糖（Syntactic Sugar）**，让我们能够用更像同步代码的方式来编写异步逻辑。

## 核心概念

`async/await` 由两个关键字组成：

### 1. `async`

`async` 用于修饰一个函数。一旦一个函数被声明为 `async`，它就意味着：
-   这个函数内部将可以（但非必须）使用 `await` 关键字。
-   这个函数无论内部 `return` 什么，**它本身总会返回一个Promise**。
    -   如果 `return` 一个普通值（如 `return 10;`），那么这个 `async` 函数会返回一个立即 `fulfilled` 状态的Promise，其值为 `10`。
    -   如果 `return` 一个Promise，那么这个 `async` 函数的返回Promise的状态将由被 `return` 的Promise决定。

```javascript
async function myAsyncFunction() {
  return "Hello, async!";
}

const promise = myAsyncFunction();
console.log(promise); // 它是一个Promise

promise.then(value => {
  console.log(value); // 输出: "Hello, async!"
});
```

### 2. `await`

`await` 关键字**只能在 `async` 函数内部使用**。它的作用是“暂停” `async` 函数的执行，等待它后面的Promise完成。
-   如果Promise成功（`fulfilled`），`await` 会返回成功的值。
-   如果Promise失败（`rejected`），`await` 会抛出一个错误，这个错误可以被 `try...catch` 捕获。

## 重写Promise链

让我们用 `async/await` 重写上一节的Promise链示例：

```javascript
// 这是之前的Promise链
stepOne()
  .then(res1 => stepTwo(res1))
  .then(res2 => stepThree(res2))
  .then(finalResult => console.log(finalResult));

// 这是使用 async/await 的版本
async function runAllSteps() {
  try {
    console.log("流程开始");
    const resultFromStep1 = await stepOne();
    const resultFromStep2 = await stepTwo(resultFromStep1);
    const resultFromStep3 = await stepThree(resultFromStep2);
    console.log("最终结果是: " + resultFromStep3);
  } catch (error) {
    // 任何一个await的Promise失败，都会被catch捕获
    console.error("流程中出错了: ", error);
  }
}

runAllSteps();
```
代码是不是看起来就像同步执行一样清晰、直观？这就是 `async/await` 的魅力。

---

下面的交互式代码块中，我们用 `async/await` 来模拟获取用户数据的过程。

```javascript:interactive
// 模拟一个API调用，它返回一个Promise
function fetchUserData() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ id: 1, name: "张三", email: "zhangsan@example.com" });
    }, 1500);
  });
}

// 使用async/await来处理这个异步操作
async function displayUser() {
  console.log("正在获取用户数据...");
  
  try {
    const user = await fetchUserData(); // 等待Promise完成，并获取结果
    console.log("数据获取成功！");
    console.log("用户名: " + user.name);
    console.log("邮箱: " + user.email);
  } catch (e) {
    console.error("获取数据失败: ", e);
  }
}

displayUser();