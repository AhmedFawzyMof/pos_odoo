/**
 * A utility wrapper for async functions that returns a [error, data] tuple.
 * Eliminates repetitive try/catch blocks throughout the codebase.
 *
 * @example
 * const [err, user] = await tryCatch(fetchUser(id));
 * if (err) { handle error... }
 * // user is safely typed here
 */
export async function tryCatch<T>(
  promise: Promise<T>,
): Promise<[Error, null] | [null, T]> {
  try {
    const data = await promise;
    return [null, data];
  } catch (err) {
    return [err instanceof Error ? err : new Error(String(err)), null];
  }
}
