# Context Shell Runner

在 VS Code 资源管理器中通过**右键上下文**执行自定义 Shell 命令。

解决了现有命令执行类插件的核心缺陷：
- 无法获取 Explorer 中"右键的真实资源"
- 无法区分右键的是文件还是文件夹
- 只能依赖当前选中项（selection），而非右键上下文（context）

## 功能特性

- 在 VS Code Explorer 中**右键文件或文件夹**
- 精确获取被右键资源的路径（URI）
- 判断资源类型（文件 / 文件夹）
- **路径过滤** - 根据路径包含字符串或 glob 模式显示/隐藏命令
- 根据用户配置执行自定义 Shell 命令
- 将路径、类型等信息注入到命令中

## 使用方法

1. 在资源管理器中**右键**任意文件或文件夹
2. 选择 **Context Shell Runner: Run**
3. 从弹出的命令列表中选择要执行的命令
4. 命令将在终端中执行

## 快速开始

插件默认**没有配置任何命令**，需要在 `settings.json` 中添加你的命令。以下是一些示例：

```json
{
  "contextShellRunner.commands": {
    "show-path": {
      "description": "显示资源完整路径",
      "command": "echo '完整路径: ${path}'"
    },
    "list-files": {
      "description": "列出文件夹内容",
      "command": "ls -la",
      "when": "folder"
    }
  }
}
```

## 支持的变量

在命令中可以使用以下变量，执行时会自动替换为实际值：

| 变量 | 说明 |
|------|------|
| `${path}` | 右键资源的**完整绝对路径** |
| `${dir}` | 资源所在**目录**（文件返回父目录，文件夹返回自身路径） |
| `${name}` | 资源的**文件名或文件夹名**（不含路径） |
| `${isFile}` | 是否为文件（`true` / `false`） |
| `${isFolder}` | 是否为文件夹（`true` / `false`） |
| `${workspace}` | 当前 VS Code **工作区根目录**路径 |

## 配置说明

在 `settings.json` 中配置 `contextShellRunner.commands`：

```json
{
  "contextShellRunner.commands": {
    "命令ID": {
      "description": "命令描述（显示在选择菜单中）",
      "command": "要执行的 shell 命令",
      "when": "file | folder | any",
      "shell": "bash",
      "loginShell": false
    }
  }
}
```

### 配置字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `description` | ✅ | 命令描述，显示在 QuickPick 选择菜单中 |
| `command` | ✅ | 要执行的 shell 命令，支持变量替换 |
| `when` | ❌ | 命令可用范围：`file`（仅文件）、`folder`（仅文件夹）、`any`（默认，两者皆可） |
| `pathContains` | ❌ | 路径必须**包含**指定字符串才显示命令（支持字符串或字符串数组） |
| `pathPattern` | ❌ | 路径必须匹配 **glob 模式**才显示命令（支持字符串或字符串数组） |
| `shell` | ❌ | 使用的 shell 程序，默认 `bash`，可选 `sh`、`zsh` 等 |
| `loginShell` | ❌ | 是否使用登录 shell：`true` → `bash -lc`（加载 .bash_profile 等配置），`false` → `bash -c`（默认） |

## 配置示例

### go-zero 代码生成（带路径过滤）

只在 `proto` 目录下显示 RPC 生成命令，只在 `api` 目录下显示 API 生成命令：

```json
{
  "contextShellRunner.commands": {
    "gozero-rpc": {
      "description": "Generate go-zero rpc",
      "command": "goctl rpc protoc *.proto --go_out=../ --go-grpc_out=../ --zrpc_out=../ -style=goZero",
      "when": "folder",
      "pathContains": "proto",
      "shell": "bash",
      "loginShell": true
    },
    "gozero-api": {
      "description": "Generate go-zero api",
      "command": "goctl api go -api *.api -dir ../ -style=goZero",
      "when": "folder",
      "pathContains": "api"
    }
  }
}
```

### 路径过滤示例

```json
{
  "contextShellRunner.commands": {
    "proto-lint": {
      "description": "Lint proto files",
      "command": "buf lint",
      "pathContains": "proto"
    },
    "npm-install": {
      "description": "npm install",
      "command": "npm install",
      "pathPattern": "**/package.json"
    },
    "docker-build": {
      "description": "Docker Build",
      "command": "docker build -t ${name} .",
      "pathPattern": ["**/Dockerfile", "**/docker-compose.yml"]
    },
    "go-test": {
      "description": "Go Test",
      "command": "go test ./...",
      "pathContains": ["_test.go", "go.mod"]
    }
  }
}
```

### 常用工具命令

```json
{
  "contextShellRunner.commands": {
    "open-in-finder": {
      "description": "在 Finder 中打开",
      "command": "open '${dir}'",
      "when": "any"
    },
    "copy-path": {
      "description": "复制路径到剪贴板",
      "command": "echo -n '${path}' | pbcopy && echo '已复制: ${path}'",
      "when": "any"
    },
    "git-log": {
      "description": "查看文件 Git 历史",
      "command": "git log --oneline -20 '${path}'",
      "when": "file"
    },
    "docker-build": {
      "description": "Docker 构建镜像",
      "command": "docker build -t ${name}:latest .",
      "when": "folder"
    }
  }
}
```

## 应用场景

- **go-zero api / rpc 代码生成** - 右键 proto/api 目录直接生成代码
- **Docker 镜像构建** - 右键项目目录执行构建
- **Git 操作** - 查看文件历史、blame 等
- **文件处理** - 压缩、转换、上传等自动化脚本
- **自定义脚本** - 任何可以通过 shell 执行的操作

## Release Notes

### 0.0.2

- 新增 `pathContains` 配置：根据路径包含字符串过滤命令
- 新增 `pathPattern` 配置：根据 glob 模式匹配过滤命令
- 支持数组形式配置多个匹配规则

### 0.0.1

- 初始版本发布
- 支持文件/文件夹右键上下文
- 支持 6 种变量替换
- 支持自定义 shell 和登录 shell
- 内置 4 个示例命令
