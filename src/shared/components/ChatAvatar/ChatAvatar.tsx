import { useEffect, useRef, useState } from 'react'
import type { Chat } from '../../../domain/types'
import styles from './ChatAvatar.module.css'

type ChatAvatarProps = {
  chat: Chat
  compact?: boolean
  onRequestContactInfo?: (chatId: string, type?: Chat['type']) => void
}

const getInitials = (title: string) =>
  title
    .replace('@', '')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

export function ChatAvatar({ chat, compact = false, onRequestContactInfo }: ChatAvatarProps) {
  const avatarRef = useRef<HTMLSpanElement>(null)
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null)
  const hasImageError = Boolean(chat.avatar && failedAvatarUrl === chat.avatar)

  useEffect(() => {
    if (!onRequestContactInfo || chat.avatar) return

    const element = avatarRef.current
    if (!element || typeof IntersectionObserver === 'undefined') {
      onRequestContactInfo(chat.chatId, chat.type)
      return
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        onRequestContactInfo(chat.chatId, chat.type)
        observer.disconnect()
      }
    }, { rootMargin: '96px' })

    observer.observe(element)
    return () => observer.disconnect()
  }, [chat.avatar, chat.chatId, chat.type, onRequestContactInfo])

  return (
    <span
      ref={avatarRef}
      className={`${styles.avatar} ${compact ? styles.compact : ''}`}
      aria-hidden="true"
    >
      {chat.avatar && !hasImageError ? (
        <img
          src={chat.avatar}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedAvatarUrl(chat.avatar || null)}
        />
      ) : getInitials(chat.title)}
    </span>
  )
}
