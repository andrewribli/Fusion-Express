/**
 * Uncaught JS fatals go to RCTExceptionsManager, which abort()s the iOS
 * process on TestFlight. Capture them for an on-screen banner and skip the
 * default fatal handler in production.
 */

type Listener = (message: string) => void;

const listeners = new Set<Listener>();
let lastErrorMessage: string | null = null;

export function getLastGlobalError(): string | null {
  return lastErrorMessage;
}

export function subscribeGlobalErrors(listener: Listener): () => void {
  listeners.add(listener);
  if (lastErrorMessage) listener(lastErrorMessage);
  return () => {
    listeners.delete(listener);
  };
}

function publish(message: string) {
  lastErrorMessage = message;
  for (const listener of listeners) {
    try {
      listener(message);
    } catch {
      /* ignore */
    }
  }
}

const ErrorUtilsRef = (
  global as {
    ErrorUtils?: {
      getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void;
      setGlobalHandler?: (
        handler: (error: Error, isFatal?: boolean) => void,
      ) => void;
    };
  }
).ErrorUtils;

if (ErrorUtilsRef?.getGlobalHandler && ErrorUtilsRef.setGlobalHandler) {
  const defaultHandler = ErrorUtilsRef.getGlobalHandler();
  ErrorUtilsRef.setGlobalHandler((error: Error, isFatal?: boolean) => {
    const message = error?.message ?? String(error);
    console.error("[GRACERUN_GLOBAL_ERROR]", message, error?.stack);
    publish(isFatal ? `FATAL: ${message}` : message);
    if (__DEV__) {
      try {
        defaultHandler(error, isFatal);
      } catch {
        /* ignore */
      }
      return;
    }
    if (!isFatal) {
      try {
        defaultHandler(error, isFatal);
      } catch {
        /* ignore */
      }
    }
  });
}
