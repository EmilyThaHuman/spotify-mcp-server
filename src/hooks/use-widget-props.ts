import { useOpenAiGlobal } from "./use-openai-global";

export function useWidgetProps<T extends Record<string, unknown>>(
  defaultState?: T | (() => T)
): T {
  const toolOutput = useOpenAiGlobal("toolOutput") as any;
  
  // Extract structuredContent from toolOutput if it exists
  const props = toolOutput?.structuredContent as T | undefined;

  const fallback =
    typeof defaultState === "function"
      ? (defaultState as () => T | null)()
      : defaultState ?? null;

  return props ?? fallback;
}

