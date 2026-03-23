function normalizeBaseUrl(value: string | undefined) {
  return (value?.trim() || "https://api.deepseek.com").replace(/\/$/, "");
}

function normalizeTimeout(value: string | undefined) {
  const parsed = Number.parseInt(value?.trim() || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15000;
}

export const deepSeekEnv = {
  apiKey: process.env.DEEPSEEK_API_KEY?.trim() ?? "",
  model: process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat",
  baseUrl: normalizeBaseUrl(process.env.DEEPSEEK_BASE_URL),
  timeoutMs: normalizeTimeout(process.env.DEEPSEEK_TIMEOUT_MS),
};

export function hasDeepSeekEnv() {
  return Boolean(deepSeekEnv.apiKey);
}
