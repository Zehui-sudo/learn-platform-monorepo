# Monorepo迁移计划

## 项目分析

### 当前项目结构
```
.
├── .env.local
├── .env.local.example
├── .gitignore
├── .mcp.json
├── learn-linker/           # VS Code插件项目
└── web-learner/            # Next.js学习平台项目
```

### 依赖分析

1. **web-learner (Next.js项目)**:
   - 使用zustand ^5.0.6作为状态管理
   - 使用Next.js 15.4.2作为框架
   - 主要脚本: dev, build, start, lint

2. **learn-linker (VS Code插件)**:
   - 使用zustand ^4.4.7作为状态管理
   - 使用Webpack进行构建
   - 主要脚本: compile, watch, package, lint, test

### 共享依赖
- 两个项目都使用zustand，但版本不同 (web-learner使用5.0.6, learn-linker使用4.4.7)
- 两个项目都是独立的npm项目

## Monorepo迁移步骤

### 1. 创建Monorepo根目录配置文件

需要创建以下文件:
- `package.json` - 根项目的package.json
- `pnpm-workspace.yaml` - pnpm工作区配置
- 更新根目录的`.gitignore`

### 2. 重构项目目录结构

将项目重构为以下结构:
```
.
├── package.json          # 根项目package.json
├── pnpm-workspace.yaml   # pnpm工作区配置
├── .gitignore            # 更新后的git忽略规则
├── packages/
│   ├── web-learner/      # Next.js学习平台项目
│   └── learn-linker/     # VS Code插件项目
└── docs/                 # 共享文档
```

### 3. 配置pnpm工作区和共享依赖

- 配置pnpm工作区以管理两个包
- 统一共享依赖的版本（如zustand）
- 配置共享的开发工具和配置

### 4. 更新构建和开发脚本

- 更新两个项目的脚本以适应新的目录结构
- 创建根级别的脚本来运行两个项目的开发和构建任务
- 配置共享的工具配置（如ESLint, TypeScript）

### 5. 验证迁移后的项目功能

- 验证web-learner项目的开发和构建
- 验证learn-linker插件的编译和打包
- 确保所有功能正常工作

### 6. 更新文档说明

- 更新README文件
- 添加Monorepo使用说明
- 更新开发指南

## 详细实施步骤

### 步骤1: 创建根目录配置文件

1. 创建`pnpm-workspace.yaml`:
   ```yaml
   packages:
     - "packages/*"
   ```

2. 创建根`package.json`:
   ```json
   {
     "name": "learn-platform-monorepo",
     "version": "1.0.0",
     "description": "Monorepo for Learn Platform and Learn Linker IDE Plugin",
     "private": true,
     "scripts": {
       "dev:web": "pnpm --filter web-learner dev",
       "build:web": "pnpm --filter web-learner build",
       "dev:linker": "pnpm --filter learn-linker watch",
       "build:linker": "pnpm --filter learn-linker package",
       "lint": "pnpm --recursive lint",
       "test": "pnpm --recursive test"
     },
     "devDependencies": {
       "prettier": "^3.0.0",
       "turbo": "^2.0.0"
     },
     "engines": {
       "pnpm": ">=9.0.0"
     }
   }
   ```

### 步骤2: 重构目录结构

1. 创建`packages`目录
2. 将`web-learner`移动到`packages/web-learner`
3. 将`learn-linker`移动到`packages/learn-linker`

### 步骤3: 配置共享依赖

1. 统一zustand版本到最新稳定版
2. 将共享的devDependencies移到根package.json
3. 配置共享的工具配置文件

### 步骤4: 更新脚本和配置

1. 更新两个项目的脚本引用路径
2. 配置根级别的开发和构建脚本
3. 设置共享的工具配置

### 步骤5: 验证功能

1. 测试web-learner的开发服务器
2. 测试learn-linker的编译和打包
3. 验证所有功能正常工作

### 步骤6: 文档更新

1. 更新README.md
2. 添加Monorepo使用指南
3. 更新开发文档

## 下一步行动

由于当前处于Architect模式，我们只能编辑Markdown文件。为了执行实际的文件操作（如创建pnpm-workspace.yaml、移动目录等），我们需要切换到Code模式。

请批准切换到Code模式以继续执行Monorepo迁移计划。