# drawlr

[![Build Status](https://travis-ci.org/DremyGit/drawlr.png)](https://travis-ci.org/DremyGit/drawlr)
[![Coverage Status](https://coveralls.io/repos/github/DremyGit/drawlr/badge.svg?branch=master)](https://coveralls.io/github/DremyGit/drawlr?branch=master)

一个高性能、自动化的非定向 Node.js 爬虫库，可自动对符合指定规则的页面进行爬取，并可进行自定义解析处理。

## 功能

+ 可配置过路 URL 与目标 URL，目标 URL 可分组处理
+ 可配置需要收录的页面 URL，并能直接给出 HTML 结果
+ 可配置同时爬取的爬虫数
+ 可配置爬取的时间间隔
+ 可自定义爬虫请求 Headers，并可随机切换 UA 等信息
+ 可对每类页面进行自定义的处理
+ 可配置使用多个进程进行 HTML 解析，提高解析效率
+ 可以对当前任务导出为数据文件，并可由数据文件恢复任务的继续运行

## 所用技术

+ 充分发挥 Node.js 异步 I/O 的优势，通过 EventEmitter 实现对大量异步操作的集中调度
+ 通过 Request 库完成对页面的请求
+ 通过 BloomFilter 实现抓取队列，使用最少的时间与空间资源完成网址判重操作
+ 通过 Child Process 对计算密集的操作（如对 HTML 的解析处理等）负载均衡给多个子进程运行，使得操作不影响 Node.js 主进程的调度

## 使用方式

### 安装

```
$ npm install --save drawlr
```

### 使用说明

```js
const Drawlr = require('drawlr');

// 配置爬虫
const Drawlr = new Drawlr({
  entry: 'https://github.com/trending?since=daily',   // 爬虫爬取入口 URL
  pass: ['/**'],            // 爬虫允许途经 URL，使用 Glob 匹配语法
  exclude: [                // 爬虫无需爬取的资源
    '/**.{js,css,png,jpg,svg}'
  ],
  target: {                 // 爬取目标 URL，可爬取多个目标，并分组命名
    repo: '/*/*'
  },
  parser: {                 // 自定义的解析函数，可直接对爬取的目标页面分组进行解析处理
    repo: function (html, link, group) {
      const titleMatch = html.match(/<title>([^<]*?)<\/title>/);
      return titleMatch && titleMatch[1];
    }
  },
  requestNum: 10           // 爬虫的数量，即最大的并发请求数
});

// 监听页面自定义解析操作完成事件
drawlr.on('targetParse', (result, html, link, group) => {
  console.log('Title: %s from %s - %s', result, group, link);
});

// 监听爬取错误事件
drawlr.on('error', (err, url) => {
  console.log('Request %s Error: %s', url, err);
});

// 爬取开始
drawlr.start();
```

### 状态保存与恢复

```js
// 保存
const data = drawlr.export();
fs.writeFile('./data.json', JSON.stringify(data), () => {
 console.log('Write data data.json');
});

// 恢复
let drawlr;
fs.readFile('./data.json', 'utf-8', (err, data) => {
  if (!err) {
    drawlr = Drawlr.from(JSON.parse(data));
    drawlr.start();
  }
});
```

### CLI

使用 `npm install -g drawlr` 安装之后，可以使用命令行操作。

```bash
$ drawlr --help

  Usage: drawlr <entryURL> [options...]

  Options:

    -h, --help                   output usage information
    -V, --version                output the version number
    -p, --pass [url pattern]     pass url pattern
    -t, --target [url pattern]   target url pattern
    -e, --exclude [url pattern]  exclude urls
    -r, --regex [regex]          regex express string
    -g, --global                 regex g mode
    -h, --header [header]        request header
    -c, --client [n]             number of request client
    -s, --sleep [s]              millisecond of sleeping after an request finished
    -j, --json                   output json format
```

样例：

```
$ drawlr 'https://movie.douban.com/top250?start=0&amp;filter='\
    -p '/top250' -t '/top250' -r 'class="title">([^<&]*?)</span>' -g
```

## Option API

### option.entry

爬虫的入口 URL，请注意使用包含协议与域名的完整 URL

### option.pass

默认值：`['/**']`

爬虫允许途径的 URL，可使用 `String` 或者 `String` 数组。使用 [Glob 规则](https://github.com/isaacs/node-glob#glob-primer) 进行路径匹配， 可跨站爬取。当使用站点相对站点根路径时，默认使用与入口相同的域名与协议。

### option.exclude

爬虫无需爬取的 URL，可使用 `String` 或者 `String` 数组，使用 [Glob 规则](https://github.com/isaacs/node-glob#glob-primer) 进行路径匹配。

### option.target

爬虫爬取目标页面的 URL 分组对象，key 为分组的名称，value 可使用 `String` 或者 `String` 数组。使用 [Glob 规则](https://github.com/isaacs/node-glob#glob-primer) 进行路径匹配，可跨站爬取。当使用站点相对路径时，默认使用与入口相同的域名与协议。

```js
{
  target: {
    users: [
      '/users',
      '/users/*'
    ],
    info: '/users/**/info'
  }
}

```

### option.parser

爬虫在获取目标页面的 HTML 之后可进行的解析操作定义，key 为分组的名称，value 为解析操作的函数，函数的返回值将作为操作的结果，在 `targetParse` 事件中返回。操作可为空，即不执行解析操作。

```js
{
  parser: {
    users: function (html, url, group) {
      const titleMatch = html.match(/<title>([^<]*?)<\/title>/);
      return titleMatch && titleMatch[1];
    }
  }
}
```

### option.headers

爬虫在爬取每个页面所携带的请求头，若为数组则会在每次请求的时候随机选取一项，建议对 UA 进行设置

```js
{
  headers: {
    'User-Agent': [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/600.8.9 (KHTML, like Gecko) Version/8.0.8 Safari/600.8.9'
    ]
  }
}
```

### option.sleep

默认值：`0`

每个爬虫在请求完成后发出下一次请求的时间间隔，毫秒

### option.timeout

默认值：`5000`

爬虫每个请求的最大时间，超出则停止请求，毫秒

### option.requestNum

默认值：`3`

爬虫的数量，即最大的并发请求数

### option.parserProcessNum

默认值：`0`

为解析器所建立的进程数，若为 0 则使用主线程处理解析。

**注意：** 对于 HTML 的解析操作属于 CPU 密集型操作，若占用主线程进行复杂的解析操作可能会导致爬虫库的调度出现延时，建议使用多进程的形式进行解析操作。除了自定义的 HTML 解析函数外，对于每个页面中的链接的自动解析属于此项。

### options.bloom

为 BloomFilter 进行合适的配置，`n` 为大约需要爬取的链接数（默认为 `2000`），`p` 为允许的误报率（即可能忽略爬取链接的概率，默认为 `0.001`）

## Event API

爬虫库继承自 EventEmitter，以下是爬虫库可供监听的事件

### html: (html, url)

当爬虫请求页面成功时触发

### targetHtml: (html, url, group)

当爬虫请求目标页面成功时触发

### links: (links)

当从 HTML 页面解析出未爬取的 URL 时触发

### targetLinks: (links, group)

当从 HTML 页面解析出未爬取的目标页面 URL 时触发

### targetParse: (result, html, url, group)

当从目标页面的 HTML 调用自定义解析函数返回时触发

### finish

当所有的爬虫任务完成时触发

### error: (err, url)

当爬虫请求失败时候触发

## License

[MIT](https://github.com/DremyGit/drawlr/blob/master/LICENSE) @ [Dremy](https://github.com/DremyGit)
