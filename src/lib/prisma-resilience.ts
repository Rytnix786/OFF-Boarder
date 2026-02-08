import "server-only";

type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
};

function isTransientPrismaConnectionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lowered = message.toLowerCase();

  return (
    lowered.includes("timeout exceeded when trying to connect") ||
    lowered.includes("timed out fetching a new connection") ||
    lowered.includes("can't reach database server") ||
    lowered.includes("connection terminated unexpectedly") ||
    lowered.includes("econnreset") ||
    lowered.includes("econnrefused") ||
    lowered.includes("p1001")
  );
}

export async function withPrismaRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const retries = options.retries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 250;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt >= retries || !isTransientPrismaConnectionError(error)) {
        throw error;
      }

      const delay = baseDelayMs * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
