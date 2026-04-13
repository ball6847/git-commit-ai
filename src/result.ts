export interface Result<T, E = Error> {
  ok: boolean;
  value?: T;
  error?: E;
}

export function wrap<T>(fn: () => T): Result<T, Error> {
  try {
    return { ok: true, value: fn() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

export async function wrapAsync<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

export function unwrap<T>(result: Result<T>): T {
  if (result.ok) return result.value as T;
  throw result.error as Error;
}

export function map<T, U>(result: Result<T>, fn: (value: T) => U): Result<U> {
  if (result.ok) {
    try {
      return { ok: true, value: fn(result.value as T) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  } else {
    return { ok: false, error: result.error as Error };
  }
}

export function andThen<T, U>(
  result: Result<T>,
  fn: (value: T) => Result<U>,
): Result<U> {
  if (result.ok) {
    return fn(result.value as T);
  } else {
    return { ok: false, error: result.error as Error };
  }
}

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
