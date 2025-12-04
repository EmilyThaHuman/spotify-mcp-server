import { useOpenAiGlobal } from "./use-openai-global";

export function useWidgetProps<T extends Record<string, unknown>>(
  defaultState?: T | (() => T)
): T {
  const toolOutput = useOpenAiGlobal("toolOutput") as any;
  
  // Extract structuredContent from toolOutput
  // toolOutput can be structured in multiple ways:
  // 1. toolOutput.structuredContent (direct property)
  // 2. toolOutput.result.structuredContent (nested in result)
  // 3. toolOutput itself is the structuredContent (already extracted)
  // 4. null/undefined if tool hasn't completed yet
  let props: T | undefined;
  
  if (toolOutput) {
    // Check if toolOutput has structuredContent property
    if (toolOutput.structuredContent) {
      props = toolOutput.structuredContent as T;
    } 
    // Check if nested in result property (common in some widget systems)
    else if (toolOutput.result?.structuredContent) {
      props = toolOutput.result.structuredContent as T;
    }
    // Check if toolOutput itself is the structuredContent (already extracted)
    // Look for common properties that indicate it's the structured content
    else if (
      toolOutput.query !== undefined || 
      toolOutput.results !== undefined ||
      toolOutput.properties !== undefined ||
      toolOutput.designs !== undefined ||
      toolOutput.courses !== undefined ||
      toolOutput.hotels !== undefined ||
      toolOutput.flights !== undefined ||
      toolOutput.bookings !== undefined ||
      toolOutput.diagram !== undefined
    ) {
      props = toolOutput as T;
    }
  }

  const fallback =
    typeof defaultState === "function"
      ? (defaultState as () => T)()
      : defaultState;

  return (props ?? fallback) as T;
}

