---
{
  "title": "JSX 语法",
  "date": "2025-03-16",
  "description": "JSX是React中的一种语法扩展，允许在JavaScript中编写类似HTML的代码",
  "tag": ["React源码"],
  "recommend": 2,
}
---

# JSX 实现

## 什么是 JSX？

JSX 是 JavaScript 的一种语法扩展，既然是语法扩展，就意味着 JavaScript 语法本身是不支持 JSX 的,那么如何在浏览器中渲染 JSX 呢？打包工具（如 webpack）会使用转译工具（一般是 Babel）将 JSX 转换为函数调用

## JSX 语法基础

### 基本语法结构

这种混合了 JavaScript 和 HTML 的语法就是 JSX。在编译过程中，JSX 会被转换为普通的 JavaScript 函数调用，最终生成 React 元素。

```jsx [code.jsx]
const element = <h1>Hello, world!</h1>;
```

### 在 JSX 中嵌入表达式

你可以在 JSX 中使用花括号`{}`嵌入任何有效的 JavaScript 表达式：
:::code-group

```jsx [case1.jsx]
const name = "Josh Perez";
const element = <h1>Hello, {name}</h1>;
```

```jsx [case2.jsx]
const element = <img src={user.avatarUrl}></img>;
```

:::

### JSX 本身也是表达式

在编译后，JSX 表达式会被转为普通 JavaScript 对象，这意味着你可以在`if`语句和`for`循环中使用 JSX，将它赋值给变量，或者作为函数的参数和返回值：

```jsx
function getGreeting(user) {
  if (user) {
    return <h1>Hello, {formatName(user)}!</h1>;
  }
  return <h1>Hello, Stranger.</h1>;
}
```

## JSX 最佳实践

### 多行 JSX

对于多行 JSX 表达式，建议使用括号包裹以避免自动分号插入的陷阱：

:::code-group

```jsx [correct.jsx]
const element = (
  <div>
    <h1>Hello!</h1>
    <h2>Good to see you here.</h2>
  </div>
);
```

```jsx{3} [accidental.jsx]
// JavaScript解析器可能会在第一行的const element = <div>后自动插入一个分号
const element =
  <div>;
    <h1>Hello!</h1>
    <h2>Good to see you here.</h2>
  </div>
```

:::

### 标签必须闭合

JSX 要求标签必须正确闭合，自闭合标签必须以`/>`结尾：

```jsx
<img src="path/to/image.jpg" alt="Description" />
<input type="text" name="username" />
```

### className 而非 class

由于 JSX 是 JavaScript 的语法扩展，而`class`是 JavaScript 的保留字，所以在 JSX 中使用`className`来指定 CSS 类：

```jsx
<div className="container">Content here</div>
```

### htmlFor 而非 for

由于`for`是 JavaScript 的保留字，所以在 JSX 中 label 标签使用`htmlFor`来指定 HTML 的`for`属性：

```jsx
<label htmlFor="username">Username</label>
```

## React 中使用 JSX

### style 属性

在 React 中，`style`属性的值是一个 JavaScript 对象，而不是 HTML 的`style`属性。可以动态地设置样式属性。

```jsx
const element = (
  <div
    style={{
      color: "red",
      fontSize: "16px",
    }}
  >
    Hello
  </div>
);
```

### JavaScript 变量类型

- 字符串
- 数字
- null/undefined/布尔值不会被渲染

```jsx [example.jsx]
// 布尔值无论是什么，都不会被渲染，方便条件渲染
const flag = false;
const element = <div>{flag && "Hello"}</div>;
// 输出：
// <div></div>
```

- 数组-展开每一项

```jsx
<div>
  {["a", "b", "c"].map((item) => (
    <div key={item}>{item}</div>
  ))}
</div>
```

等同于

```jsx
<div>
  <div key="a">a</div>
  <div key="b">b</div>
  <div key="c">c</div>
</div>
```

### JSX 防注入攻击

`React DOM` 在渲染所有输入内容之前，默认会进行转义，这有助于防止 XSS（跨站脚本）攻击。

- 转义 是将输入内容中的特殊字符`（如 <, >, &）`转换为对应的 HTML 实体编码，使浏览器将其视为普通文本而非可执行代码。React 默认对所有动态内容进行转义，从根本上阻断 XSS 攻击的可能。
- 如果需要显示富文本（如用户输入的 HTML 内容），必须 显式告知 React 允许渲染原始 HTML，但需严格过滤内容以确保安全。使用 `dangerouslySetInnerHTML`

:::code-group

```jsx [transform.jsx]
// 用户输入恶意内容
const userInput = "<script>alert('XSS');</script>";

function App() {
  return <div>{userInput}</div>;
}

// 渲染后的 HTML：
// <div>&lt;script&gt;alert('XSS');&lt;/script&gt;</div>
```

```jsx [dangerous.jsx]
const sanitizedHTML = { __html: "<b>安全内容</b>" };

function App() {
  return <div dangerouslySetInnerHTML={sanitizedHTML} />;
}
```

:::

### JSX 转译

#### React17 之前的版本

Babel 会把 JSX 转译成`React.createElement()`函数调用：需要 `import React from 'react'`

```jsx
const element = (
  <h1 className="greeting">
    <div>Hello, world!</div>
    <div>Good to see you here.</div>
  </h1>
);
```

等价于：
[Babel 转译](https://babeljs.io/repl#?browsers=defaults%2C%20not%20ie%2011%2C%20not%20ie_mob%2011&build=&builtIns=false&corejs=3.21&spec=false&loose=false&code_lz=MYewdgzgLgBApgGzgWzmWBeGAKAUDGAHgAsBGGYBAQwggDkrUMAiAcwCc44oBLMV5gD58BIgBMeAN0EAJRAhAAaGAHcQ7BGICEhAPQTpIgoQOCA4iBBiYUEDAhcYATxABXGMTicAdHtMi9MmEASgBuIA&debug=false&forceAllTransforms=false&modules=false&shippedProposals=false&evaluate=false&fileSize=false&timeTravel=false&sourceType=module&lineWrap=true&presets=env%2Creact%2Cstage-2&prettier=false&targets=&version=7.26.9&externalPlugins=&assumptions=%7B%7D)

```javascript
// 第一个参数是标签名，第二个参数是属性对象，后续参数是子节点
const element = React.createElement(
  "h1",
  {
    className: "greeting",
  },
  React.createElement("div", null, "Hello, world!"),
  React.createElement("div", null, "Good to see you here.")
);
```

`React.createElement()`会创建一个类似下面的对象（称为“React 元素”）：虚拟 DOM 对象

```js
// 注意：这是简化过的结构
const element = {
  type: "h1",
  props: {
    className: "greeting",
    children: [
      { type: "div", props: { children: "Hello, world!" } },
      { type: "div", props: { children: "Good to see you here." } },
    ],
  },
  key: null,
  ref: null,
};
```

#### React17 及之后的版本

[React17 新的 JSX 转换](https://zh-hans.legacy.reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html)

- **解耦 React 全局依赖**：不再需要手动导入 React。在旧版转换中，即使你没有直接使用 `React` 变量，也必须导入它，因为 JSX 会被转换为 `React.createElement` 调用。新的转换自动从 `react/jsx-runtime` 导入所需函数，无需显式导入 React。

- **打包体积优化**：新的实现减少了些许打包体积

- **函数参数**：子元素作为`props.children`传递，第三个参数提取`props.key`

```js
// 用户编写的 JSX
function App() {
  return (
    <div key="key" ref="ref">
      <div>Hello World</div>
      <div>Good to see you here.</div>
    </div>
  );
}

// Babel 转换后的代码（React 17+）
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function App() {
  return _jsxs(
    "div",
    {
      ref: "ref",
      children: [
        _jsx("div", {
          children: "Hello World",
        }),
        _jsx("div", {
          children: "Good to see you here.",
        }),
      ],
    },
    "key"
  );
}
```

## 手写 JSX 转换函数

函数的封装
:::code-group

```javascript [createElement.js]
const REACT_ELEMENT = Symbol("react.element");

const excludeProps = ["key", "ref", "__self", "__source"];

function createElement(type, props, ...children) {
  props = props || {};
  let ref = props.ref || null;
  let key = props.key || null;

  excludeProps.forEach((key) => {
    delete props[key];
  });
  props.children = null;
  if (children?.length >= 1) {
    props.children = children.map((child) => child);
  }
  return {
    $$typeof: REACT_ELEMENT,
    type,
    props,
    key,
    ref,
  };
}
```

```javascript [jsx.js]
function jsx(type, config, key) {}
```

:::

## 总结

JSX 是 React 的核心部分，它简化了 UI 组件的创建和维护。通过将标记语法和 JavaScript 逻辑结合，JSX 使得 React 组件的开发变得更加直观和高效。
