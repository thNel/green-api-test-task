import { useEffect, type RefObject } from 'react'
import type { ChatMessage } from '../../../domain/types'

export function useMessageScroll(
  elementRef: RefObject<HTMLDivElement | null>,
  messages: ChatMessage[],
) {
  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const behavior = reduceMotion ? 'auto' : 'smooth'
    elementRef.current?.scrollTo({
      top: elementRef.current.scrollHeight,
      behavior,
    })
  }, [elementRef, messages])
}
