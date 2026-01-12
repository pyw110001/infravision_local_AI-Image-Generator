<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Infravision - 本地 AI 图像生成界面

本项目是一个基于 React/Vite 构建的本地 AI 生成界面，与本地 **ComfyUI** 实例进行交互。

## 系统概览

- **前端**: React (Vite, TypeScript), TailwindCSS
- **后端/推理**: 本地 ComfyUI API (WebSocket + HTTP)
- **通信**: 使用标准 HTTP fetch 进行上传/排队，使用 WebSocket 监听状态

## 快速开始

### 前置要求

- **Node.js** (v18+)
- **ComfyUI** 已安装并配置

### 1. ComfyUI 配置（至关重要）

前端运行的源（例如 `localhost:5173`）与 ComfyUI（`127.0.0.1:8188`）不同，**必须** 开启 CORS。

#### 启动 ComfyUI 时添加 CORS 参数

**命令行启动:**
```bash
python main.py --enable-cors-header *
```

**Windows Bat 脚本启动:**
编辑您的 `.bat` 启动脚本，在末尾追加参数：
```batch
.\python_embeded\python.exe -s ComfyUI\main.py --windows-standalone-build --enable-cors-header *
```

**⚠️ 如果没有这个参数，前端将因 `403 Forbidden` 错误而无法连接。**

#### 模型依赖

工作流模板硬编码了特定的模型文件名，您必须确保以下模型已放置在 ComfyUI 的 models 文件夹中：

- **Checkpoint (SDXL)**: `juggernautXL_v9Rundiffusionphoto2.safetensors`
- **ControlNet**: `Union_sdxl_promaxl.safetensors`

> 如果使用不同的模型，请更新 `services/workflowTemplate.ts` 中的模型名称。

### 2. 前端配置

1. **安装依赖:**
   ```bash
   npm install
   ```

2. **配置 ComfyUI API 地址:**
   - 默认值: `http://127.0.0.1:8188`
   - 如有需要，请修改 `services/comfyService.ts` 中的 `COMFY_API_URL`

3. **运行应用:**
   ```bash
   npm run dev
   ```

## 常见问题排查

| 问题 | 症状 | 解决方案 |
| :--- | :--- | :--- |
| **连接失败** | "Connection refused" 或 403 Forbidden | 检查 ComfyUI 是否正在运行。**核实启动参数是否包含 `--enable-cors-header *`。** |
| **工作流错误** | "Required input is missing: images" | 检查 `workflowTemplate.ts`。确保 `SaveImage` 节点的输入已连接到 `VAEDecode` 的输出。 |
| **模型缺失** | ComfyUI 控制台错误: "Value not in list..." | `workflowTemplate.ts` 中的文件名与 `ComfyUI/models/...` 实际文件名不匹配。请更新代码或下载对应模型。 |
| **生成卡住** | WebSocket 已连接但无图像返回 | 检查 ComfyUI 服务端控制台是否有服务端错误（如显存不足 OOM，或缺少节点插件）。 |

## 部署前核对清单

- [ ] ComfyUI 已安装并运行
- [ ] 启动参数已包含 `--enable-cors-header *`
- [ ] 必需的 Checkpoint 和 ControlNet 模型已放置在 ComfyUI models 文件夹中
- [ ] `workflowTemplate.ts` 中的模型名与本地一致
- [ ] 确保前端服务已启动 (`npm run dev`)

## 技术架构

应用程序在客户端动态构建 ComfyUI 工作流：

1. **用户输入**: 用户选择风格，输入文本，上传参考图像
2. **预处理**: 图像文件上传到 ComfyUI `/upload/image` 接口
3. **图构建**: 加载模板，注入提示词、种子、ControlNet 图像等参数
4. **执行**: 构建好的 JSON 图发送到 `/prompt` 接口
5. **检索**: 前端监听 `executed` WebSocket 事件，解析结果，并通过 `/view` 接口获取最终图片

### 关键文件

- **`services/workflowTemplate.ts`**: 包含基于 JSON 的节点图模板
- **`services/comfyService.ts`**: 处理图像上传、工作流参数注入和 WebSocket 执行监控

---

更多详细信息请参考 [技术实施架构与部署指南.md](技术实施架构与部署指南.md)
