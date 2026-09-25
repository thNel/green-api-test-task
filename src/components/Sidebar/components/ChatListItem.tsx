import { memo } from 'react'
import type { Chat } from '../../../domain/types'
import { ChatAvatar } from '../../../shared/components/ChatAvatar/ChatAvatar'
import styles from './ChatListItem.module.css'

type ChatListItemProps = {
  chat: Chat
  active: boolean
  onSelect: (chatId: string) => void
  onRequestContactInfo: (chatId: string, type?: Chat['type']) => void
}

export const ChatListItem = memo(function ChatListItem({
  chat,
  active,
  onSelect,
  onRequestContactInfo,
}: ChatListItemProps) {
  return (
    <button
      className={`${styles.item} ${active ? styles.active : ''}`}
      type="button"
      onClick={() => onSelect(chat.chatId)}
    >
      <ChatAvatar chat={chat} onRequestContactInfo={onRequestContactInfo} />
      <span className={styles.copy}>
        <strong>{chat.title}</strong>
        <span>{chat.subtitle}</span>
      </span>
    </button>
  )
})
