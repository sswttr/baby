# Baby · 孕期产检记录

手机网页，用来记录孕期产检：孕周和预产期、10 次产检时间表、检查记录和报告照片、问题复查跟进、体重血压趋势、JSON 备份和导入。

所有数据只保存在打开网页的那台手机的浏览器里，不会上传到 GitHub 或任何服务器。

## 部署到 GitHub Pages

1. 在 GitHub 新建一个仓库，例如 `baby`。
2. 把这个文件夹里的所有文件（不要子文件夹）上传到仓库根目录，包括 `.nojekyll`。
3. 进入仓库 Settings → Pages，Source 选 “Deploy from a branch”，分支选 `main`，目录选 `/ (root)`，保存。
4. 等 1–2 分钟，访问 `https://你的用户名.github.io/baby/`。

## 添加到手机桌面

- 苹果手机：用 Safari 打开网址 → 点底部“分享” → “添加到主屏幕”。
- 安卓手机：用 Chrome 或系统浏览器打开 → 菜单 → “添加到主屏幕 / 安装应用”。

## 文件说明

| 文件 | 作用 |
| --- | --- |
| index.html | 页面入口 |
| style.css | 样式 |
| app.js | 全部功能 |
| manifest.webmanifest | 桌面图标、名称 |
| sw.js | 离线缓存，没网也能打开 |
| icon-180.png / icon-192.png / icon-512.png / favicon.png / icon.svg | 图标 |
| .nojekyll | 让 GitHub Pages 原样发布文件 |

## 注意

- 定期在“记录 → 数据备份”导出 JSON，换手机时在新手机导入。
- 备份文件里有个人健康信息，不要上传到 GitHub 仓库。
- 产检时间按常规安排推算，仅供参考，以医院和医生安排为准。
