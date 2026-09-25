import { ChatsCircleIcon } from '@phosphor-icons/react'
import type { Chat } from '../../../domain/types'
import { ChatListItem } from './ChatListItem'
import styles from './ChatListPane.module.css'

type ChatListPaneProps = {
  chats: Chat[]
  activeChatId: string | null
  isLoading: boolean
  error: string
  onRetry: () => void
  onSelect: (chatId: string) => void
  onRequestContactInfo: (chatId: string, type?: Chat['type']) => void
}

export function ChatListPane({
  chats,
  activeChatId,
  isLoading,
  error,
  onRetry,
  onSelect,
  onRequestContactInfo,
}: ChatListPaneProps) {
  return (
    <>
      {isLoading && <div className={styles.feedback} role="status">Загружаем чаты…</div>}
      {error && (
        <div className={`${styles.feedback} ${styles.error}`} role="alert">
          <span>Не удалось загрузить список чатов: {error}</span>
          <button type="button" onClick={onRetry}>Повторить</button>
        </div>
      )}
      {chats.length === 0 && !isLoading && !error ? (
        <div className={styles.empty}>
          <ChatsCircleIcon size={32} weight="duotone" aria-hidden="true" />
          <p>Создайте первый чат</p>
          <span>Найдите человека по номеру или username</span>
        </div>
      ) : chats.map((chat) => (
        <ChatListItem
          key={chat.chatId}
          chat={chat}
          active={activeChatId === chat.chatId}
          onSelect={onSelect}
          onRequestContactInfo={onRequestContactInfo}
        />
      ))}
    </>
  )
}
