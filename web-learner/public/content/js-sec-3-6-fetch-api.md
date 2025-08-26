# 3.6 使用fetch进行网络请求

在现代Web开发中，最常见的异步操作就是通过网络向服务器请求数据。浏览器为此提供了一个内置的、基于Promise的强大工具——**`fetch` API**。

## `fetch` 的基本用法

`fetch()` 函数接受你想要请求的URL作为参数，然后返回一个Promise。这个Promise在收到服务器的**响应头**后就会成功（`fulfilled`），其成功值是一个 `Response` 对象。

```javascript
fetch('https://api.github.com/users/github')
  .then(response => {
    // 在这里，我们拿到了 Response 对象
    // 注意，此时响应体（真正的数据）可能还在传输中
    console.log(response);
  })
  .catch(error => {
    // 如果发生网络错误（比如无法连接服务器），会在这里捕获
    console.error('网络请求失败:', error);
  });
```

## 处理 `Response` 对象

`Response` 对象本身并不是我们最终想要的数据。它是一个包含了响应状态、响应头等信息的对象。为了获取响应体中的真正数据，我们需要调用 `Response` 对象提供的另一个方法，最常用的是 `.json()`。

-   `.json()`: 这个方法会读取响应体，并尝试将它解析为JSON格式。**重要的是，`.json()` 方法本身也返回一个Promise！**

所以，一个完整的 `fetch` 流程通常需要一个两步的Promise链：

```javascript
fetch('https://api.github.com/users/github')
  .then(response => {
    // 第一步：检查响应是否成功 (HTTP状态码 200-299)
    if (!response.ok) {
      throw new Error('网络响应错误');
    }
    // 第二步：调用 .json()，返回一个新的Promise
    return response.json();
  })
  .then(data => {
    // 在这个 .then 中，我们才真正拿到了解析后的JSON数据
    console.log(data);
    console.log("用户名: " + data.name);
    console.log("粉丝数: " + data.followers);
  })
  .catch(error => {
    console.error('请求处理失败:', error);
  });
```

## 结合 `async/await`

使用 `async/await` 可以让 `fetch` 的流程更加扁平化和直观：

```javascript
async function getUserData() {
  try {
    const response = await fetch('https://api.github.com/users/github');
    
    if (!response.ok) {
      throw new Error(`HTTP 错误! 状态: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(data);
    
  } catch (error) {
    console.error("无法获取用户数据:", error);
  }
}

getUserData();
```

---

下面的交互式示例将使用 `fetch` API 从一个公开的JSON服务获取一些虚拟的用户数据并显示出来。

```javascript:interactive
// 我们将使用 JSONPlaceholder, 一个提供免费虚拟API的服务
const apiUrl = 'https://jsonplaceholder.typicode.com/users/1';

async function displayFetchedUser() {
  console.log("正在请求数据...");
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`请求失败，状态码: ${response.status}`);
    }
    const userData = await response.json();
    
    console.log("数据获取成功!");
    console.log("姓名: " + userData.name);
    console.log("邮箱: " + userData.email);
    console.log("城市: " + userData.address.city);
    
  } catch (error) {
    console.error(error.message);
  }
}

displayFetchedUser();