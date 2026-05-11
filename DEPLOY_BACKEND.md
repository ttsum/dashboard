# 后端采集服务部署说明

## 目标
前端页面托管在 GitHub Pages，鼠标轨迹通过独立后端 API 保存到 CSV。

## 一、部署后端（推荐 Render）

1. 在 Render 新建 `Web Service`，连接仓库：`ttsum/dashboard`
2. 配置：
- Runtime: `Node`
- Branch: `main`
- Root Directory: `.`
- Build Command: `npm install && npm run build`
- Start Command: `npm run serve:experiment`

3. 环境变量：
- `PORT` = `10000`（Render 会覆盖或注入，保留即可）
- `CORS_ORIGIN` = 你的前端域名
  - 例如：`https://ttsum.github.io`
  - 如果页面路径为仓库页，也可写成：`https://ttsum.github.io`

4. 部署完成后，记下后端地址：
- 例如：`https://dashboard-experiment-api.onrender.com`

5. 健康检查：
- 访问：`https://你的后端域名/api/experiment/health`
- 返回 `{"ok":true,...}` 说明后端在线

## 二、前端连接后端

本项目支持通过环境变量指定 API Base URL。

在 GitHub Actions / Pages 构建环境中设置：
- `VITE_EXPERIMENT_API_BASE_URL` = `https://你的后端域名`

前端将调用：
- `https://你的后端域名/api/experiment/trajectory`

## 三、CORS 说明

后端已支持 CORS 预检和跨域头：
- `POST /api/experiment/trajectory`
- `OPTIONS /api/experiment/trajectory`

请确保 `CORS_ORIGIN` 包含你实际访问页面的 origin。

## 四、数据存储注意

当前 CSV 默认写在后端容器内 `trajectories/`。
- 若平台实例重启可能丢失，需要后续接对象存储或持久卷。
- 若你需要，我可以继续改成写入 S3 / R2 / Supabase Storage。
## 查看/下载采集数据接口（免费实例可用）

已提供两个接口：

- 列表：`GET /api/experiment/files`
- 下载：`GET /api/experiment/files/:filename`

示例（你的服务）：
- 列表：`https://jiangxidashboard.onrender.com/api/experiment/files`
- 下载：`https://jiangxidashboard.onrender.com/api/experiment/files/20260511_35_150.csv`

可选安全控制：
- 配置环境变量：`EXPERIMENT_ADMIN_TOKEN=<你的令牌>`
- 配置后访问方式（任一）：
  - Query: `?token=<你的令牌>`
  - Header: `x-admin-token: <你的令牌>`
  - Header: `Authorization: Bearer <你的令牌>`

如未配置 `EXPERIMENT_ADMIN_TOKEN`，接口默认公开可访问。
