# 友记后端

## 本地启动

```bash
node src/index.mjs
```

默认端口：`9090`

健康检查：`http://localhost:9090/api/health`  
管理后台：`http://localhost:9090/admin`

## 当前数据库

- 当前默认数据库：`SQLite`
- 数据文件位置：[server/data/youji.sqlite](/e:/AI_learn_model/evmo/server/data/youji.sqlite)
- 当前 Node 24 已内置 `node:sqlite`，本地开发不需要额外安装数据库软件

## 已拆分的数据库层

- `src/database/`：数据库驱动入口
- `src/repositories/`：数据访问层

这样后面切 `MySQL` 时，主要替换驱动和 repository 实现，不需要重写接口层。

## MySQL 预留环境变量

```env
DATABASE_CLIENT=mysql
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306
DATABASE_USER=your_user
DATABASE_PASSWORD=your_password
DATABASE_NAME=youji
```
