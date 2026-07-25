## 项目概述

StyleFit - 智能穿搭推荐应用。用户通过风格问卷（Survey）获取个性化的服装穿搭推荐（Recommendations）。

## 技术栈

- **框架**: React 19 + TypeScript
- **构建工具**: Vite 7
- **样式**: Tailwind CSS 3 + CSS Variables
- **UI 组件**: shadcn/ui (new-york style) + Radix UI
- **路由**: React Router 7
- **表单**: React Hook Form + Zod 校验
- **图表**: Recharts
- **图标**: Lucide React
- **包管理器**: pnpm

## 目录结构

```
stylefit-app/
  src/
    main.tsx              # 应用入口
    App.tsx               # 路由配置
    index.css             # 全局样式 + CSS 变量
    pages/
      Home.tsx            # 首页
      Survey.tsx          # 风格问卷页
      Recommendations.tsx # 推荐结果页
    components/
      ui/                 # shadcn/ui 组件
      ErrorBoundary.tsx   # 错误边界
      LoadingScreen.tsx   # 加载屏
    hooks/
      useRecommendation.ts # 推荐逻辑 Hook
      use-mobile.ts       # 移动端检测
    data/
      clothing.ts         # 服装数据
    types/
      index.ts            # 类型定义
    lib/
      utils.ts            # 工具函数 (cn 等)
```

## 关键入口 / 核心模块

- **入口**: `src/main.tsx` -> `src/App.tsx`
- **路由**: Home (`/`), Survey (`/survey`), Recommendations (`/recommendations`)
- **核心逻辑**: `src/hooks/useRecommendation.ts` 负责根据用户问卷结果匹配推荐
- **数据源**: `src/data/clothing.ts` 提供服装数据

## 运行与预览

- 开发: `pnpm dev` (Vite dev server, 端口 3000)
- 构建: `pnpm build` (tsc + vite build)
- 预览构建: `pnpm preview`
- Lint: `pnpm lint`

## 预览链路

- **项目类型**: Web 预览型项目（Vite 纯前端应用）
- **预览入口**: Vite dev server，绑定 `0.0.0.0:5000`
- **根 .coze 映射**: `[dev].build` -> `bash stylefit-app/scripts/coze-preview-build.sh`，`[dev].run` -> `bash stylefit-app/scripts/coze-preview-run.sh`
- **子项目 .coze**: `[dev].build` -> `bash scripts/coze-preview-build.sh`，`[dev].run` -> `bash scripts/coze-preview-run.sh`
- **脚本职责**:
  - `coze-preview-build.sh`: 安装依赖（pnpm install）
  - `coze-preview-run.sh`: 清理 5000 端口残留进程，启动 Vite dev server（`pnpm exec vite --host 0.0.0.0 --port 5000`）
- **验证方式**: `curl` 返回 200 + `ss` 显示 `0.0.0.0:5000` 监听

## 部署配置

- **部署类型**: service / web（Vite 纯前端 service 模板）
- **部署入口**: `index.html`
- **运行时**: `nodejs-24`
- **根 .coze 映射**: `[deploy].build` -> `bash stylefit-app/scripts/build.sh`，`[deploy].run` -> `bash stylefit-app/scripts/run.sh`
- **子项目 .coze**: `[deploy].build` -> `bash scripts/build.sh`，`[deploy].run` -> `bash scripts/run.sh`
- **脚本职责**:
  - `build.sh`: 安装依赖 + `pnpm vite build` 构建前端产物到 `dist/`
  - `run.sh`: 安装 `serve` + `pnpm exec serve dist -l 5000` 提供静态文件服务
- **端口**: 固定 5000

## 用户偏好与长期约束

- 使用 pnpm 管理依赖，禁止 npm/yarn
- 路径别名 `@/` 映射到 `src/`
- Vite 配置中 base 为 `./`（相对路径）

## 常见问题和预防

- Vite dev server 默认端口为 3000，预览链路需通过脚本代理到 5000
- shadcn/ui 组件通过 `components.json` 配置，新增组件需遵循现有 aliases
- 预览脚本基于 `SCRIPT_DIR` 定位项目根目录，不依赖调用时的 `pwd`
- 部署 run 脚本使用 `serve` 提供静态文件服务，不依赖 `vite preview`
