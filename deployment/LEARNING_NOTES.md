# 站内课程笔记与开放资料

核验日期：2026-11-06

## 已接入的站内阅读

“课程 → 查看课程”可直接阅读学习笔记、学习重点、易错点、课后自测和可翻页的演示卡片，不必为了阅读这些内容离开本站

- 资料源：学阶图谱（goralcao / China Skill Taxonomy contributors）
- 固定提交：`337c515f32b043d0658bcf9d29e8f963404c5988`
- 小学语文 55、数学 101、英语 37 个知识点，共 193 个；其中 188 个有教学研究正文，其余保留知识点说明与学习目标，界面不编造自测或易错点
- 主题与教材结构来自 `data/topics.json`、`data/textbooks.json`；笔记来自 `data/teaching-research.json`；部分学习目标来自 `data/courses.json`
- 教学研究正文由上游 AI 撰写，经过结构检查、未经实证验证，引用未逐条重新核实；不是官方教师讲义。界面保留此说明
- 《观潮》《繁星》另提供本站整理的简要复习提纲，并明确标为“本地 / 本站整理”，不冒充外部 API 返回内容
- 演示卡片由笔记的摘要、学习目标、活动、易错点及自测整理，属于衍生展示，按 CC BY-SA 4.0 分发；不是教材原版 PPT，也不执行来源网页中的脚本
- “圈画关键词与批注”另有真实开源课件的九步阅读版：来自固定版本的 `courses/mt_read-mark/content.json`（实测 HTTP 200），把原互动内容改成纸面练习说明、提取问题与参考批注，按 CC BY-SA 4.0 分发；不是《观潮》或《繁星》的逐课 PPT
- 古诗原文另收录 chinese-poetry 仓库的 11 首小学常见唐诗（MIT，固定提交 `b8594f81a89752241442f2ce267d6f66f96704ee`）。保留资料原字形、标点、异文及作者，只为题名增加简体检索名称。按明确诗题或当前单元的诗题清单展示，不将某一首诗当作整课全文；与课本可能有字形、标点差异

数据库集合与结构适用 ODbL 1.0，原创文本与相应课件适用 CC BY-SA 4.0。来源、加工说明及两个许可证随资料公开在 `public/courses/notes/v1/`；上述许可仅针对派生资料，不改变本站应用代码许可

## 可直接读取的免费 JSON 地址

这些地址是公开静态数据文件，不是提供 SLA 的商业 API，也不是国家平台官方开放接口；无需 API Key

```text
https://raw.githubusercontent.com/goralcao/china-skill-taxonomy/337c515f32b043d0658bcf9d29e8f963404c5988/data/topics.json
https://raw.githubusercontent.com/goralcao/china-skill-taxonomy/337c515f32b043d0658bcf9d29e8f963404c5988/data/textbooks.json
https://raw.githubusercontent.com/goralcao/china-skill-taxonomy/337c515f32b043d0658bcf9d29e8f963404c5988/data/teaching-research.json
https://raw.githubusercontent.com/goralcao/china-skill-taxonomy/337c515f32b043d0658bcf9d29e8f963404c5988/data/courses.json
https://raw.githubusercontent.com/goralcao/china-skill-taxonomy/337c515f32b043d0658bcf9d29e8f963404c5988/courses/mt_read-mark/content.json
https://raw.githubusercontent.com/chinese-poetry/chinese-poetry/b8594f81a89752241442f2ce267d6f66f96704ee/蒙学/tangshisanbaishou.json
```

2026-11-06，真实读取 GitHub 公开 Blob API 返回的上述四个文件均为 HTTP 200，校验和与固定版本 manifest 一致。若原始文件直链下载超时，可通过 GitHub Contents API 获取文件 SHA，再用 Blob API 的 `Accept: application/vnd.github.raw+json` 读取；这次大文件取回使用了该方式。原始域名的连通性依网络而异，不能把 API 读取成功当作所有浏览器直连都已验证

页面默认读取本站按学科拆分的本地快照，明确显示“本地”。点击“在线读取同版笔记”才向上述固定版本原始文件发起请求（约 3.1 MB，最多 10 秒，最大响应 4.5 MB，验证 SHA-256）；只有成功返回并通过校验的知识点正文显示“在线”。知识点索引与本站复习提纲仍标为本地。网络、跨域、HTTP、格式、大小、版本或超时错误均保留本地笔记并显示原因；离开弹层或切换学科取消请求，旧请求不能覆盖新页面

## 对应教材的边界

- 只对统编版语文、人教版数学、人教 PEP 英语建立参考关联；不把 PEP 知识点自动当作精通版或一年级起点英语的配套资料
- 按学科、年级、册次、新旧教材和单元匹配。单元资料标为“本单元知识点参考”，整册资料标为“本册通用方法参考”，不宣称逐课配套
- 《观潮》《繁星》提纲限定统编版四年级上册；其中推荐的阅读方法属于相关知识点，可能涉及前面年级学过的方法，界面显示实际参考年级
- 未匹配到资料时不推荐任意相似课名；可手动搜索当前学科的其他知识点作为拓展
- 上游新版结构暂未覆盖全部 1～6 年级所有册次；未覆盖的新教材不自动沿用旧教材单元号

## 全文与原版课件

目前没有核实到可以免费、稳定、逐课查询并在本站转载现代教材全文及原版 PPT 的通用开放接口。国家平台的目录 API 不包含这些正文；免费阅读和 GitHub 上存在资源也不等于获得教材原文的转载权

本次未复制现代课文全文或原版 PPT，未下载官方视频，也未借助公共代理或账号 Cookie 绕过权限。原版教学资源仍保留官网入口。开源项目文档中的 GitHub Pages 课件地址在本次访问返回 404，因此没有把它作为可用 iframe 嵌入

古诗与开源课件阅读版是另外核实的可再分发资源，其来源和具体改动公开在 `public/courses/notes/v1/OPEN-READINGS.md`，诗词 MIT 许可保存在同目录的 `POETRY-LICENSE.txt`

另核查 LibreMath 的公开说明：声明 CC BY-NC 4.0 并提供 `libremath.json`，但本次多次读取该文件发生连接/读取超时，因此仅列为待评估来源，没有把它接入或当作已可用接口

## 复现与验证

将固定提交的四个 JSON 与 `LICENSE`、`LICENSE-CONTENT`、`PROVENANCE.md` 放在同一源目录，执行：

```sh
node scripts/prepare-learning-notes.mjs /path/to/source-data
node --test tests/learning-notes.test.mjs
```

脚本内保存四个输入文件的 SHA-256，所有输入先校验再写入。更新上游版本时需同时审阅许可、字段、教材映射、AI 内容披露及校验和，不直接把固定提交换为 `main`

古诗及课件阅读版的准备命令：`node scripts/prepare-open-readings.mjs /path/to/source-files`。源目录需包含 `poetry-tang.json`、`skill-read-mark-content.json` 和 `poetry-license.txt`；前两个文件的 SHA-256 在脚本内固定，不通过时不覆盖正文产物
