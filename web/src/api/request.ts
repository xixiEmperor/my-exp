interface Options {
  // 请求的相对路径
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';
  headers?: Record<string, string>;
  body?: object;
  credentials?: 'include' | 'omit' | 'same-origin';
  signal?: AbortSignal;
}

const testBaseUrl = 'http://localhost:8080/api/v1';

export const request = async (options: Options) => {
  const res = await fetch(`${testBaseUrl}${options.path}`, {
    method: options.method ?? 'GET',
    headers: options.headers,
    body: JSON.stringify(options.body),
    credentials: options.credentials,
    signal: options.signal,
  });

  return res.json();
};
