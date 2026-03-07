# 朋友档案 (evmo)

一个帮助你记录和管理朋友信息的移动端应用。

## 功能特性

- 📝 朋友档案管理（增删改查）
- 🎂 生日提醒
- 💬 AI 智能建议（基于 OpenAI）
- 🏷️ 自定义标签和备注
- 🔔 联系提醒
- 📱 移动端友好界面

## 技术栈

- Vue 3 (Composition API)
- TypeScript
- Vite
- Pinia (状态管理)
- Vue Router 4
- IndexedDB (本地数据存储)
- OpenAI API

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:3000/ 查看应用

### 构建生产版本

```bash
npm run build
```

## 项目结构

```
app/
├── src/
│   ├── assets/styles/       # 样式文件
│   ├── components/          # 组件
│   │   ├── common/          # 通用组件
│   │   ├── layout/          # 布局组件
│   │   └── friend/          # 朋友相关组件
│   ├── views/               # 页面视图
│   ├── router/              # 路由配置
│   ├── stores/              # Pinia 状态管理
│   ├── database/            # IndexedDB 封装
│   ├── services/            # 业务服务
│   ├── types/               # TypeScript 类型定义
│   ├── utils/               # 工具函数
│   ├── App.vue              # 根组件
│   └── main.ts              # 入口文件
└── package.json
```

## AI 配置

在"我的"页面 → "AI 设置"中配置你的 OpenAI API Key 即可使用 AI 功能。

支持的模型：
- GPT-3.5 Turbo
- GPT-4
- GPT-4 Turbo

## 数据存储

所有数据都存储在本地浏览器的 IndexedDB 中，不会上传到任何服务器。

## 开发说明

本项目基于原有的 HTML/CSS/JS 原型重构为 Vue 3 应用，保留了原有的视觉设计和交互体验。
