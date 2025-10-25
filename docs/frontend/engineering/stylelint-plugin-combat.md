---
description: stylelint插件实战
tags: ['工程化']
sticky: 3
---

# stylelint插件实战
## 插件编写上手

### 插件的基本结构

一个标准的 Stylelint 插件由以下几部分组成：

```typescript
import stylelint from 'stylelint';

const ruleName = 'plugin-namespace/rule-name';
const messages = stylelint.utils.ruleMessages(ruleName, {
  expected: (unfixed, fixed) => `Expected "${unfixed}" to be "${fixed}"`,
  rejected: (value) => `Unexpected value "${value}"`,
});

const meta = {
  url: 'https://example.com/rule-docs',  // 规则文档链接
  fixable: true,  // 是否支持自动修复
  deprecated: false,  // 是否已废弃
};

const ruleFunction = (primaryOption, secondaryOptions, context) => {
  return (root, result) => {
    // 规则实现逻辑
  };
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

export default stylelint.createPlugin(ruleName, ruleFunction);
```

### 核心 API 和参数详解

#### 1. `stylelint.createPlugin(ruleName, ruleFunction)`

创建插件的工厂函数。

**参数：**
- `ruleName` (string): 插件规则名称，格式为 `命名空间/规则名`，例如 `my-company/no-internal-url`
- `ruleFunction` (function): 规则实现函数

**返回值：** 插件对象，包含 `ruleName` 和 `rule` 属性

#### 2. `ruleFunction(primaryOption, secondaryOptions, context)`

规则函数，接收配置参数并返回实际的检查函数。

**参数：**

- **`primaryOption`** (any): 主选项
  - 可以是布尔值、字符串、数组、对象等
  - 用于启用/禁用规则或传递主要配置
  - 示例：`true`、`"always"`、`["a", "b"]`、`{ max: 16 }`

- **`secondaryOptions`** (object | undefined): 次要选项
  - 可选的配置对象
  - 用于提供额外的配置参数
  - 常见属性：
    - `ignore`: 忽略某些情况的数组
    - `severity`: 严重级别（`"warning"` 或 `"error"`）
    - 其他自定义配置

- **`context`** (object): 上下文对象
  - `fix` (boolean): 是否处于自动修复模式（`stylelint --fix`）
  - `newline`: 当前系统的换行符

**返回值：** 返回一个函数 `(root, result) => void`

**三个参数的使用示例：**

```typescript
const ruleFunction = (primaryOption, secondaryOptions, context) => {
  return (root, result) => {
    // 1. primaryOption - 主选项，控制规则的主要行为
    if (primaryOption === true) {
      console.log('规则已启用');
    } else if (primaryOption === 'always') {
      console.log('规则模式: always');
    } else if (Array.isArray(primaryOption)) {
      console.log('允许的值列表:', primaryOption); // ["red", "blue"]
    }

    // 2. secondaryOptions - 次要选项，提供额外配置
    const minSize = secondaryOptions?.min || 12;
    const ignoreList = secondaryOptions?.ignore || [];
    console.log('最小值:', minSize);
    console.log('忽略列表:', ignoreList);

    // 3. context - 上下文对象，获取运行时信息
    const isFixing = context?.fix;
    const newline = context?.newline;
    
    if (isFixing) {
      console.log('当前处于自动修复模式');
      // 可以修改 AST 节点
    } else {
      console.log('当前处于检查模式');
      // 只报告错误，不修改
    }
  };
};
```

**配置文件对应关系：**

```json
{
  "rules": {
    // 情况1：只有一个参数（只有 primaryOption）
    "my-plugin/my-rule": true,
    //                   ↑
    //                   └─ primaryOption (secondaryOptions 为 undefined)
    
    // 情况2：两个参数（primaryOption + secondaryOptions）
    "my-plugin/my-rule": [true, { "min": 12, "ignore": ["rem"] }],
    //                    ↑      ↑
    //                    |      └─ secondaryOptions
    //                    └──────── primaryOption
    
    // 情况3：primaryOption 可以是其他类型
    "my-plugin/my-rule": "always",  // 字符串
    "my-plugin/my-rule": { "max": 16 }  // 对象
  }
}
```

**运行命令对应关系：**

```bash
# 普通检查模式：context.fix = false
stylelint "**/*.css"

# 自动修复模式：context.fix = true
stylelint "**/*.css" --fix
```


#### 3. 检查函数 `(root, result)`

实际执行样式检查的函数。

**参数：**

- **`root`** (PostCSS Root): 就是PostCSS([PostCSS插件编写](https://postcss.org/docs/writing-a-postcss-plugin)) 解析后的 AST 根节点，[AST 可视化工具](https://astexplorer.net/#/gist/18f9295b6ab2706d600baa81ab086caa/447bc242cbca50d8ba29808cd8992753b7c19467)
  - 代表整个 CSS 文件的抽象语法树
  - CSS AST 有 5 种节点类型：
    - **Root**: 根节点，代表整个 CSS 文件
    - **AtRule**: At-规则节点（`@media`、`@import`、`@keyframes` 等）
    - **Rule**: 规则节点（选择器 + 声明块）
    - **Declaration**: 声明节点（属性-值对，如 `color: red`）
    - **Comment**: 注释节点
  - 常用遍历方法：[PostCSS API](https://postcss.org/api/#root)
    - `root.walkRules(callback)`: 遍历所有 Rule 节点
    - `root.walkDecls(callback)`: 遍历所有 Declaration 节点
    - `root.walkAtRules(callback)`: 遍历所有 AtRule 节点
    - `root.walkComments(callback)`: 遍历所有 Comment 节点
    - `root.walk(callback)`: 遍历所有节点

- **`result`** (PostCSS Result): 结果对象
  - 用于收集检查结果和报告问题
  - 重要属性：
    - `result.stylelint`: Stylelint 特定的结果对象
  - 重要方法：
    - `stylelint.utils.report()`: 报告错误

#### 4. `meta` 元数据对象

提供规则的元数据信息，用于文档生成和工具集成。

**属性：**

- **`url`** (string): 规则文档的 URL 地址
  - 用户可以通过这个链接查看详细的规则说明
  - 通常指向 GitHub 仓库或文档站点

- **`fixable`** (boolean): 是否支持自动修复
  - `true`: 规则支持 `--fix` 自动修复
  - `false`: 规则只能检测问题，不能自动修复

- **`deprecated`** (boolean): 是否已废弃
  - `true`: 规则已废弃，不建议使用
  - `false`: 规则正常可用

**示例：**

```typescript
const meta = {
  url: 'https://github.com/your-org/stylelint-plugin/blob/main/docs/rules/no-small-font.md',
  fixable: true,
  deprecated: false,
};

ruleFunction.meta = meta;
```


#### 5. `stylelint.utils.report(options)`

报告 lint 错误或警告。

**参数对象 options：**

```typescript
{
  message: string;        // 错误消息，通常从 messages 对象获取
  node: PostCSS.Node;    // 出错的 AST 节点
  result: PostCSS.Result; // result 对象
  word?: string;         // 高亮的具体单词（可选）
  index?: number;        // 错误在节点中的起始位置（可选）
  endIndex?: number;     // 错误在节点中的结束位置（可选）
  line?: number;         // 行号（可选，通常从 node 获取）
  ruleName: string;      // 规则名称
}
```

#### 6. `stylelint.utils.ruleMessages(ruleName, messages)`

创建规则消息对象的工具函数。

**参数：**
- `ruleName` (string): 规则名称
- `messages` (object): 消息模板对象，键为消息类型，值为消息生成函数

**示例：**

```typescript
const messages = stylelint.utils.ruleMessages(ruleName, {
  expected: (unfixed, fixed) => `Expected "${unfixed}" to be "${fixed}"`,
  rejected: (pattern) => `Unexpected pattern "${pattern}"`,
});
```

<!-- #### 7. PostCSS 节点类型

在检查函数中会遇到的主要节点类型：

- **Declaration (decl)**: CSS 声明（属性-值对）
  - `decl.prop`: 属性名，如 `font-size`
  - `decl.value`: 属性值，如 `16px`
  - `decl.important`: 是否有 `!important`
  - `decl.parent`: 父节点（通常是 Rule）

- **Rule**: CSS 规则（选择器块）
  - `rule.selector`: 选择器字符串
  - `rule.nodes`: 子节点数组（通常是声明）

- **AtRule**: At-规则（如 `@media`、`@font-face`）
  - `atrule.name`: at-rule 名称（如 `media`、`font-face`）
  - `atrule.params`: 参数字符串

- **Comment**: 注释节点
  - `comment.text`: 注释文本

**节点通用属性：**
- `node.type`: 节点类型（`'decl'`、`'rule'`、`'atrule'`、`'comment'` 等）
- `node.source`: 源码位置信息
  - `node.source.start.line`: 起始行号
  - `node.source.start.column`: 起始列号
  - `node.source.end`: 结束位置信息
- `node.parent`: 父节点
- `node.toString()`: 节点转为字符串 -->

#### 7. 验证工具函数

Stylelint 提供了验证选项的工具函数：

```typescript
import { validateOptions } from 'stylelint/lib/utils';

// 在 ruleFunction 返回的函数内验证选项
const isValidOptions = stylelint.utils.validateOptions(result, ruleName, {
  actual: primaryOption,
  possible: [true, false], // 或使用验证函数
});

if (!isValidOptions) {
  return;
}
```

**validateOptions 参数：**
- `result`: PostCSS Result 对象
- `ruleName`: 规则名称
- `options`: 验证配置对象（可以传多个）
  - `actual`: 实际接收到的选项值
  - `possible`: 可能的合法值（数组或验证函数）
  - `optional`: 是否可选（默认 false）

**验证次要选项示例：**

```typescript
const isValidOptions = stylelint.utils.validateOptions(
  result,
  ruleName,
  {
    actual: primaryOption,
    possible: [true, false],
  },
  {
    actual: secondaryOptions,
    possible: {
      min: (value) => typeof value === 'number' && value > 0,
      allowedList: (value) => Array.isArray(value),
    },
    optional: true,
  }
);
```

### 常用工具库

在编写 Stylelint 插件时，这些工具库会很有帮助：

- **`postcss-value-parser`**: 解析 CSS 属性值，特别是 `url()`、`calc()` 等函数
- **`postcss-selector-parser`**: 解析 CSS 选择器
- **`postcss-media-query-parser`**: 解析媒体查询

**使用示例：**

```typescript
import valueParser from 'postcss-value-parser';
import selectorParser from 'postcss-selector-parser';
import mediaQueryParser from 'postcss-media-query-parser';

// 1. 使用 postcss-value-parser 解析属性值
root.walkDecls((decl) => {
  const parsed = valueParser(decl.value);
  
  parsed.walk((node) => {
    // 提取 url() 函数中的 URL
    if (node.type === 'function' && node.value === 'url') {
      const urlNode = node.nodes[0];
      console.log('URL:', urlNode.value);
    }
    
    // 提取 calc() 函数中的表达式
    if (node.type === 'function' && node.value === 'calc') {
      console.log('Calc expression:', valueParser.stringify(node.nodes));
    }
  });
});

// 2. 使用 postcss-selector-parser 解析选择器
root.walkRules((rule) => {
  selectorParser((selectors) => {
    selectors.walkClasses((classNode) => {
      console.log('类名:', classNode.value);
    });
    
    selectors.walkIds((idNode) => {
      console.log('ID:', idNode.value);
    });
    
    selectors.walkPseudos((pseudoNode) => {
      console.log('伪类/伪元素:', pseudoNode.value);
    });
  }).processSync(rule.selector);
});

// 3. 使用 postcss-media-query-parser 解析媒体查询
root.walkAtRules('media', (atRule) => {
  const mediaQuery = mediaQueryParser(atRule.params);
  
  mediaQuery.each((query) => {
    console.log('媒体类型:', query.type);
    query.each((expression) => {
      console.log('特性:', expression.feature);
      console.log('值:', expression.value);
    });
  });
});
```

## 外网url检测

> 背景是有次项目发版的时候字体文件的url在内网图床上传后没有使用外网地址，而是使用了内网url，导致了字体文件的加载问题

### 思路

无论是普通的rule还是字体这种AtRule，他们的属性都是decl，都可通过walkDecls遍历到，然后判断value是否具有内网的url特征即可

### 实现

```js
const stylelint = require('stylelint');
const { RULE_PREFIX } = require('../../constant/index');
const {
  createPlugin,
  utils: { report, ruleMessages, validateOptions },
} = stylelint;

const ruleName = `${RULE_PREFIX}/danger-url`;

const messages = ruleMessages(ruleName, {
  rejected: key => `danger url part "${key}"`,
});

const meta = {
  fixable: false,
};
const exclude = ['-office', 'g.alipay.com'];

const ruleFunction = (primary, options) => {
  return (root, result) => {
    const validOptions = validateOptions(result, ruleName, {
      actual: primary,
      // 任何值
      possible: [true],
    });

    if (!validOptions) return;

    root.walkDecls(decl => {
      const { value } = decl;
      // 遍历decl进行判断即可
      exclude.forEach(item => {
        if (value.includes(item)) {
          report({
            node: decl,
            result,
            ruleName,
            message: messages.rejected(item),
          });
        }
      });
    });
  };
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

module.exports = createPlugin(ruleName, ruleFunction);


```
## 字体大小检测拦截


> 太大的字体文件(小几十mb)会影响页面首屏加载速度，也会导致页面文字加载跳变，明显影响用户体验，设计给字体的时候不会注意这点，开发同学也没有统一规范，所以经常会使用了大字体，后续进行返工修改，所以使用lint强制检查字体大小

### 思路

遍历font-face节点的AtRule，需要发送网络请求获取字体文件大小，然后判断是否超过限制

* `HEAD` 请求是获取文件大小的最佳方法，因为它只获取`响应头`，不下载文件内容，拿到`Content-Length`即可
* 因为需要发送网络请求，且一个文件可能了使用多个font-face规则，注意stylelint插件函数的`异步处理`，操作必须在函数执行结束之前完成，不能有`延迟`的异步处理

### 实现
::: code-group
```js [index.js]
const stylelint = require('stylelint');
const { RULE_PREFIX } = require('../../constant/index');
const {
  createPlugin,
  utils: { report, ruleMessages, validateOptions },
} = stylelint;
const {
  extractUrl,
  getFileSize,
  getMB,
} = require('../../utils/index');
const ruleName = `${RULE_PREFIX}/font-size-limit`;

const messages = ruleMessages(ruleName, {
  rejected: (limit, size) =>
    `beyond limit size ${limit},current size is ${size}`,
});

const meta = {
  fixable: false,
};
// unit: MB
const defaultLimit = 2;

const ruleFunction = (primary, limit) => {
  return async (root, result) => {
    const validOptions = validateOptions(
      result,
      ruleName,
      {
        actual: primary,
        possible: [true],
      },
      {
        actual: limit,
        possible: value =>
          typeof value === 'number' && !isNaN(value),
        optional: true,
      }
    );
    if (!validOptions) return;
    const limitSize = limit ? limit : defaultLimit;
    const task = [];
    root.walkAtRules('font-face', atRule => {
      const { value } =
        atRule.nodes.find(node => node.prop === 'src') ||
        {};
      // 提取字体文件url
      const urls = extractUrl(value)?.[0];
      // 包装成异步任务
      task.push(
        (async () => {
          const size = await getFileSize(urls);
          const sizeMB = getMB(size);
          if (sizeMB > limitSize) {
            report({
              result,
              ruleName,
              message: messages.rejected(limitSize, sizeMB),
              node: atRule,
            });
          }
        })()
      );
    });
    // 使用Promise.all等待所有任务完成
    await Promise.all(task);
  };
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

module.exports = createPlugin(ruleName, ruleFunction);

```

```js [util.js]
const https = require('https');

function extractUrl(input) {
  const regex = /https?:\/\/[^\s)]+/g; // 匹配 http 或 https 开头的链接
  const matches = input.match(regex); // 找到所有匹配
  return matches || []; // 返回匹配结果，若无则返回空数组
}
function getFileSize(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { method: 'HEAD' }, res => {
      resolve(Number(res.headers['content-length']));
    });
  }).catch(_ => {
    return 0;
  });
}
function getMB(size) {
  return Number((size / 1024 / 1024).toFixed(2));
}

module.exports = {
  extractUrl,
  getFileSize,
  getMB,
};

```
:::
