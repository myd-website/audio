# 古诗与课件阅读版来源

古诗：chinese-poetry / chinese-poetry，JackeyGao 等贡献者，MIT；所选唐代作者原作已进入公有领域，保留来源资料的原字形、标点和异文，不能据此断言与某版教材完全一致。

固定版本：https://github.com/chinese-poetry/chinese-poetry/tree/b8594f81a89752241442f2ce267d6f66f96704ee

文件：蒙学/tangshisanbaishou.json；筛选 11 首小学常见古诗。仅将题名设为简体检索别名，作者与正文不改写，许可见 POETRY-LICENSE.txt。

开源课件阅读版：goralcao / China Skill Taxonomy contributors，CC BY-SA 4.0；固定提交 337c515f32b043d0658bcf9d29e8f963404c5988 的 courses/mt_read-mark/content.json。保留九步内容，将互动指令改成纸面练习说明，提取正文、问题、参考批注、答案与自查文本并去除基础 HTML 排版标签，原样顺序不执行脚本。该阅读版按 CC BY-SA 4.0 分发，不是本课教材 PPT。

复现：scripts/prepare-open-readings.mjs 中保存两个 JSON 的 SHA-256，将对应源文件及诗词仓库 LICENSE（命名 poetry-license.txt）放在同一目录后运行 node scripts/prepare-open-readings.mjs /path/to/source-files。
