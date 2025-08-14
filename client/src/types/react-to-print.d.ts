declare module 'react-to-print' {
  import React from 'react';

  export type ContentNode = Element | null;
  export type UseReactToPrintHookContent = () => ContentNode;

  export interface UseReactToPrintOptions {
    content: UseReactToPrintHookContent;
    documentTitle?: string;
    onAfterPrint?: () => void;
    onBeforeGetContent?: () => void | Promise<void>;
    onBeforePrint?: () => void | Promise<void>;
    onPrintError?: (error: Error) => void;
    removeAfterPrint?: boolean;
    suppressErrors?: boolean;
  }

  export type UseReactToPrintFn = () => void;

  export function useReactToPrint(options: UseReactToPrintOptions): UseReactToPrintFn;
}