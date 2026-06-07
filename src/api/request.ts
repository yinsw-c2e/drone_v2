export interface ApiResult<T> {
  ok: boolean;
  data: T;
}

export async function requestMock<T>(data: T): Promise<ApiResult<T>> {
  return { ok: true, data };
}
