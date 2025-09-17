# Moonshot Translation (Raycast Extension)

使用 Moonshot (Kimi) Chat Completions API 的双语翻译 Raycast 扩展。

输入中英文自动识别：
* 输入中文 -> 返回多条英文释义（编号列表）
* 输入英文 -> 返回多条中文释义（编号列表）

## 安装 & 开发

1. 克隆仓库后安装依赖
```bash
npm install
```
2. 启动开发模式
```bash
npm run dev
```

Raycast 会自动加载该扩展。

## 配置 API Key

1. 前往 Moonshot 平台获取 API Key: https://platform.moonshot.cn
2. 在 Raycast 中打开扩展偏好设置 (⌘ , -> Extensions -> 本扩展) 填写：
	* Moonshot API Key (必填, 形如 `sk-...`)
	* Model (可选，默认 `moonshot-v1-8k`)

## 使用方式

1. 打开命令 `translate`
2. 在顶部 Raycast 搜索栏输入内容（支持中英文自动识别）：
	* 停顿 ~0.5 秒后自动开始【流式输出】
	* 或按回车同样会进入 debounce 后触发
3. 结果实时以增量形式显示在列表详情 (⌘L 可展开/折叠详情)
4. Action 面板可：复制结果 / 取消流式输出

## 可配置模型

在偏好设置里可自定义 `model`，例如：
* `moonshot-v1-8k`
* `moonshot-v1-32k`
* `moonshot-v1-128k`

## 流式 & 错误处理

* 采用 SSE (Server-Sent Events) 解析增量 delta
* 中途切换输入或再次提交会自动取消前一个请求 (AbortController)
* 可手动点击 “取消流式输出” 中止
* 未配置 API Key 会提示并阻止请求
* HTTP 错误会显示状态码与部分错误信息（截断 200 字符）
* 响应结构异常或空内容会提示

## 安全注意

* API Key 不会被写入源码
* 使用 Raycast Preferences 安全存储

## 发布到 Raycast Store（可选）

确保已移除任何硬编码密钥，然后执行：
```bash
npm run publish
```

## 许可证

MIT