export class ApiRequestError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, options: { status: number; code?: string; details?: unknown }) {
    super(message);
    this.name = "ApiRequestError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  const data = (await response.json().catch(() => null)) as
    | T
    | {
        error?: string;
        errorCode?: string;
      }
    | null;

  if (!response.ok) {
    throw new ApiRequestError(
      typeof data === "object" && data && "error" in data ? data.error || "请求失败" : "请求失败",
      {
        status: response.status,
        code: typeof data === "object" && data && "errorCode" in data ? data.errorCode : undefined,
        details: data,
      },
    );
  }

  return data as T;
}
