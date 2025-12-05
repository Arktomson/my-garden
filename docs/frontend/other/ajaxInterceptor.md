---
description: 讲解Ajax劫持的实现
tags: ['通用']
---

# Ajax 劫持的实现

> Ajax 劫持常用于：**请求/响应日志记录**（调试监控）、**接口 Mock**（开发阶段数据模拟）、**数据加密解密**（安全传输）、**性能监控**（接口耗时统计）等场景。最近团队横向任务需要涉及到**接口Mock缓存**的功能开发，所以进行一个Ajax劫持的实现。

## 实现的整体思路

实现的形式一般有两种，一种是`patch`重写`XMLHttpRequest` 和`Response(fetch调用返回的对象)`原型上的方法，另一种是代理`xhr`和`response`实例对象，通过`proxy`进行拦截。

## 方案对比

* proxy相比patch，性能有一定损耗(对于web页面顶多几十个接口请求的场景下，性能损耗可以忽略不计)
* proxy可以拦截更多操作(比如delete操作符拦截，in操作符拦截等)，虽然这些操作在Mock场景下用不到。
* 对于属性和函数调用的拦截,proxy和patch方式都可以进行拦截，
* 对于监听事件的设置操作比如xhr.readyStateChange，onload，onerror，onprogress等，patch的拦截，会比较麻烦一些，需要Object.defineProperty重定义setter，相比较下来proxy能够处理的相对更为方便和灵活。

**最终考虑proxy方式**

## 实现过程

* xhr和fetch的劫持实现有所不同，需要根据XMLHttpRequest和Fetch API的规范进行实现。
* 所以各定义两个类，分别实现xhr和fetch的劫持。然后一个公共的类，用于实现两种劫持的管理和一些额外逻辑处理
* 劫持主要处理的就是请求前(请求参数的修改)，请求后(请求响应的修改)

### xhr的劫持

* 重写XMLHttpRequest构造函数，代理XMLHttpRequest实例对象
* get和set的拦截，get处理(属性如status，方法如open，send等)，set处理(onload,onprogress等事件的设置)
* 在合适的位置插入我们的钩子函数，实现劫持

#### get的劫持
```js
const a = 1
```
#### set的劫持
```js
const a = 1
```
### fetch的劫持

