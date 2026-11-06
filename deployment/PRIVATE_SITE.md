# 私用站点：禁止收录与发布资源检查

适用范围：2026-11-05 检查的当前 Vue / Vite 源码、`public/` 和仓库已有 `docs/`。当前采用 GitHub Pages 项目站点 `/audio/`；本次未修改线上设置、未发布，也未核验搜索引擎是否已经收录。

## 已落实的措施

- `index.html` 在静态 HTML 头部声明 `noindex, nofollow, nosnippet, noimageindex`。Hash 路由共享这份入口 HTML，搜索引擎不用运行应用也能读到声明。
- 全局 `no-referrer` 减少外链、图片和默认网络请求向第三方传递站点来源。音乐嵌入及已有音乐、出题请求的独立来源策略继续沿用。
- Vite 构建前检查 `public/`，写出后再检查完整产物。环境文件、私钥、常见访问令牌、源码映射、备份/数据库/压缩包、源码目录和符号链接会使构建失败。支持识别普通文件名中的当前档案备份和旧版工作区 JSON；不会输出匹配到的凭证。
- `build.sourcemap: false` 加入构建检查，禁止意外开启；环境文件加入 Git 忽略规则，已被 Git 跟踪的文件不会因此自动移除。
- 开发服务默认只监听 `127.0.0.1:8090`。需要手机局域网调试时，明确运行 `pnpm run dev --host 0.0.0.0`，此时局域网其他设备也可能访问开发服务。

正常使用不增加验证码、不要求浏览器指纹，也不拦截复制、右键或开发工具。

## GitHub Pages 的 robots.txt 放置要求

当前项目发布在 `https://myd-website.github.io/audio/`，搜索引擎使用的是 **`https://myd-website.github.io/robots.txt`**。只在本项目的 `public/` 增加文件，发布后会变成 `/audio/robots.txt`，不能作为根域的 robots 策略。

已经准备好 [github-pages/robots.txt](github-pages/robots.txt)，需要由根站点 `myd-website.github.io` 仓库的维护者合并到其发布根目录；已有 robots 规则时合并对应 `Disallow` 行，保留其他站点的规则。本项目无法替另一个仓库自动生效。以后换项目路径时同步更新规则。

示例只禁止抓取 `/audio/dictionaries/`、`/audio/static/` 和 `/audio/assets/`。入口 HTML 保持可抓取，让搜索引擎能读到 `noindex`；不要一边 `Disallow: /audio/`，一边期望搜索引擎读取页面中的禁止收录声明。若已有收录，需要发布新 HTML 后等待重新抓取；急需移除时，由有权限的维护者在对应搜索引擎站长工具申请移除。本次未执行这些外部操作。

## 整体检查结果与剩余边界

| 检查项         | 结果与边界                                                                                                                                                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 页面收录       | 原始入口缺少 robots 声明；现已在源码修复，下一次构建、发布后生效。没有手工改写仓库已有 `docs/` 生成文件。                                                                                                                    |
| 静态词库       | `public/` 原有 516 个文件约 54.9 MB，其中 512 个词库分片和 1 份清单。字词内容来自公开许可数据，地址可直接请求和枚举；客户端缓存、分片和压缩都不提供访问控制。                                                                |
| 个人记录       | 任务、学习记录、收藏、模板保存在浏览器 localStorage，音乐在 IndexedDB；本次未在 `public/` 或已有 `docs/` 中发现个人备份。其他设备的普通爬虫不能通过站点 URL 读取本机存储；同一浏览器中的使用者、脚本与扩展是另一类访问边界。 |
| 公开源码与接口 | 浏览器接收的 JS、接口地址与公开仓库内容可被查看。数学接口使用来源公开的共享 ID/KEY，不能当作私密密钥；已有 6.5 秒客户端间隔只减少正常页面重复调用，不能作为服务端反爬。没有新增私密凭证。                                    |
| 密钥与源码映射 | 本次对源码、公开资源和已有产物的常见 PEM 私钥、AWS Access Key ID、GitHub Token 格式扫描未命中；公开目录没有 `.env`、数据库、压缩备份或 `.map` 文件。该规则扫描不能保证识别所有密钥和敏感内容，仍需人工审查。                 |
| 开发环境       | 原配置 `host: true` 暴露到所有网卡；现改为回环地址，显式开启局域网调试时仍需自行控制网络。                                                                                                                                   |
| 访问身份与频率 | GitHub Pages 当前仍是公开静态站点，两份无密码本机档案不是身份认证。这里未实现指定用户白名单、按 IP 限流或资源鉴权；知道地址的人和不遵守 robots 的爬虫仍可访问、下载。                                                        |

若未来需要真正“只有指定的人可用”，需评估支持身份验证的托管方案，并覆盖 HTML、JS、JSON、媒体和所有直连入口；单独给前端增加口令或判断 User-Agent 无法满足这一要求。本次按已确认范围保留 GitHub Pages，不迁移托管、不添加后端。

## 本地验证与发布

```sh
pnpm run audit:publication
node --test tests/publication.test.mjs
node node_modules/vue-tsc/bin/vue-tsc.js --noEmit
pnpm run build --outDir /private/tmp/audio-private-site-check --emptyOutDir false
pnpm run audit:publication --out-dir /private/tmp/audio-private-site-check
```

`pnpm run build` 本身也会执行构建前与产物检查。检查通过后，按项目原流程生成 `docs/`、审阅差异并由维护者提交发布，不能把本地源码修改当作线上已生效。`robots.txt` 仍需根域仓库配合。

## 官方依据

- [Google：通过 noindex 阻止收录](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- [Google：robots.txt 的根目录与作用范围](https://developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt)
- [MDN：Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy)
- [GitHub：Pages 访问可见性的适用条件](https://docs.github.com/en/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site)
