import { useOpenAiGlobal } from "./use-openai-global";
import { useEffect, useState } from "react";

export function useWidgetProps<T extends Record<string, unknown>>(
  defaultState?: T | (() => T)
): T {
  const toolOutput = useOpenAiGlobal("toolOutput") as any;
  
  // Also check for props injected via window.__WIDGET_PROPS__ (used by ZeroTwo renderer)
  const [injectedProps, setInjectedProps] = useState<T | undefined>(() => {
    if (typeof window !== 'undefined' && (window as any).__WIDGET_PROPS__) {
      return (window as any).__WIDGET_PROPS__ as T;
    }
    return undefined;
  });

  useEffect(() => {
    // Listen for props updates
    if (typeof window !== 'undefined' && (window as any).__WIDGET_PROPS__) {
      setInjectedProps((window as any).__WIDGET_PROPS__ as T);
    }
  }, []);
  
  // Extract structuredContent from toolOutput
  // toolOutput can be structured in multiple ways:
  // 1. toolOutput.structuredContent (direct property)
  // 2. toolOutput.result.structuredContent (nested in result)
  // 3. toolOutput itself is the structuredContent (already extracted)
  // 4. null/undefined if tool hasn't completed yet
  let props: T | undefined;
  
  // First check injected props (highest priority - directly injected by renderer)
  if (injectedProps) {
    props = injectedProps;
  }
  // Then check toolOutput
  else if (toolOutput) {
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

