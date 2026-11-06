# 免费课程与练习资源接入核验

核验日期：2026-11-06。以下区分课程目录、课程播放和题库，地址能返回数据不等于取得转载或第三方嵌入授权

## 国家中小学智慧教育平台

- 官方课程入口：`https://basic.smartedu.cn/syncClassroom`
- 目录版本清单：`https://s-file-1.ykt.cbern.com.cn/zxx/ndrs/national_lesson/teachingmaterials/version/data_version.json`
- 章节树：`https://s-file-1.ykt.cbern.com.cn/zxx/ndrv2/national_lesson/trees/{bookId}.json`
- 某册资源分片清单：`https://s-file-1.ykt.cbern.com.cn/zxx/ndrs/national_lesson/teachingmaterials/{bookId}/resources/parts.json`
- 已同步的普通课程跳转：`https://basic.smartedu.cn/syncClassroom/classActivity?activityId={lessonId}`；其他资源类型沿用 `courses.ts` 中已确认的不同官方路由

本次 GET 版本清单返回 HTTP 200 和 `national_lesson` JSON，版本号与现有快照一致（1107649327）。发送站点 Origin 时响应未包含 `Access-Control-Allow-Origin`，因此不能直接从 GitHub Pages 浏览器跨域读取。官网 HTML 的初始化脚本检查第三方 iframe 来源；不在允许范围时跳转顶层或清空嵌入内容

本项目继续通过同步脚本读取公开元数据，在本站展示目录、课名、教材和单元，点击具体课程跳转官网学习。现有快照有 82 个册次和 2443 条课程记录（并非按内容去重后的课程数）；部分册次只有章节、没有课程资源，界面如实显示。目录属于本地快照，官方学习入口属于在线资源

尚未核实可授权本站直接播放视频的免费开放 API。如果需要站内播放，需先向来源方确认正式授权、播放器嵌入协议或开放接口；后端代理只能解决传输跨域，不能代替播放授权或绕过登录权限。本站不下载视频、课件或官方账号凭证

## 学阶图谱：站内知识点笔记（已接入）

公开项目：`https://github.com/goralcao/china-skill-taxonomy`。本站采用固定提交的 JSON 资料，展示小学语数英 193 个知识点的说明、学习目标及其中 188 个知识点的教学研究笔记，可查看重点易错、自测和整理后的演示卡片；按教材册次及单元提供参考，不能当作逐课官方讲义

数据库集合与结构为 ODbL 1.0，原创文本为 CC BY-SA 4.0，页面和公开数据目录保留署名与许可。上游笔记由 AI 撰写、未经实证验证，界面保留此说明。默认本地快照，可主动读取相同固定版本的在线正文，失败保留本地笔记；复现、接口地址、实测限制与全文/原版课件边界见 [站内课程笔记说明](LEARNING_NOTES.md)

## 接口盒子：随机小学数学题（已接入）

- 来源文档：`https://www.apihz.cn/api/zicishuxuex.html`
- 请求示例：`https://cn.apihz.cn/api/zici/shuxuex.php?id=88888888&key=88888888`
- 示例参数是文档公开的共享演示参数，不是用户的个人密钥

本次请求返回 HTTP 200、`code: 200`、`timu` / `daan` / `jiexi`，并返回 `Access-Control-Allow-Origin: *`。文档标记免费，注册用户频次为 10 次/分钟；共享参数实际配额和可用性由来源方控制，不承诺稳定

每次返回一道随机题，没有按教材、册次或年级筛选的已核实参数。题干与参考答案可能需要人工判断，本次样例也包含“付款不足却询问找零”的表述，因此保留自行核对答案，不按字符串直接判错。每轮最多取一道、5 秒超时、6.5 秒请求间隔，失败自动使用本地题，切换或离开取消请求

## Open Trivia DB：英文知识问答（已核验，未接入）

- 官方 API 文档：`https://opentdb.com/api_config.php`
- 数学分类示例：`https://opentdb.com/api.php?amount=1&category=19&difficulty=easy&type=multiple`
- 可选编码：追加 `&encode=url3986`，按文档解码文本，不使用 `v-html` 直接渲染外部内容

官方说明免费、无需 API Key，数据使用 CC BY-SA 4.0。每个 IP 每 5 秒最多一次请求，返回业务状态码，需要处理限流、无结果和重复题。本次请求 HTTP 200、`response_code: 0`，包含英文题干、正确答案和错误选项，允许跨域

题目是通用英文知识问答，`easy` 不表示小学年级；数学样例为英文质数问题。没有课程视频或国内教材同步契约，因此只列为可选拓展，不自动混进小学语数英练习。未来若接入，应使用独立的“英文知识拓展”入口，保留来源及许可，另行验证题目适龄性、网络和去重策略

## 本地补充与来源标记

- 数学：本地自编生成，交替使用原口算、未知数、生活应用、量感/单位/周长/面积/百分数题；原基础题号与已保存错题兼容
- 语文：每轮 5 道现有难度带基础题 + 5 道本地词义或拼音题；词义和拼音复用 `primary-words.json` 的 24 条自编补充，属于通用积累，不宣称严格分年级
- 英语：每轮 5 道现有难度带基础题 + 5 道双向词汇题；新增词汇共 36 个，按原有三个难度带组织，属于本地自编专项
- 错题复习：读取本机已保存记录，标为本地；如原题来自在线接口，额外保留原题来源说明和自行核对方式
- 词典：实际接口结果标为在线；词库结果和自动回退标为本地，词条旁保留具体来源名称

学习页与课程页已隐藏“免费资源与接口”介绍区域；此处保留资源核验记录，未接入服务不会自动请求
