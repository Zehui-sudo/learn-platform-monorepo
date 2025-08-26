# 3.4 Promise 链式调用

Promise最强大的地方在于，`.then()` 或 `.catch()` 方法本身也会返回一个**新的Promise**。这使得我们可以像链条一样，把多个异步操作一个接一个地串联起来，形成一个清晰、扁平的结构。

## 链式调用的魔力

回顾一下“回调地狱”中的场景：获取用户 -> 获取订单 -> 获取商品。

使用Promise链，代码会变成这样：

```javascript
getUser(userId)
  .then(user => {
    // 第一个.then处理用户信息
    // 并返回一个新的Promise来获取订单
    return getOrders(user.id); 
  })
  .then(orders => {
    // 第二个.then处理订单信息
    // 并返回一个新的Promise来获取商品
    return getGoods(orders[0].id);
  })
  .then(goods => {
    // 第三个.then处理商品信息
    console.log(goods.name);
  })
  .catch(error => {
    // 任何一个环节出错，都会被这一个.catch捕获
    console.error("出错了: ", error);
  });
```

看到了吗？原本层层嵌套的金字塔结构，变成了一个扁平、易于阅读的线性序列。这就是Promise链的威力。

**关键规则**：在 `.then()` 中 `return` 一个值，这个值会作为下一个 `.then()` 的输入。如果 `return` 的是一个新的Promise，那么下一个 `.then()` 会等待这个新的Promise完成后再执行。

---

下面的交互式示例模拟了一个多步骤的异步流程：
1.  第一步：获取一个数字（耗时1秒）。
2.  第二步：将获取到的数字乘以2（耗时1秒）。
3.  第三步：将结果再加10（耗时1秒）。

观察代码如何通过链式调用，清晰地表达了这个过程。

```javascript:interactive
// 第一步：返回一个Promise，1秒后成功并返回数字5
function stepOne() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log("第一步完成，得到数字 5");
      resolve(5);
    }, 1000);
  });
}

// 第二步：接收一个数字，返回一个Promise，1秒后成功并返回乘以2的结果
function stepTwo(number) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log(`第二步完成，${number} * 2 = ${number * 2}`);
      resolve(number * 2);
    }, 1000);
  });
}

// 第三步：接收一个数字，返回一个Promise，1秒后成功并返回加10的结果
function stepThree(number) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log(`第三步完成，${number} + 10 = ${number + 10}`);
      resolve(number + 10);
    }, 1000);
  });
}

// 开始执行Promise链
stepOne()
  .then(resultFromStep1 => {
    // 将第一步的结果传给第二步
    return stepTwo(resultFromStep1);
  })
  .then(resultFromStep2 => {
    // 将第二步的结果传给第三步
    return stepThree(resultFromStep2);
  })
  .then(finalResult => {
    console.log("最终结果是: " + finalResult);
  })
  .catch(error => {
    console.error("链条中某个环节出错了", error);
  });