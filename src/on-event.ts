import {
  onDestroy,
  onMount,
} from "https://raw.githubusercontent.com/mini-jail/signal/main/mod.ts"

export function onEvent<T extends keyof GlobalEventHandlersEventMap>(
  name: T,
  callback: (event: GlobalEventHandlersEventMap[T]) => void,
  options?: EventListenerOptions,
): void {
  onMount(() => addEventListener(name, callback, options))
  onDestroy(() => removeEventListener(name, callback, options))
}
