---
description: 讲解promise的实现和应用
tag: 前端基础
sticky: 1
---

# Promise

## 1. promise 是什么

- promise 是异步编程的一种解决方案，promise js 中用于处理“异步”操作的“对象”，编写代码变得更加“优雅”，比传统的解决方案——回调函数和事件——更合理和更强大。
- promise 相当于预定好了 成功和失败，异步操作完成后会调用约定好的内容“发布订阅”，只是在回调的基础上增加了封装和抽象

## 2. 有了 promise 解决了哪些问题?

1. 统一了异步编程的范式，在 Promise 出现之前，开发者需要使用回调、事件监听、定时器等方式处理异步操作，这些方式各自独立，缺乏统一性。
2. 回调地狱问题，恶魔金字塔，嵌套层级很深，难以控制。 promise 中有链式调用,配合 async await 可以解决回调地狱问题
3. 错误问题，无法统一处理。 promise 提供了 catch 方法可以优雅管理的错误
4. 并发问题，早期可以采用计数器的方式。 promise 中提供了很多好用的方法 Promise.all finally allSettled

## 3. promise 缺点

1. 无法取消 promise，一旦新建它就会立即执行，无法中途取消。(使用 AbortController 可以取消)
2. 如果不设置回调函数，promise 内部抛出的错误，不会反应到外部。(then 方法中抛出的错误，如果没有 catch 方法，会吞掉错误)
3. 当处于 pending 状态时，无法得知目前进展到哪一个阶段（刚刚开始还是即将完成）。(文件上传可以使用 fetch 的 onProgress 方法)

## 4. promise 的实现

[Promise A+规范-中文](https://www.cnblogs.com/gupingan/p/18628539)

[Promise A+规范-英文](https://promisesaplus.com/)

### Stage 1

1. Promise 是一个类，使用的时候需要 new Promise 来产生一个 promise 实例
2. 构造函数中需要传递一个参数 executor 函数，executor 立即执行，executor 中有两个参数 resolve(value) reject(reason)，调用 resolve 会让 promise 变成成功 调用 reject 会变成失败 pending 等待态 fulfilled 成功态 rejected 失败态，一但状态发生变化后不能再修改状态,如果不调用 resolve 此时 promise 不会成功也不会失败 （如果发生异常也会认为是失败）
3. 每个 promise 实例都有一个 then 方法，会有两个参数 onfulfilled， onrjected，onfulfilled 是成功状态 resolve 调用后的回调，onrjected 是失败回调 reject 调用后的回调

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

1. executor 中异步任务场景的处理
2. 多次调用 then 方法，需要将回调函数存储起来
3. then 方法中 resolve 和 reject 回调是微任务

```js[stage2.js]
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

class Promise {
  constructor(executor) {
    this.state = PENDING;
    this.value = undefined;
    this.reason = undefined;
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];
    const resolve = (value) => {
      if (this.state === PENDING) {
        this.state = FULFILLED;
        this.value = value;
        this.onFulfilledCallbacks.forEach((fn) => fn());
      }
    };
    const reject = (reason) => {
      if (this.state === PENDING) {
        this.state = REJECTED;
        this.reason = reason;
        this.onRejectedCallbacks.forEach((fn) => fn());
      }
    };
    try {
      executor(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }
  then(onFulfilled, onRejected) {
    if (this.state === FULFILLED) {
      setTimeout(() => {
        onFulfilled(this.value);
      }, 0);
    }
    if (this.state === REJECTED) {
      setTimeout(() => {
        onRejected(this.reason);
      }, 0);
    }
    if (this.state === PENDING) {
      this.onFulfilledCallbacks.push(() => {
        setTimeout(() => {
          onFulfilled(this.value);
        }, 0);
      });
      this.onRejectedCallbacks.push(() => {
        setTimeout(() => {
          onRejected(this.reason);
        }, 0);
      });
    }
  }
}
```

### Stage 3

1. 实现 then 方法可以链式调用，返回的是新的 promise 实例，这个 promise 的状态是根据什么来决定的？
   - 如果返回的内容是普通值（不是 promise，不是 throw Error） 都会走下一次的成功
   - 如果 onFulfilled onRejected 在执行过程中出错了，会走下一次 then 的失败
   - 如果返回的是一个 promise，会根据这个 promise 的状态来决定下一次 then 的状态
     - 如果返回的 promise 和当前 promise 是同一个，抛出循环报错
     - 如果是对象或者函数，会尝试调用 then 方法
       - 因为 then 方法中传递过来的可能还是一个 promise，所以需要递归调用 then 方法
       - 取 then 方法，不要多次使用 x.then()，因为可能 then 是一个 getter，调用后可能 then 的值就变了，拿到第一次 x.then 的结果，进行判断，然后 then.call 调用，不要多次取，两个 then 有可能是不一样的
       - 别人的 promise 可能多次 resolve，reject，且 then 方法写的有问题，所以需要判断是否是第一次调用，是第一次调用才 resolve 或 reject
   - then 的入参如果是空，onResolve 替换为 value => value 透传参数，onRejected 替换为 reason => throw reason，防止 then 方法中没有入参

```js[stage3.js]
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

function resolvePromise(x, promise2, resolve, reject) {
    // 用x 的值来决定promise2 是成功还是失败 (resolve,reject)
    if (x === promise2) {
        return reject(new TypeError('[TypeError: Chaining cycle detected for promise #<Promise>] error'))
    }
    // promise实例要么是对象要么是函数
    if ((typeof x === 'object' && x !== null) || (typeof x === 'function')) {
        let called = false
        try {
            let then = x.then;// 看是否有then方法
            if (typeof then === 'function') {
                // 不用每次都取值了,直接用上次取到的结果
                then.call(x, (y) => {  // 别人家的promise
                    if (called) return
                    called = true
                    resolvePromise(y,promise2,resolve,reject)
                }, (r) => {
                    if (called) return
                    called = true
                    reject(r)
                })
            } else {
                resolve(x); // {then:{}}  | {} | function
            }
        } catch (e) { // 别人家的promise
            if (called) return
            called = true
            reject(e); // 取值出错
        }
    } else { // 说明x是一个普通值
        resolve(x); // 普通值直接向下传递即可
    }
}

class Promise {
  constructor(executor) {
    this.state = PENDING;
    this.value = undefined;
    this.reason = undefined;
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];
    const resolve = (value) => {
      if (this.state === PENDING) {
        this.state = FULFILLED;
        this.value = value;
        this.onFulfilledCallbacks.forEach((fn) => fn());
      }
    };
    const reject = (reason) => {
      if (this.state === PENDING) {
        this.state = REJECTED;
        this.reason = reason;
        this.onRejectedCallbacks.forEach((fn) => fn());
      }
    };
    try {
      executor(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }
  then(onFulfilled, onRejected) {
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : v => v;
    onRejected = typeof onRejected === 'function' ? onRejected:(reason) => {
        throw reason
    }
    let promise2 = new Promise((resolve, reject) => {
      if (this.state === FULFILLED) {
        setTimeout(() => {
          try {
            let x = onFulfilled(this.value);
            resolvePromise(x, promise2, resolve, reject);
          } catch (error) {
            reject(error);
          }
        }, 0);
      }
      if (this.state === REJECTED) {
        setTimeout(() => {
          try {
            let x = onRejected(this.reason);
            resolvePromise(x, promise2, resolve, reject);
          } catch (error) {
            reject(error);
          }
        }, 0);
      }
      if (this.state === PENDING) {
        this.onFulfilledCallbacks.push(() => {
          setTimeout(() => {
            try {
              let x = onFulfilled(this.value);
              resolvePromise(x, promise2, resolve, reject);
            } catch (error) {
              reject(error);
            }
          }, 0);
        });
        this.onRejectedCallbacks.push(() => {
          setTimeout(() => {
            try {
              let x = onRejected(this.reason);
              resolvePromise(x, promise2, resolve, reject);
            } catch (error) {
              reject(error);
            }
          }, 0);
        });
      }
    });
    return promise2;
  }
}
```

## promise 常用方法

### Promise.resolve & reject

- resolve 的参数如果是一个 promise，会等待这个 promise 执行完，并把结果传递给下一个 then

```js[resolve.js]
Promise.resolve = function(value) {
    return new Promise((resolve, reject) => {
        resolve(value);
    });
}
```

- reject 不关心参数，直接 reject

```js[reject.js]
Promise.reject = function(reason) {
    return new Promise((resolve, reject) => {
        reject(reason);
    });
}
```

- resolve 方法为了配合 Promise.resolve 方法，需要处理参数是 promise 的情况，正常使用 resolve 的时候，也处理了这种情况

```js[promise.js]{50-52}
// 1. executor 立即执行，异步任务场景的处理，以及多次调用then方法，需要将回调函数存储起来
// 2. then方法链式回调
//
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

function resolvePromise(x, promise2, resolve, reject) {
    // 用x 的值来决定promise2 是成功还是失败 (resolve,reject)
    if (x === promise2) {
        return reject(new TypeError('[TypeError: Chaining cycle detected for promise #<Promise>] error'))
    }
    // promise实例要么是对象要么是函数
    if ((typeof x === 'object' && x !== null) || (typeof x === 'function')) {
        let called = false
        try {
            let then = x.then;// 看是否有then方法
            if (typeof then === 'function') {
                // 不用每次都取值了,直接用上次取到的结果
                then.call(x, (y) => {  // 别人家的promise
                    if (called) return
                    called = true
                    resolvePromise(y,promise2,resolve,reject)
                }, (r) => {
                    if (called) return
                    called = true
                    reject(r)
                })
            } else {
                resolve(x); // {then:{}}  | {} | function
            }
        } catch (e) { // 别人家的promise
            if (called) return
            called = true
            reject(e); // 取值出错
        }
    } else { // 说明x是一个普通值
        resolve(x); // 普通值直接向下传递即可
    }
}

class Promise {
  constructor(executor) {
    this.state = PENDING;
    this.value = undefined;
    this.reason = undefined;
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];
    const resolve = (value) => {
      if(value instanceof Promise){
        return value.then(resolve,reject)
      }
      if (this.state === PENDING) {
        this.state = FULFILLED;
        this.value = value;
        this.onFulfilledCallbacks.forEach((fn) => fn());
      }
    };
    const reject = (reason) => {
      if (this.state === PENDING) {
        this.state = REJECTED;
        this.reason = reason;
        this.onRejectedCallbacks.forEach((fn) => fn());
      }
    };
    try {
      executor(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }
  then(onFulfilled, onRejected) {
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : v => v;
    onRejected = typeof onRejected === 'function' ? onRejected:(reason) => {
        throw reason
    }
    let promise2 = new Promise((resolve, reject) => {
      if (this.state === FULFILLED) {
        setTimeout(() => {
          try {
            let x = onFulfilled(this.value);
            resolvePromise(x, promise2, resolve, reject);
          } catch (error) {
            reject(error);
          }
        }, 0);
      }
      if (this.state === REJECTED) {
        setTimeout(() => {
          try {
            let x = onRejected(this.reason);
            resolvePromise(x, promise2, resolve, reject);
          } catch (error) {
            reject(error);
          }
        }, 0);
      }
      if (this.state === PENDING) {
        this.onFulfilledCallbacks.push(() => {
          setTimeout(() => {
            try {
              let x = onFulfilled(this.value);
              resolvePromise(x, promise2, resolve, reject);
            } catch (error) {
              reject(error);
            }
          }, 0);
        });
        this.onRejectedCallbacks.push(() => {
          setTimeout(() => {
            try {
              let x = onRejected(this.reason);
              resolvePromise(x, promise2, resolve, reject);
            } catch (error) {
              reject(error);
            }
          }, 0);
        });
      }
    });
    return promise2;
  }
}

module.exports = Promise;

```

### catch

实际也就是一个语法糖

```js[catch.js]
Promise.catch = function(onRejected) {
    return this.then(null, onRejected);
}
```

### finally

- 提供一个“无论成功还是失败都要执行的收尾钩子
- 只在 原 Promise 已经 settled（fulfilled / rejected）后调用 onFinally
- onFinally 不接收 上一步的值/错，也无法篡改它
- 除非 onFinally 自己抛异常或返回一个 rejected Promise，否则最终链路会把 原来的结果 原封不动地传下去

```js[finally.js]
Promise.prototype.finally = function (callback) {
    return this.then(
        (value) => Promise.resolve(callback()).then(() => value),
        (reason) => Promise.resolve(callback()).then(() => { throw reason })
    )
}
```

### all

all 的参数是一个数组，数组中可以放 promise，也可以放普通值，返回的是一个 promise，这个 promise 的状态是根据数组中所有 promise 的状态来决定的,如果有任何一个失败，则返回的 promise 失败，如果都成功，则返回的 promise 成功

```js[all.js]
Promise.all = (promises) => {
  promises = promises.map((promise) => {
    if (promise instanceof Promise) {
      return promise;
    }
    return Promise.resolve(promise);
  });
  return new Promise((resolve, reject) => {
    let result = [];
    let count = 0;
    promises.forEach((promise, index) => {
      promise.then(
        (val) => {
          result[index] = val;
          count++;
          if (count === promises.length) {
            resolve(result);
          }
        },
        (err) => {
          reject(err);
        }
      );
    });
  });
};

module.exports = Promise;
```

### allSettled

allSettled 的参数是一个数组，数组中可以放 promise，也可以放普通值，返回的是一个 promise，这个 promise 的状态是根据数组中所有 promise 的状态来决定的，不管成功还是失败，都会返回一个数组，数组中是每个 promise 的结果

```js[allSettled.js]
Promise.allSettled = (promises) => {
  return new Promise((resolve, reject) => {
    let result = [];
    let count = 0;
    promises.forEach((promise, index) => {
      promise.then(
        (val) => {
          result[index] = { status: 'fulfilled', value: val };
          count++;
          if (count === promises.length) {
            resolve(result);
          }
        },
        (err) => {
          result[index] = { status: 'rejected', reason: err };
          count++;
          if (count === promises.length) {
            resolve(result);
          }
        }
      );
    });
  });
};
```

### race

race 的参数是一个数组，数组中可以放 promise，也可以放普通值，返回的是一个 promise，这个 promise 的状态是根据数组中第一个完成的 promise 的状态来决定的,不管成功还是失败，就返回这个结果

```js[race.js]
Promise.race = (promises) => {
    promises = promises.map((promise)=>{
        if(promise instanceof Promise){
            return promise
        }
        return Promise.resolve(promise)
    })
    return new Promise((resolve,reject)=>{
        promises.forEach((promise)=>{
            promise.then(resolve,reject)
        })
    })
}

```

#### 应用

- 超时处理

```js[timeout.js]
const withSetTimeout = (promise,timeout) => {
    return Promise.race([
        promise,
        new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(new Error('timeout'))
            }, timeout)
        })
    ])
}
const p = withSetTimeout(new Promise((resolve, reject) => {
    setTimeout(() => {
        resolve('success')
    }, 1000)
}), 500)
p.then((res) => {
    console.log(res)
}).catch((err) => {
    console.log(err)
})
```

- 手动取消

```js[cancel.js]
const withAbort = (promise) => {
    const {promise:p,resolve,reject} = Promise.withResolvers()
    const res = Promise.race([
        promise,
        p
    ])
    res.abort = reject
    return res
}
const promise = new Promise((resolve, reject) => {
    setTimeout(() => {
        resolve('success')
    }, 1000)
})
const p = withAbort(promise)

p.then((res) => {
    console.log(res)
}).catch((err) => {
    console.log(err)
})
setTimeout(() => {
    p.abort()
}, 100)
```

### any

any 的参数是一个数组，数组中可以放 promise，也可以放普通值，返回的是一个 promise，如果有任何一个成功，则返回的 promise 成功，如果都失败，返回一个 AggregateError 错误

```js[any.js]
Promise.any = (promises) => {
    promises = promises.map((promise)=>{
        if(promise instanceof Promise){
            return promise
        }
        return Promise.resolve(promise)
    })
    let len = promises.length
    return new Promise((resolve,reject)=>{
        let count = 0
        promises.forEach((promise)=>{
            promise.then((val)=>{
                resolve(val)
            },(err)=>{
                count++
                if(count === len){
                    reject(new Error('AggregateError'))
                }
            })
        })
    })
}
```

### try

```js[try.js]
是用于捕获代码内同步的错误并丢给 catch
Promise.try = function(fn) {
    return new Promise((resolve, reject) => {
        try {
            let result = fn();
            if (result instanceof Promise) {
                result.then(resolve, reject);
            } else {
                resolve(result);
            }
        } catch (error) {
            reject(error);
        }
    });
}
// sample:
Promise.try(() => {
    throw new Error('error')
}).catch((err) => {
    console.log(err)
})
```

### withResolvers

- 方便 resolve，reject 方法在 promise 外部调用

```js[withResolvers.js]
Promise.withResolvers = function() {
    let resolve, reject;
    return {
        promise: new Promise((resolve, reject) => {
            resolve = resolve;
            reject = reject;
        }),
        resolve,
        reject
    }
}
```

## promisify

> 将回调函数的形式转换为 promise 的形式

### 常见的手动封装方式

```js[commonjs.js]
const fs = require('fs')
const readFile = (path) => {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (err, data) => {
            if (err) reject(err)
            resolve(data)
        })
    })
}

readFile('test.txt').then((data) => {
    console.log(data)
}).catch((err) => {
    console.log(err)
})
```

### 统一处理回调函数 也是基于 node 的 api 风格的封装

```js[promiseify.js]
const fs = require('fs')

function promisify(fn) {
    return function(...args) {
        return new Promise((resolve, reject) => {
            fn(...args, (err, data) => {
                if (err) reject(err)
                resolve(data)
            })
        })
    }
}
const readFile = promisify(fs.readFile)
readFile('test.txt').then((data) => {
    console.log(data)
}).catch((err) => {
    console.log(err)
})
```
