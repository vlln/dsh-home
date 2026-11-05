/** One native release owner, installed before a gesture is published to React. No DOM/React imports. */
export interface ReleaseEvent extends Event {
  pointerId?: number
  pointerType?: string
  button?: number
  buttons?: number
  relatedTarget?: EventTarget | null
}
export interface ReleaseTargets {
  window: EventTarget
  document: EventTarget
  documentElement: EventTarget | null
}
export function observeDragRelease(targets: ReleaseTargets, options: {
  transport: 'pointer' | 'mouse' | 'touch'
  pointerId?: number
  touch?: boolean
  onRelease: (event: ReleaseEvent) => void
  onCancel: () => void
}): () => void {
  let ended = false
  const listeners: Array<[EventTarget, string, EventListener]> = []
  const clear = (): void => {
    ended = true
    for (const [target, type, listener] of listeners) target.removeEventListener(type, listener, true)
  }
  const matches = (event: ReleaseEvent): boolean => event.pointerId === undefined || event.pointerId === options.pointerId
  const end = (event: ReleaseEvent, release: boolean): void => {
    if (ended || !matches(event)) return
    clear()
    if (release) options.onRelease(event)
    else options.onCancel()
  }
  const listen = (target: EventTarget, type: string, listener: (event: ReleaseEvent) => void): void => {
    listeners.push([target, type, listener as EventListener])
    target.addEventListener(type, listener as EventListener, true)
  }
  const release = (event: ReleaseEvent): void => {
    if (event.button !== undefined && event.button !== 0) return
    end(event, true)
  }
  if (options.transport === 'pointer') {
    listen(targets.window, 'pointerup', release)
    listen(targets.window, 'pointercancel', event => end(event, false))
    // A compatible mouseup also ends the gesture if another window listener swallowed pointerup.
    if (!options.touch) listen(targets.window, 'mouseup', release)
    listen(targets.window, 'pointermove', event => {
      // A missed release must cancel, never create from the last accepted ghost position.
      if (event.pointerType !== 'touch' && event.buttons !== undefined && !(event.buttons & 1)) end(event, false)
    })
  } else if (options.transport === 'mouse') {
    listen(targets.window, 'mouseup', release)
    listen(targets.window, 'mousemove', event => {
      if (event.buttons !== undefined && !(event.buttons & 1)) end(event, false)
    })
  } else {
    listen(targets.window, 'touchend', release)
    listen(targets.window, 'touchcancel', event => end(event, false))
  }
  listen(targets.window, 'blur', event => end(event, false))
  listen(targets.document, 'mouseleave', event => {
    // Ignore descendant mouseleave; crossing the library/desktop boundary is not cancellation.
    if ((event.target === targets.document || event.target === targets.documentElement) && event.relatedTarget == null) end(event, false)
  })
  return clear
}
