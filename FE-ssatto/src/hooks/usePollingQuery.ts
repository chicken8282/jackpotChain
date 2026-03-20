import { useEffect, useEffectEvent, useRef, useState } from "react";
import { shouldRunPolling, toPollingErrorMessage } from "./pollingHelpers";

interface UsePollingQueryOptions<TData> {
  enabled: boolean;
  intervalMs: number;
  initialData: TData;
  pauseWhenHidden?: boolean;
  loadingFallback?: boolean;
  errorFallback?: string;
  queryFn: (signal: AbortSignal) => Promise<TData>;
}

interface UsePollingQueryResult<TData> {
  data: TData;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePollingQuery<TData>({
  enabled,
  intervalMs,
  initialData,
  pauseWhenHidden = true,
  loadingFallback = true,
  errorFallback = "polling-query-failed",
  queryFn,
}: UsePollingQueryOptions<TData>): UsePollingQueryResult<TData> {
  const [data, setData] = useState<TData>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(loadingFallback && enabled);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const inFlightRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useEffectEvent(async (force = false) => {
    if (!force) {
      const visibilityState =
        typeof document === "undefined" ? undefined : document.visibilityState;
      if (!shouldRunPolling({ enabled, pauseWhenHidden, visibilityState })) {
        return;
      }
    }

    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (!hasLoadedRef.current) {
      setIsLoading(true);
    }

    try {
      const nextData = await queryFn(controller.signal);
      setData(nextData);
      setError(null);
      hasLoadedRef.current = true;
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      setError(toPollingErrorMessage(error, errorFallback));
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
      inFlightRef.current = false;
    }
  });

  useEffect(() => {
    if (!enabled) {
      abortControllerRef.current?.abort();
      inFlightRef.current = false;
      setIsLoading(false);
      setError(null);
      return;
    }

    void execute();
    const intervalId = window.setInterval(() => {
      void execute();
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
      abortControllerRef.current?.abort();
      inFlightRef.current = false;
    };
  }, [enabled, execute, intervalMs]);

  return {
    data,
    isLoading,
    error,
    refetch: async () => {
      await execute(true);
    },
  };
}
