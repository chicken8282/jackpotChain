export interface PollingVisibilityOptions {
  enabled: boolean;
  pauseWhenHidden: boolean;
  visibilityState?: DocumentVisibilityState;
}

export function shouldRunPolling({
  enabled,
  pauseWhenHidden,
  visibilityState,
}: PollingVisibilityOptions): boolean {
  if (!enabled) {
    return false;
  }

  if (!pauseWhenHidden) {
    return true;
  }

  if (visibilityState) {
    return visibilityState !== "hidden";
  }

  if (typeof document === "undefined") {
    return true;
  }

  return document.visibilityState !== "hidden";
}

export function toPollingErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
