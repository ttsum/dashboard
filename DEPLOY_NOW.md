# 一键部署操作清单（Render + GitHub Pages）

## 0. 本仓库已完成的准备
- 后端支持 CORS 与预检
- 前端支持 `VITE_EXPERIMENT_API_BASE_URL`
- 已提供 Render 蓝图：`render.yaml`
- Pages workflow 已接入：`vars.VITE_EXPERIMENT_API_BASE_URL`

## 1. 部署后端到 Render
1. 打开 Render -> New -> Blueprint
2. 选择仓库：`ttsum/dashboard`
3. 发现 `render.yaml` 后继续创建
4. 在服务环境变量里设置：
   - `CORS_ORIGIN=https://ttsum.github.io`
5. 等待部署完成，拿到后端域名：
   - 例如：`https://dashboard-experiment-api.onrender.com`
6. 验证健康检查：
   - 打开 `https://你的后端域名/api/experiment/health`

## 2. 配置 GitHub Pages 构建变量
1. 打开 GitHub 仓库 -> Settings -> Secrets and variables -> Actions -> Variables
2. 新建 Repository variable：
   - Name: `VITE_EXPERIMENT_API_BASE_URL`
   - Value: `https://你的后端域名`

## 3. 触发前端重新发布
1. 打开 Actions -> `Deploy To GitHub Pages`
2. 点击 `Run workflow`
3. 等待成功后打开页面测试

## 4. 验证采集
1. 完成实验流程到阶段结束页
2. 按 ESC，填写 `participant_id` 与 `recording_id`
3. 点击“保存并结束”
4. 在后端服务器的 `trajectories/` 目录确认生成文件

## 5. 常见问题
- 页面提示“保存失败”：通常是 `VITE_EXPERIMENT_API_BASE_URL` 未配置或 CORS_ORIGIN 不匹配
- 403/跨域错误：确认 `CORS_ORIGIN` 与真实访问 origin 一致
- 无法写文件：检查服务实例磁盘权限（Render starter 通常可写运行目录）
