import { defineConfig } from 'vitepress';

// 导入主题的配置
import { blogTheme } from './blog-theme';

// 如果使用 GitHub/Gitee Pages 等公共平台部署
// 通常需要修改 base 路径，通常为“/仓库名/”
// 如果项目名已经为 name.github.io 域名，则不需要修改！
// const base = process.env.GITHUB_ACTIONS === 'true'
//   ? '/vitepress-blog-sugar-template/'
//   : '/'

// Vitepress 默认配置
// 详见文档：https://vitepress.dev/reference/site-config
export default defineConfig({
  // 继承博客主题(@sugarat/theme)
  extends: blogTheme,
  base: '/my-garden/',
  lang: 'zh-cn',
  title: '百里静修的花园',
  description: '百里静修的个人博客',
  lastUpdated: true,
  // 详见：https://vitepress.dev/zh/reference/site-config#head
  head: [
    // 配置网站的图标（显示在浏览器的 tab 上）
    // ['link', { rel: 'icon', href: `${base}favicon.ico` }], // 修改了 base 这里也需要同步修改
    ['link', { rel: 'icon', href: '/my-garden/avatar.png' }],
  ],
  themeConfig: {
    // 展示 2,3 级标题在目录中
    outline: {
      level: 'deep',
      label: '目录',
    },
    // 默认文案修改
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '相关文章',
    lastUpdatedText: '上次更新于',

    // 设置logo
    logo: '/avatar.png',
    // editLink: {
    //   pattern:
    //     'https://github.com/ATQQ/sugar-blog/tree/master/packages/blogpress/:path',
    //   text: '去 GitHub 上编辑内容'
    // },
    nav: [
      { text: '首页', link: '/' },
      {
        text: '前端学习',
        items: [
          {
            text: '前端基础',
            link: '/frontend/base/',
          },
          {
            text: '组件库',
            link: '/frontend/component-library/',
          },
          {
            text: '工程化',
            link: '/frontend/engineering/',
          },
          {
            text: '项目',
            link: '/frontend/project/',
          },
          {
            text: '源码学习',
            items: [
              {
                text: 'React',
                link: '/frontend/source/react/',
              },
              {
                text: 'Vue',
                link: '/frontend/source/vue/',
              },
            ],
          },
          {
            text: '其他',
            link: '/frontend/other/',
          },
        ],
      },
      {
        text: '其他',
        link: '/other/',
      },
      // { text: "关于作者", link: "https://sugarat.top/aboutme.html" },
    ],
    editLink: {
      pattern: 'https://github.com/Arktomson/my-garden/tree/main/docs/:path',
      text: '去 GitHub 上编辑内容',
    },
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/Arktomson',
      },
    ],
  },
  markdown: {
    lineNumbers: true,
  },
});
