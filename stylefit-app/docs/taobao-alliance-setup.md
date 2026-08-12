# 淘宝联盟服务端联调

本次接口仅用于受限联调：`GET /api/taobao/products?scene=mens_work`。

## 允许的场景

- `mens_work`：男士通勤衬衫
- `womens_work`：女士通勤连衣裙
- `mens_casual_outerwear`：男士休闲外套
- `womens_minimal_top`：女士简约上衣

每次最多返回 10 件商品；不支持自定义关键词、URL 或分页参数。

## 在 EdgeOne 生产环境配置密钥

1. 登录 [腾讯云 EdgeOne Makers 控制台](https://console.cloud.tencent.com/edgeone/makers)。
2. 打开项目 **stylefit**，进入左侧 **项目设置**。
3. 找到 **环境管理**，在 **生产** 环境右侧点击 **编辑**。
4. 在该环境的 **环境变量** 区域新增或更新以下三个变量：
   - `TAOBAO_APP_KEY`
   - `TAOBAO_APP_SECRET`
   - `TAOBAO_PID`
5. 保存后，重新创建一次生产部署，使边缘函数读取新变量。

不要添加 `VITE_` 前缀，不要把变量填入前端构建配置、静态文件或 Git 仓库。`.env.example` 只是变量名模板；本地调试时将真实值放入已被 Git 忽略的 `.env`。

## 验证

未配置变量时：

```text
GET /api/taobao/products?scene=mens_work
=> 503 {"error":"服务未配置"}
```

配置完成并重新部署后，用浏览器或 curl 请求同一路径。成功时返回最多 10 件商品，字段仅为 `itemId`、`title`、`image`、`price`、`couponAmount`、`couponPrice`、`shopTitle`、`volume`、`category`、`promotionUrl`。`promotionUrl` 为空表示该条物料未返回可用推广链接。
