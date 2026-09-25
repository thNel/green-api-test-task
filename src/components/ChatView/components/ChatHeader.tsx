import { ArrowLeftIcon, DotsThreeVerticalIcon } from '@phosphor-icons/react'
import { ChatAvatar } from '../../../shared/components/ChatAvatar/ChatAvatar'
import type { Chat } from '../../../domain/types'
import styles from './ChatHeader.module.css'

type ChatHeaderProps = {
  chat: Chat
  onBack: () => void
  onRequestContactInfo: (chatId: string, type?: Chat['type']) => void
}

export function ChatHeader({ chat, onBack, onRequestContactInfo }: ChatHeaderProps) {
  return (
    <header className={styles.header}>
      <button
        className={styles.back}
        type="button"
        onClick={onBack}
        aria-label="Назад к чатам"
      >
        <ArrowLeftIcon size={22} />
      </button>
      <ChatAvatar chat={chat} compact onRequestContactInfo={onRequestContactInfo} />
      <div className={styles.heading}>
        <strong>{chat.title}</strong>
        <span>Telegram</span>
      </div>
      <button className={styles.menu} type="button" aria-label="Меню чата">
        <DotsThreeVerticalIcon size={23} weight="bold" />
      </button>
    </header>
  )
}
