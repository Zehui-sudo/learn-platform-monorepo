# JavaScript 知识体系结构与内容生成指南

## 一、知识体系二级目录

### 第一章：语言基础
```
1.1 变量与值
  1.1.1 变量声明（var/let/const）
  1.1.2 基本数据类型（number/string/boolean）
  1.1.3 特殊值（null/undefined/NaN）
  1.1.4 类型检测与转换
  1.1.5 作用域与提升

1.2 运算符与表达式
  1.2.1 算术运算符
  1.2.2 比较运算符（==/===）
  1.2.3 逻辑运算符（&&/||/!）
  1.2.4 赋值运算符
  1.2.5 条件运算符（三元）
  1.2.6 运算符优先级

1.3 控制流
  1.3.1 if-else 条件判断
  1.3.2 switch-case 分支
  1.3.3 for 循环
  1.3.4 while/do-while 循环
  1.3.5 break/continue 控制
  1.3.6 循环性能与优化

1.4 函数基础
  1.4.1 函数声明与表达式
  1.4.2 参数与返回值
  1.4.3 箭头函数
  1.4.4 默认参数与剩余参数
  1.4.5 函数作用域
  1.4.6 递归基础
```

### 第二章：复合数据类型
```
2.1 数组
  2.1.1 数组创建与访问
  2.1.2 数组基础方法（push/pop/shift/unshift）
  2.1.3 数组遍历（for/forEach）
  2.1.4 数组转换方法（map/filter/reduce）
  2.1.5 数组查找与判断（find/some/every）
  2.1.6 数组排序与反转
  2.1.7 数组解构赋值

2.2 对象
  2.2.1 对象创建与属性访问
  2.2.2 属性的增删改查
  2.2.3 对象方法与this
  2.2.4 对象遍历
  2.2.5 对象解构赋值
  2.2.6 JSON序列化
  2.2.7 对象的浅拷贝与深拷贝

2.3 字符串进阶
  2.3.1 字符串方法（substring/slice）
  2.3.2 字符串查找（indexOf/includes）
  2.3.3 字符串替换与分割
  2.3.4 模板字符串
  2.3.5 正则表达式基础
```

### 第三章：函数进阶
```
3.1 高阶函数
  3.1.1 函数作为参数
  3.1.2 函数作为返回值
  3.1.3 闭包概念与应用
  3.1.4 柯里化
  3.1.5 函数组合

3.2 this与上下文
  3.2.1 this的四种绑定规则
  3.2.2 call/apply/bind
  3.2.3 箭头函数的this
  3.2.4 常见this陷阱
```

### 第四章：面向对象编程
```
4.1 构造函数与原型
  4.1.1 构造函数
  4.1.2 prototype原型
  4.1.3 原型链
  4.1.4 instanceof原理

4.2 类与继承
  4.2.1 class声明
  4.2.2 构造器与属性
  4.2.3 方法定义
  4.2.4 继承extends
  4.2.5 super关键字
  4.2.6 静态方法与属性
```

### 第五章：异步编程
```
5.1 异步基础
  5.1.1 同步vs异步
  5.1.2 事件循环机制
  5.1.3 定时器（setTimeout/setInterval）
  5.1.4 回调函数

5.2 Promise
  5.2.1 Promise基础
  5.2.2 then/catch/finally
  5.2.3 Promise链式调用
  5.2.4 Promise.all/race
  5.2.5 错误处理

5.3 async/await
  5.3.1 async函数
  5.3.2 await表达式
  5.3.3 错误处理
  5.3.4 并发控制
  5.3.5 实战应用
```

### 第六章：DOM与事件
```
6.1 DOM操作
  6.1.1 元素选择
  6.1.2 内容修改
  6.1.3 属性操作
  6.1.4 样式操作
  6.1.5 元素创建与插入
  6.1.6 元素删除

6.2 事件处理
  6.2.1 事件监听
  6.2.2 事件对象
  6.2.3 事件冒泡与捕获
  6.2.4 事件委托
  6.2.5 常用事件类型
  6.2.6 自定义事件
```

### 第七章：实用特性
```
7.1 ES6+特性
  7.1.1 解构赋值进阶
  7.1.2 展开运算符
  7.1.3 Set与Map
  7.1.4 Symbol类型
  7.1.5 Proxy与Reflect

7.2 模块化
  7.2.1 模块导出export
  7.2.2 模块导入import
  7.2.3 默认导出
  7.2.4 动态导入

7.3 错误处理
  7.3.1 try-catch-finally
  7.3.2 Error对象
  7.3.3 自定义错误
  7.3.4 异步错误处理
```

### 第八章：网络与存储
```
8.1 网络请求
  8.1.1 fetch基础
  8.1.2 请求配置
  8.1.3 响应处理
  8.1.4 错误处理
  8.1.5 请求拦截

8.2 浏览器存储
  8.2.1 Cookie
  8.2.2 LocalStorage
  8.2.3 SessionStorage
  8.2.4 IndexedDB基础
```

## 二、AI生成内容Prompt模板

### 基础Prompt结构

```markdown
请为JavaScript知识点"[知识点名称]"生成学习内容。

知识点信息：
- ID: [知识点ID，如 js-sec-1-1-1]
- 标题: [知识点标题]
- 难度: [基础/进阶/高级]
- 前置知识: [依赖的知识点ID列表]

内容要求：
1. 使用markdown格式
2. 所有代码块必须标记为 ```javascript:interactive 以支持在线运行
3. 内容由浅入深，分为4个递进层次
4. 包含对比示例，展示正确和错误用法
5. 每个代码示例都要有console.log输出，让用户能看到结果

内容结构：

## [知识点标题]

### 🎯 核心概念
用一句话说明这个知识点解决什么问题，为什么需要它。

### 📚 Level 1: 基础认知（30秒理解）
```javascript:interactive
// 最简单的例子，一眼就能理解
// 必须包含console.log展示结果
```

### 📈 Level 2: 核心特性（深入理解）
展示2-3个关键特性，每个特性配代码示例：

#### 特性1: [特性名称]
```javascript:interactive
// 展示特性的代码
// 使用console.log展示不同情况
```

#### 特性2: [特性名称]
```javascript:interactive
// 展示特性的代码
```

### 🔍 Level 3: 对比学习（避免陷阱）
通过对比展示正确和错误的用法：

```javascript:interactive
console.log("=== 错误用法 ===");
// ❌ 展示常见错误
// 解释为什么是错的

console.log("=== 正确用法 ===");
// ✅ 展示正确做法
// 解释为什么这样是对的
```

### 🚀 Level 4: 实战应用（真实场景）
一个贴近实际的应用示例：

```javascript:interactive
// 模拟真实场景的代码
// 要有实际意义，不是纯理论
// 代码要完整可运行
```

### 💡 记忆要点
- 要点1：[一句话总结]
- 要点2：[一句话总结]
- 要点3：[一句话总结]

### 🏷️ 知识标签（不显示给用户）
<!--
metadata:
  syntax: [相关语法标签，如: let, const, arrow-function]
  pattern: [代码模式标签，如: callback, promise-chain]
  api: [API标签，如: Array.map, Object.keys]
  concept: [概念标签，如: closure, hoisting]
  difficulty: [基础/进阶/高级]
  dependencies: [前置知识点ID列表]
  related: [相关知识点ID列表]
-->
```

### 生成示例

```markdown
示例输入：
知识点：变量声明（var/let/const）
ID: js-sec-1-1-1

生成内容：

## 变量声明（var/let/const）

### 🎯 核心概念
变量声明决定了如何在程序中存储和修改数据，选择合适的声明方式能避免很多bug。

### 📚 Level 1: 基础认知（30秒理解）
```javascript:interactive
// 三种声明变量的方式
var name1 = "Alice";     // 旧方式，函数作用域
let name2 = "Bob";       // 新方式，块级作用域，可修改
const name3 = "Charlie"; // 新方式，块级作用域，不可修改

console.log("var声明:", name1);
console.log("let声明:", name2);
console.log("const声明:", name3);
```

### 📈 Level 2: 核心特性（深入理解）

#### 特性1: 作用域差异
```javascript:interactive
console.log("=== 作用域测试 ===");

if (true) {
  var x = 1;  // 函数作用域
  let y = 2;  // 块级作用域
  const z = 3;  // 块级作用域
  console.log("块内部 - var x:", x);
  console.log("块内部 - let y:", y);
  console.log("块内部 - const z:", z);
}

console.log("块外部 - var x:", x);  // ✅ 可以访问
// console.log("块外部 - let y:", y);  // ❌ 报错：y未定义
// console.log("块外部 - const z:", z);  // ❌ 报错：z未定义
```

#### 特性2: 重复声明
```javascript:interactive
console.log("=== 重复声明测试 ===");

var a = 1;
var a = 2;  // ✅ var允许重复声明
console.log("var重复声明后:", a);

let b = 1;
// let b = 2;  // ❌ 报错：标识符已声明

const c = 1;
// const c = 2;  // ❌ 报错：标识符已声明
```

#### 特性3: 修改限制
```javascript:interactive
console.log("=== 修改限制测试 ===");

let mutable = "可以改";
mutable = "已修改";
console.log("let修改后:", mutable);

const immutable = "不能改";
// immutable = "尝试修改";  // ❌ 报错：给常量赋值

// 但是const对象的属性可以修改
const person = { name: "Alice" };
person.name = "Bob";  // ✅ 可以修改属性
console.log("const对象属性修改后:", person.name);
```

### 🔍 Level 3: 对比学习（避免陷阱）
```javascript:interactive
console.log("=== 常见陷阱：变量提升 ===");

// ❌ 错误用法：var的提升陷阱
console.log("访问var变量（声明前）:", myVar);  // undefined，不报错
var myVar = 5;

// ❌ 错误用法：let的暂时性死区
// console.log("访问let变量（声明前）:", myLet);  // 报错
let myLet = 5;

console.log("\n=== 循环中的作用域陷阱 ===");

// ❌ var在循环中的问题
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log("var循环:", i), 100);  // 输出3个3
}

// ✅ let正确保持作用域
for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log("let循环:", j), 200);  // 输出0,1,2
}
```

### 🚀 Level 4: 实战应用（真实场景）
```javascript:interactive
// 实战：配置对象与状态管理

// 使用const定义不变的配置
const CONFIG = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
  retryCount: 3
};

// 使用let定义会变化的状态
let currentUser = null;
let isLoading = false;

// 模拟用户登录
function login(username) {
  isLoading = true;
  console.log("登录中...");
  
  // 模拟API调用
  setTimeout(() => {
    currentUser = { name: username, id: Date.now() };
    isLoading = false;
    console.log("登录成功:", currentUser);
    console.log("加载状态:", isLoading);
  }, 1000);
}

console.log("初始状态 - 用户:", currentUser, "加载中:", isLoading);
login("Alice");

// CONFIG.apiUrl = "xxx";  // ❌ 如果尝试修改CONFIG会报错
CONFIG.timeout = 10000;     // ✅ 但可以修改属性
console.log("配置已更新:", CONFIG);
```

### 💡 记忆要点
- 要点1：优先使用const，需要修改时才用let，避免使用var
- 要点2：const只保证变量引用不变，对象和数组的内容仍可修改
- 要点3：let和const有块级作用域，var只有函数作用域

<!--
metadata:
  syntax: [var, let, const, block-scope, function-scope]
  pattern: [variable-declaration, scope-management]
  api: []
  concept: [hoisting, temporal-dead-zone, block-scope]
  difficulty: 基础
  dependencies: []
  related: [js-sec-1-1-5, js-sec-3-1-5]
-->
```

## 三、知识点元数据设计

### 元数据字段说明

```yaml
metadata:
  # 语法标签：用于匹配代码中的语法特征
  syntax: 
    - let              # 变量声明
    - const            # 常量声明
    - arrow-function   # 箭头函数
    - template-literal # 模板字符串
    - destructuring    # 解构赋值
    - spread           # 展开运算符
    - async            # async关键字
    - await            # await关键字
    - class            # 类声明
    - try-catch        # 异常处理

  # 模式标签：用于匹配代码模式
  pattern:
    - callback         # 回调模式
    - promise-chain    # Promise链
    - async-await      # 异步等待模式
    - event-handler    # 事件处理
    - array-methods    # 数组方法链
    - object-destructuring # 对象解构
    - hof              # 高阶函数
    - closure          # 闭包
    - recursion        # 递归

  # API标签：用于匹配具体的API调用
  api:
    - Array.map
    - Array.filter
    - Array.reduce
    - Object.keys
    - Object.values
    - Promise.all
    - Promise.race
    - fetch
    - addEventListener
    - querySelector

  # 概念标签：用于匹配抽象概念
  concept:
    - scope            # 作用域
    - hoisting         # 提升
    - closure          # 闭包
    - prototype        # 原型
    - event-loop       # 事件循环
    - this-binding     # this绑定
    - type-coercion    # 类型转换

  # 难度级别
  difficulty: 基础|进阶|高级

  # 依赖关系：学习此知识点前需要掌握的知识点
  dependencies:
    - js-sec-1-1-1     # 依赖的知识点ID

  # 相关知识：可以一起学习的知识点
  related:
    - js-sec-1-1-2     # 相关的知识点ID
```

## 四、内容生成工作流

### 1. 批量生成脚本

```javascript
// 知识点生成配置
const knowledgePoints = [
  {
    id: "js-sec-1-1-1",
    title: "变量声明（var/let/const）",
    difficulty: "基础",
    dependencies: [],
    prompt: "生成变量声明的学习内容..."
  },
  // ... 更多知识点
];

// 为每个知识点生成内容
knowledgePoints.forEach(point => {
  const content = generateContent(point);
  saveToFile(`content/${point.id}.md`, content);
});
```

### 2. 内容质量检查清单

- [ ] 每个级别的代码都能独立运行
- [ ] 所有示例都有console.log输出
- [ ] 对比示例清晰展示差异
- [ ] 实战示例贴近实际应用
- [ ] 元数据标签完整准确
- [ ] 依赖关系正确标注

### 3. 匹配优化建议

1. **多维度匹配权重**：
   - 语法匹配：40%
   - 模式匹配：30%
   - API匹配：20%
   - 概念关联：10%

2. **智能推荐规则**：
   - 优先推荐未掌握的依赖知识点
   - 根据用户代码复杂度推荐对应难度
   - 相似模式的知识点打包推荐

## 五、实施计划

### Phase 1: 核心基础（2周）
- 第一章：语言基础（必需）
- 第二章：复合数据类型（必需）

### Phase 2: 进阶内容（2周）
- 第三章：函数进阶
- 第五章：异步编程

### Phase 3: 实践应用（2周）
- 第六章：DOM与事件
- 第八章：网络与存储

### Phase 4: 高级特性（2周）
- 第四章：面向对象编程
- 第七章：实用特性

## 六、维护与更新

1. **用户反馈收集**：
   - 知识点难度是否合适
   - 示例是否易懂
   - 是否需要更多解释

2. **内容迭代**：
   - 根据新的JavaScript特性更新
   - 补充更多实战案例
   - 优化代码示例

3. **匹配算法优化**：
   - 收集匹配准确率数据
   - 调整标签权重
   - 完善依赖关系图