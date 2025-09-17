import { ActionPanel, Action, List, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef } from "react";

// 系统定义 prompt
const SYSTEM_PROMPT = "You are a bilingual dictionary. If the input is in Chinese, provide English translations with multiple meanings. If the input is in English, provide Chinese translations with multiple meanings. Present each translation as a numbered list. Do not include any other text, explanations, or conversational fillers.";
// Moonshot API 端点
const MOONSHOT_API_URL = "https://api.moonshot.cn/v1/chat/completions";

interface Preferences {
	api_key?: string;
	model?: string;
}

export default function Command() {
			const [input, setInput] = useState("");
			const [result, setResult] = useState("");
			const [loading, setLoading] = useState(false);
			const timerRef = useRef<any>(null);
			const abortRef = useRef<AbortController | null>(null);

		// 0.5s 停顿自动调用（List 搜索栏输入）
		useEffect(() => {
			if (!input) return;
			if (timerRef.current) clearTimeout(timerRef.current);
			timerRef.current = setTimeout(() => {
				callKimi(input);
			}, 500);
			return () => {
				if (timerRef.current) clearTimeout(timerRef.current);
			};
		}, [input]);

// List 的搜索栏回车也会触发 onSearchTextChange 之后的 debounce, 单独不再需要显式 submit

		async function callKimi(text: string) {
			// 如果已有流请求，先中止
			if (abortRef.current) {
				abortRef.current.abort();
			}
			abortRef.current = new AbortController();
			setLoading(true);
			setResult("");
			try {
				const { api_key, model } = getPreferenceValues<Preferences>();
				if (!api_key) {
					await showToast({ style: Toast.Style.Failure, title: "缺少 API Key", message: "请先在 Raycast 偏好设置里填写 Moonshot API Key" });
					setResult("未配置 API Key");
					return;
				}
				const res = await fetch(MOONSHOT_API_URL, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Authorization": `Bearer ${api_key}`,
					},
					body: JSON.stringify({
						model: model || "moonshot-v1-8k",
						messages: [
							{ role: "system", content: SYSTEM_PROMPT },
							{ role: "user", content: text },
						],
						stream: true,
					}),
					signal: abortRef.current.signal,
				});
				if (!res.ok || !res.body) {
					const errorText = await res.text();
					await showToast({ style: Toast.Style.Failure, title: `HTTP ${res.status}`, message: errorText.slice(0, 200) });
					setResult(`请求失败: ${res.status} ${res.statusText}\n${errorText}`);
					return;
				}
				const reader = res.body.getReader();
				const decoder = new TextDecoder("utf-8");
				let buffer = "";
				let finalText = "";
				while (true) {
					const { value, done } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					// 按行分割处理 SSE data: 前缀
					const lines = buffer.split(/\n/);
					// 最后一行可能不完整，暂存
					buffer = lines.pop() || "";
					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed) continue;
						if (trimmed === "data: [DONE]") {
							buffer = ""; // 结束
							break;
						}
						if (trimmed.startsWith("data:")) {
							const jsonStr = trimmed.slice(5).trim();
							try {
								const evt = JSON.parse(jsonStr);
								const delta = evt?.choices?.[0]?.delta?.content;
								if (typeof delta === "string") {
									finalText += delta;
									setResult(finalText);
								}
							} catch (_) {
								// 忽略单条解析错误
							}
						}
					}
				}
				// 去掉可能的首尾空白
				if (finalText.trim().length === 0) {
					await showToast({ style: Toast.Style.Failure, title: "无流式内容" });
					setResult("(空响应)");
				}
			} catch (e) {
				setResult("API 调用失败: " + String(e));
			}
			setLoading(false);
		}

		return (
			<List
				isLoading={loading}
				isShowingDetail
				searchBarPlaceholder="输入内容，停顿自动流式翻译 (0.5s)"
				onSearchTextChange={(t) => setInput(t.trim())}
				searchText={input}
			>
				<List.Section title="翻译结果">
					{result ? (
						<List.Item
							id="result"
							title={result.split(/\n/)[0] || "结果"}
							subtitle={loading ? "流式生成中..." : "完成"}
							accessoryTitle={loading ? "…" : undefined}
							detail={<List.Item.Detail markdown={"```\n" + result + "\n```"} />}
							actions={
								<ActionPanel>
									<Action.CopyToClipboard title="复制结果" content={result} />
									{loading && (
										<Action
											title="取消流式输出"
											onAction={() => {
												if (abortRef.current) abortRef.current.abort();
												setLoading(false);
											}}
										/>
									)}
								</ActionPanel>
							}
						/>
					) : (
						<List.Item
							id="placeholder"
							title={loading ? "正在生成..." : (input ? "等待流式响应..." : "请输入要翻译的文本")}
							subtitle={input ? (loading ? "处理中" : "即将请求") : ""}
							accessoryTitle={loading ? "…" : undefined}
						/>
					)}
				</List.Section>
			</List>
		);
	}
