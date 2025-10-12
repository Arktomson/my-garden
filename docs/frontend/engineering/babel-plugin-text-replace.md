---
description: 讲解 babel 插件的实战例子
tags: ['工程化']
sticky: 2
---

# babel 插件的实战-不同环境下文案的 diff

## 背景

老项目`(react+webpack)`中现有大量涉及到租户环境称谓的说明文案，对于不同的租户环境，需要做文案关键词的替换。例如：

```javascript
let name = 'A公司';

if (condition) {
  name = 'B公司';
}

const welcomeText = `你好，${name}，欢迎使用我们的产品`;
```

## 解决方案

### 常规

将文案全局替换规则保存在全局 `store` 中，比如 `zustand`，`dva 的 model` 等，写一个公共 `util` 方法处理
对各处文案所在的位置包裹 util 函数处理，很繁琐，后续如果有其他地方需要替换，还需要一个一个加

### 使用 react-intl 等 i18n 库

文案关键词替换和所有文案都要做国际化的场景还是不太一样，项目之前没接入过国际化相关，有点杀鸡用牛刀的感觉，且各处文案都要先找出来再每个文案写不同租户的配置，还是比较繁琐

### 劫持 React.createElement

- 性能浪费，所有节点都增加这个字符串替换的判断逻辑，，直接影响生产环境
- 项目使用 react16 版本，后续如果升级到 17，jsx 实现函数还得再写
- 不可控性，比较 hack 的方式

### 工程化

- 完全的编译时处理，构建时进行替换，没有运行时开销
- 一处定义，全局生效

#### webpakc loader

- 简单粗暴，字符串 replace，没有上下文信息，不方便拓展，容易误伤导致意外的结果，

#### babel plugin

- AST 级别的精确替换，兼容性好(可增加各种逻辑)，扩展性强(同一套源码，编译成多个版本（多语言、灰度等）)

### 实现

`采用 babel-plugin 的方式进行工程化实现`

实现流程

- [ ] 编写 util 函数实现字符串替换的业务逻辑
- [ ] 对可能的 AST 节点包裹 util 函数调用，比如`JSX`，`JSXElement`，`StringLiteral`等
- [ ] 对文件增加导入 util 函数的 import 语句

测试代码如下

```javascript
const Comp = ({ text }) => {
  return <div>{text}</div>;
};

function bar(text: string = ''): string {
  return text + '25';
}

export default function AliasText() {
  const t = '变量1';
  const s = '1';
  const p = `测试2`;
  const g = `测试3${'测试3-1'}-${t}`;
  const g1 = `${'测试3-1'}${t}`;
  const g2 = `开${'测试3-1-1'}`;
  const g3 = `${'测试3-1-1'}开`;
  const g4 = `开`;
  const g5 = ``;
  const g6 = `${bar('测试3-1-1')}`;
  const g7 = `${bar()}`;
  const g8 = `1${'卡'}${'1'}-${'西安'}12${'12'}`;
  const k = 'hello world';

  const arr = ['测试4', '测试5'];
  const obj = {
    a: '测试6',
  };
  return (
    <div>
      <div>测试1</div>
      <div>"测试1-1"</div>
      <div>{'测试2'}</div>
      <Comp text="测试3" />
      {bar('测试4')}
      {`测试6` + '测试7' + `测试8` + '测试9'}
      {arr}
      {obj.a}
    </div>
  );
}
```

#### AST 节点分析

根据上面的测试代码，总共三种 AST 要处理

- `StringLiteral` - 最普通的字符串常量
- `JSXText` - JSX 中的文本节点
- `TemplateLiteral` - 模板字符串

##### StringLiteral

核心在于 StringLiteral 节点替换为函数调用的 CallExpression 节点

需要注意的两个点

- 如果是作为组件的 `props` 值，需要特殊处理，包裹一层`JSXExpressionContainer`节点，否则会影响到组件的解析
- 替换成`CallExpression`节点后，由于 babel 会继续向下进行子节点的遍历，我们新建的`CallExpression`节点调用入参还是`StringLiteral`节点，又会触发一遍替换，所以需要判断是否已经处理过，避免无限递归，可以用 `path.skip()`跳过后续的遍历，不过这样如果有其他插件写了后续遍历到的 `AST` 类型的 `visitor` 就会被跳过，而且当前插件的其他 `visitor` 也会被跳过,所以还是前置条件判断 return 退出当前节点，不影响后续子节点处理的方式比较合适，详见代码

```ts
import type { PluginObj, PluginPass } from '@babel/core';
import type { NodePath } from '@babel/traverse';
import type { StringLiteral } from '@babel/types';

const canMatchStrCNReplace = (value: string, replaceFunName: string) => {
  if (!value) return false;

  return value.match(/[^\x00-\xff]/);
};

export default function (
  babel: typeof import('@babel/core'),
  options: {
    replaceFunName: string;
  }
): PluginObj {
  const { replaceFunName } = options;
  const { template, types } = babel;
  return {
    name: 'babel-plugin-alias-transform',
    visitor: {
      StringLiteral(path: NodePath<StringLiteral>, state: PluginPass) {
        const value = path.node.value;
        const parent = path.parentPath;

        if (canMatchStrCNReplace(value, replaceFunName)) {
          return;
        }
        // 判断是否已经处理过，退出当前节点，不影响后续子节点处理
        if (
          types.isCallExpression(parent?.node) &&
          types.isIdentifier(parent.node.callee, { name: replaceFunName })
        ) {
          return;
        }
        const callFn = template.expression(`${replaceFunName}(%%value%%)`)({
          value: types.stringLiteral(value),
        });

        // 对父节点是JSXAttribute的特殊处理
        if (path.parentPath?.isJSXAttribute()) {
          path.replaceWith(types.jsxExpressionContainer(callFn));
          return;
        }

        // path.skip()直接跳过后续子节点的遍历，不推荐
        path.replaceWith(callFn);
      },
    },
  };
}
```

##### JSXText

这个就比较简单了，外层固定包裹一层`JSXExpressionContainer`节点，然后替换为`CallExpression`节点

```js
import type { PluginObj, PluginPass } from '@babel/core';
import type { NodePath } from '@babel/traverse';
import type { JSXText, StringLiteral } from '@babel/types';

const canMatchStrCNReplace = (value: string, replaceFunName: string) => {
  if (!value) return false;

  return value.match(/[^\x00-\xff]/);
};

export default function (
  babel: typeof import('@babel/core'),
  options: {
    replaceFunName: string;
  }
): PluginObj {
  const { replaceFunName } = options;
  const { template, types } = babel;
  return {
    name: 'babel-plugin-alias-transform',
    visitor: {
      JSXText(path: NodePath<JSXText>, state: PluginPass) {
        const value = path.node.value;
        if (!canMatchStrCNReplace(value, replaceFunName)) {
          return;
        }
        const callFn = template.expression(`${replaceFunName}(%%value%%)`)({
          value: types.stringLiteral(value),
        });
        path.replaceWith(types.jsxExpressionContainer(callFn));
      },
    },
  };
}

```

##### TemplateLiteral

首先要了解模版字符串的 AST 结构 [示例](https://astexplorer.net/#/gist/5fae7e2700d956c6f12f92f523933c05/f9f9fd5463a75f525ca3b5044aee8679df1a995b)

`expressions` 数组就是模板变量

`quasis` 数组就是模板字符串

特点：`expressions` 节点一定数量等于 `quasis` 节点数量 - 1

```js
const a = `j${a}${b}cd${x}dd${p}`
// 内部是这样交替拼接的 模板变量之间、模板字符串开头和结尾如果不是字符串会补空串
// 这样就可以确定模板变量和模板字符串渲染的顺序了
= quasi[0] + a + quasi[1] + b +  quasi[2] + x + quasi[3] + p + quasi[4]
= 'j' + a + '' + b + 'cd' + x + 'dd' + p + ''


// 想象如果没有首尾的 quasi...

// ❌ 错误结构（无法确定起始位置）
expressions: [a, b]
quasis: [mid]

// 应该怎么显示？
`${a}${b}mid` ❌ 不知道从哪里开始
`mid${a}${b}` ❌ 顺序错了
`${a}mid${b}` ✅ 但缺少首尾信息

// ✅ 正确结构（有明确的首尾）
quasis: ['', 'mid', '']    // 首尾都有，即使是空字符串
expressions: [a, b]
```

实现

- 对于 `expressions` 其中可能存在 `StringLiteral` 节点，这个之前已经处理过了

- 对于 `quasis` 需要将其变成 `expressions` 节点 \`中文${a}\` 需要变成 \`${fnCall("中文")}${a}\`

- 为了保证顺序，需要遍历 重新构造 `quasis` 和 `expressions` 数组结构，最后替换原来的 `TemplateLiteral` 节点

- 实现：循环 `quasis` 数组，如果需要替换，就增加 `expression` 节点，然后前后增加空字符串的 quasis 节点(如果是当前是最后一个 quasis 节点，后方的 `quasis` 节点注意 `tail` 应该为 `true`)，否则直接增加 原有 `quasis` 节点即可。然后正常增加原有的 `expression` 到新的 `expressions` 数组中即可。全局 `mutated` 变量标记是否替换过，因为替换的话最后会生成新 `templateLiteral` 节点，需要避免死循环

```js
import type { PluginObj, PluginPass, types } from '@babel/core';
import type { NodePath } from '@babel/traverse';
import type {
  JSXText,
  StringLiteral,
  TemplateElement,
  TemplateLiteral,
} from '@babel/types';

const canMatchStrCNReplace = (value: string) => {
  if (!value) return false;

  return value.match(/[^\x00-\xff]/);
};

export default function (
  babel: typeof import('@babel/core'),
  options: {
    replaceFunName: string;
  }
): PluginObj {
  const { replaceFunName } = options;
  const { template, types } = babel;
  let cnt = 1;
  return {
    name: 'babel-plugin-alias-transform',
    visitor: {
      TemplateLiteral(path) {
        const exprs = path.get('expressions');
        const quasis = path.get('quasis');

        const nextQuasis: types.TemplateElement[] = [];
        const nextExprs: types.Expression[] = [];
        let mutated = false;

        quasis.forEach((quasiPath, idx) => {
          const cooked = quasiPath.node.value.cooked ?? '';
          const tail = quasiPath.node.tail;

          if (cooked && canMatchStrCNReplace(cooked)) {
            mutated = true;
            nextQuasis.push(
              types.templateElement({ raw: '', cooked: '' }, false),
              types.templateElement({ raw: '', cooked: '' }, tail)
            );
            nextExprs.push(
              template.expression(`${replaceFunName}(%%value%%)`)({
                value: types.stringLiteral(cooked),
              })
            );
          } else {
            nextQuasis.push(quasiPath.node);
          }

          if (idx < exprs.length) {
            const exprPath = exprs[idx];
            if (!exprPath || !exprPath.isExpression()) return;
            nextExprs.push(exprPath.node);
          }
        });

        if (!mutated) return;

        path.replaceWith(types.templateLiteral(nextQuasis, nextExprs));
      },
    },
  };
}

```

#### util 函数的 auto import

使用到 `visitor` 函数 的第二个参数，可以在上下文之间流转 `state`
，在先前的 `visitor` 中如果发生了替换就更改 `state` 状态，然后使用 `Program` 这个 `visitor` 在 `exit` 的时候判断 `state` 状态，如果已经发生替换就加入 `import` 语句

完整实现

```ts
import type { PluginObj, PluginPass } from '@babel/core';
import type { NodePath } from '@babel/traverse';
import type {
  JSXText,
  Expression,
  StringLiteral,
  TemplateElement,
} from '@babel/types';

const canMatchStrCNReplace = (value: string) => {
  if (!value) return false;

  return value.match(/[^\x00-\xff]/);
};

interface PluginState extends PluginPass {
  alreadyHasTransformed: boolean;
}
export default function (
  babel: typeof import('@babel/core'),
  options: {
    replaceFunName: string;
    importStatement?: string;
  }
): PluginObj<PluginState> {
  const { replaceFunName, importStatement } = options;
  const { template, types } = babel;

  return {
    name: 'babel-plugin-alias-transform',
    visitor: {
      Program: {
        exit(path, state) {
          if (state.alreadyHasTransformed && importStatement) {
            path.node.body.unshift(template.statement(importStatement)());
          }
        },
      },
      StringLiteral(path: NodePath<StringLiteral>, state) {
        const value = path.node.value;
        const parent = path.parentPath;

        if (!canMatchStrCNReplace(value)) {
          return;
        }
        // 判断是否已经处理过
        if (
          types.isCallExpression(parent?.node) &&
          types.isIdentifier(parent.node.callee, { name: replaceFunName })
        ) {
          return;
        }
        const callFn = template.expression(`${replaceFunName}(%%value%%)`)({
          value: types.stringLiteral(value),
        });

        // 对父节点是JSXAttribute的特殊处理
        if (path.parentPath?.isJSXAttribute()) {
          path.replaceWith(types.jsxExpressionContainer(callFn));
          state.alreadyHasTransformed = true;
          return;
        }

        // path.skip()
        path.replaceWith(callFn);
        state.alreadyHasTransformed = true;
      },
      JSXText(path: NodePath<JSXText>, state) {
        const value = path.node.value;
        if (!canMatchStrCNReplace(value)) {
          return;
        }
        const callFn = template.expression(`${replaceFunName}(%%value%%)`)({
          value: types.stringLiteral(value),
        });

        path.replaceWith(types.jsxExpressionContainer(callFn));
        state.alreadyHasTransformed = true;
      },
      TemplateLiteral(path, state) {
        const exprs = path.get('expressions');
        const quasis = path.get('quasis');

        const nextQuasis: TemplateElement[] = [];
        const nextExprs: Expression[] = [];
        let mutated = false;

        quasis.forEach((quasiPath, idx) => {
          const cooked = quasiPath.node.value.cooked ?? '';
          const tail = quasiPath.node.tail;

          if (cooked && canMatchStrCNReplace(cooked)) {
            mutated = true;
            nextQuasis.push(
              types.templateElement({ raw: '', cooked: '' }, false),
              types.templateElement({ raw: '', cooked: '' }, tail)
            );
            nextExprs.push(
              template.expression(`${replaceFunName}(%%value%%)`)({
                value: types.stringLiteral(cooked),
              })
            );
          } else {
            nextQuasis.push(quasiPath.node);
          }

          if (idx < exprs.length) {
            const exprPath = exprs[idx];
            if (!exprPath || !exprPath.isExpression()) return;
            nextExprs.push(exprPath.node);
          }
        });

        if (!mutated) return;

        path.replaceWith(types.templateLiteral(nextQuasis, nextExprs));
        state.alreadyHasTransformed = true;
      },
    },
  };
}
```

#### 效果一览

上面给的测试代码转换后的效果

```ts
import { strReplace } from '@utils/strReplace';
const Comp = ({ text }) => {
  return <div>{text}</div>;
};
function bar(text = '') {
  return text + '25';
}
export default function AliasText() {
  const t = strReplace('变量1');
  const s = '1';
  const p = `${strReplace('测试2')}`;
  const g = `${strReplace('测试3')}${strReplace('测试3-1')}-${t}`;
  const g1 = `${strReplace('测试3-1')}${t}`;
  const g2 = `${strReplace('开')}${strReplace('测试3-1-1')}`;
  const g3 = `${strReplace('测试3-1-1')}${strReplace('开')}`;
  const g4 = `${strReplace('开')}`;
  const g5 = ``;
  const g6 = `${bar(strReplace('测试3-1-1'))}`;
  const g7 = `${bar()}`;
  const g8 = `1${strReplace('卡')}${'1'}-${strReplace('西安')}12${'12'}`;
  const k = 'hello world';
  const arr = [strReplace('测试4'), strReplace('测试5')];
  const obj = {
    a: strReplace('测试6'),
  };
  return (
    <div>
      <div>{strReplace('测试1')}</div>
      <div>{strReplace('"测试1-1"')}</div>
      <div>{strReplace('测试2')}</div>
      <Comp text={strReplace('测试3')} />
      {bar(strReplace('测试4'))}
      {`${strReplace('测试6')}` +
        strReplace('测试7') +
        `${strReplace('测试8')}` +
        strReplace('测试9')}
      {arr}
      {obj.a}
    </div>
  );
}
```
