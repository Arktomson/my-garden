---
title: promise
---

# promise

## 1. promise 是什么

* promise 是异步编程的一种解决方案，promise js中用于处理“异步”操作的“对象”，编写代码变得更加“优雅”，比传统的解决方案——回调函数和事件——更合理和更强大。
* promise相当于预定好了 成功和失败，异步操作完成后会调用约定好的内容“发布订阅”，只是在回调的基础上增加了封装和抽象

## 2. 有了promise解决了哪些问题?
1. 统一了异步编程的范式，在 Promise 出现之前，开发者需要使用回调、事件监听、定时器等方式处理异步操作，这些方式各自独立，缺乏统一性。
2. 回调地狱问题，恶魔金字塔，嵌套层级很深，难以控制。 promise中有链式调用,配合async await 可以解决回调地狱问题
3. 错误问题，无法统一处理。 promise提供了catch方法可以优雅管理的错误
4. 并发问题，早期可以采用计数器的方式。 promise中提供了很多好用的方法 Promise.all finally allSettled

## 3. promise 缺点
1. 无法取消promise，一旦新建它就会立即执行，无法中途取消。(使用AbortController可以取消)
2. 如果不设置回调函数，promise内部抛出的错误，不会反应到外部。(then方法中抛出的错误，如果没有catch方法，会吞掉错误)
3. 当处于pending状态时，无法得知目前进展到哪一个阶段（刚刚开始还是即将完成）。(文件上传可以使用fetch的onProgress方法)

## 4. promise 的实现
[Promise A+规范-中文](https://www.cnblogs.com/gupingan/p/18628539)

[Promise A+规范-英文](https://promisesaplus.com/)

### Stage 1

1. Promise是一个类，使用的时候需要new Promise来产生一个promise实例
2. 构造函数中需要传递一个参数 executor函数，executor立即执行，executor中有两个参数  resolve(value)  reject(reason)，调用resolve会让promise变成成功 调用reject会变成失败  pending等待态 fulfilled 成功态  rejected失败态，一但状态发生变化后不能再修改状态,如果不调用resolve此时promise不会成功也不会失败 （如果发生异常也会认为是失败）
3. 每个promise实例都有一个then方法，会有两个参数 onfulfilled， onrjected，onfulfilled是成功状态resolve调用后的回调，onrjected是失败回调reject调用后的回调

```js[stage1.js]
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';
class Promise {
    constructor(executor) {
        this.state = PENDING;
        this.value = undefined;
        this.reason = undefined;
        const resolve = (value) => {
            if (this.state === PENDING) {
                this.state = FULFILLED;
                this.value = value;
            }
        }   
        const reject = (reason) => {
            if (this.state === PENDING) {
                this.state = REJECTED;
                this.reason = reason;
            }
        }
        try {   
            executor(resolve, reject);
        } catch (error) {
            reject(error);
        }
    }
    then(onFulfilled, onRejected) {
        if (this.state === FULFILLED) {
            onFulfilled(this.value);
        }
        if (this.state === REJECTED) {
            onRejected(this.reason);
        }
    }
}
```

### Stage 2

1. executor中异步任务场景的处理
2. 多次调用then方法，需要将回调函数存储起来
3. then方法中resolve和reject回调是微任务
4. then方法可以链式调用，返回的是新的promise实例，这个promise的状态是根据什么来决定的？
    * 如果返回的内容是普通值（不是promise，不是throw Error） 都会走下一次的成功
    * 如果onFulfilled  onRejected 在执行过程中出错了，会走下一次then的失败
    * 如果返回的是一个promise，会根据这个promise的状态来决定下一次then的状态
        * 如果返回的promise和当前promise是同一个，抛出循环报错

```js[stage2.js]

```