# 3.3 Promise 入门

为了解决回调地狱的问题，ES6 (ECMAScript 2015) 引入了一个强大的新特性：**Promise**。

## 什么是 Promise？

Promise的字面意思是“承诺”。在代码中，一个Promise对象代表了一个**尚未完成但最终会完成的异步操作的结果**。

你可以把它想象成一张“预购订单”。你下单后（发起异步操作），商家会给你一张订单（一个Promise对象）。你不用在店里干等，可以去做别的事。这张订单向你“承诺”：
-   未来某个时刻，商品会到货（异步操作**成功**，Promise状态变为 `fulfilled`）。
-   或者，未来某个时刻，商家告诉你商品没货了（异步操作**失败**，Promise状态变为 `rejected`）。

一个Promise对象必然处于以下三种状态之一：
-   **`pending`** (进行中): 初始状态，既没有成功，也没有失败。
-   **`fulfilled`** (已成功): 意味着操作成功完成。
-   **`rejected`** (已失败): 意味着操作失败。

## 消费一个 Promise: `.then()` 和 `.catch()`

我们通常是“消费”别人返回给我们的Promise（比如网络请求库），而不是自己创建。消费Promise的核心方法是 `.then()` 和 `.catch()`。

-   `.then(onFulfilled, onRejected)`: 用于注册成功和失败后的回调函数。
    -   第一个函数 `onFulfilled` 会在Promise成功时被调用，并接收成功的结果作为参数。
    -   第二个函数 `onRejected` (可选) 会在Promise失败时被调用，并接收失败的原因作为参数。
-   `.catch(onRejected)`: 专门用于捕获失败情况，是 `.then(null, onRejected)` 的语法糖，更常用。

```javascript
// 这是一个返回Promise的函数（我们将在下一节学习如何创建它）
const myPromise = new Promise((resolve, reject) => {
  // 模拟一个可能成功也可能失败的异步操作
  setTimeout(() => {
    if (Math.random() > 0.5) {
      resolve("操作成功！这是结果。"); // 成功时调用 resolve
    } else {
      reject("操作失败！出了点问题。"); // 失败时调用 reject
    }
  }, 1000);
});

console.log("Promise已创建，当前状态: pending");

myPromise
  .then(successResult => {
    // 当Promise状态变为 fulfilled 时，这里会执行
    console.log("成功回调: ", successResult);
  })
  .catch(errorReason => {
    // 当Promise状态变为 rejected 时，这里会执行
    console.log("失败回调: ", errorReason);
  });
```

---

请多次运行下面的交互式代码。由于成功或失败是随机的，你会看到它有时会执行 `.then` 里的成功回调，有时会执行 `.catch` 里的失败回调。

```javascript:interactive
console.log("开始执行异步操作...");

const promiseExample = new Promise((resolve, reject) => {
  setTimeout(() => {
    if (Math.random() < 0.7) {
      resolve("数据获取成功！");
    } else {
      reject(new Error("网络超时！"));
    }
  }, 1500);
});

promiseExample
  .then(result => {
    console.log("Promise成功了: " + result);
  })
  .catch(error => {
    console.error("Promise失败了: " + error.message);
  });