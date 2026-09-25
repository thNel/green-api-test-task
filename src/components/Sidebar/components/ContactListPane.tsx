import { useCallback } from 'react'
import { MagnifyingGlassIcon, UsersThreeIcon } from '@phosphor-icons/react'
import type { Chat } from '../../../domain/types'
import { ChatListItem } from './ChatListItem'
import styles from './ContactListPane.module.css'

type ContactListPaneProps = {
  contacts: Chat[]
  hasContacts: boolean
  activeChatId: string | null
  isLoading: boolean
  error: string
  onRetry: () => void
  onSelect: (chat: Chat) => void
  onRequestContactInfo: (chatId: string, type?: Chat['type']) => void
}

export function ContactListPane({
  contacts,
  hasContacts,
  activeChatId,
  isLoading,
  error,
  onRetry,
  onSelect,
  onRequestContactInfo,
}: ContactListPaneProps) {
  const selectContact = useCallback((chatId: string) => {
    const contact = contacts.find((item) => item.chatId === chatId)
    if (contact) onSelect(contact)
  }, [contacts, onSelect])

  return (
    <>
      {isLoading && <div className={styles.feedback} role="status">Загружаем контакты…</div>}
      {error && (
        <div className={`${styles.feedback} ${styles.error}`} role="alert">
          <span>Не удалось загрузить контакты: {error}</span>
          <button type="button" onClick={onRetry}>Повторить</button>
        </div>
      )}
      {!hasContacts && !isLoading && !error ? (
        <div className={styles.empty}>
          <UsersThreeIcon size={32} weight="duotone" aria-hidden="true" />
          <p>Контактов не найдено</p>
          <span>Проверьте телефонную книгу Telegram</span>
        </div>
      ) : hasContacts && contacts.length === 0 && !isLoading ? (
        <div className={styles.empty}>
          <MagnifyingGlassIcon size={30} aria-hidden="true" />
          <p>Совпадений нет</p>
          <span>Попробуйте изменить запрос</span>
        </div>
      ) : contacts.map((contact) => (
        <ChatListItem
          key={contact.chatId}
          chat={contact}
          active={activeChatId === contact.chatId}
          onSelect={selectContact}
          onRequestContactInfo={onRequestContactInfo}
        />
      ))}
    </>
  )
}
