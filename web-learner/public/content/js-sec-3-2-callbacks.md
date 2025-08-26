# 3.2 回调函数

**回调函数（Callback Function）**是处理异步操作最基本的方式。它的核心思想很简单：**“你先忙，忙完了记得调用这个函数通知我。”**

一个回调函数，本质上就是一个被作为参数传递给另一个函数的函数。

## 回调函数的模式

让我们再看一下 `setTimeout` 的例子，它完美地诠释了回调模式：

```javascript
function onTimeoutComplete() {
  console.log("时间到了！");
}

// 我们把 onTimeoutComplete 这个函数作为参数传给了 setTimeout
// onTimeoutComplete 就是一个回调函数
setTimeout(onTimeoutComplete, 1000); 
```

在这里，我们并没有立即执行 `onTimeoutComplete()`。我们只是把它“注册”给了 `setTimeout`，并告诉它：“1秒后，请帮我调用 `onTimeoutComplete` 这个函数。”

## 回调地狱 (Callback Hell)

当多个异步操作相互依赖时，使用回调函数会变得非常棘手。你可能需要在一个回调函数内部，发起另一个异步操作，这就形成了层层嵌套。

想象一下这个场景：
1.  先获取用户信息。
2.  获取成功后，用用户信息去获取他的订单列表。
3.  获取订单成功后，用订单信息去获取商品详情。

用回调函数实现，代码可能会变成这样：

```javascript
getUser(userId, function(user) {
  getOrders(user.id, function(orders) {
    getGoods(orders[0].id, function(goods) {
      console.log(goods.name);
      // ...如果还有下一步，会继续嵌套
    }, function(error3) { /* ... */ });
  }, function(error2) { /* ... */ });
}, function(error1) { /* ... */ });
```

这种金字塔形的嵌套代码，被称为**“回调地狱”**。它难以阅读、难以维护、也难以进行错误处理。

正是为了解决回调地狱的问题，JavaScript引入了更先进的异步处理方案，比如我们接下来要学习的 Promise。

---

下面的交互式示例模拟了一个“下载”过程。`mockDownload` 函数接受一个回调函数作为参数，并在模拟的延时后执行它。

```javascript:interactive
function mockDownload(callback) {
  console.log("开始下载...");
  
  // 模拟一个2秒的网络延迟
  setTimeout(function() {
    console.log("下载完成！");
    
    // 当下载完成后，调用传入的回调函数
    callback("下载的文件内容");
    
  }, 2000);
}

function handleDownloadResult(result) {
  console.log("处理结果: " + result);
}

// 调用 mockDownload，并把 handleDownloadResult 作为回调函数传进去
mockDownload(handleDownloadResult);

console.log("主程序继续执行其他任务...");