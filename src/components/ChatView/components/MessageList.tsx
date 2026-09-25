import { Fragment, useRef } from 'react'
import { CheckIcon, ChecksIcon, WarningCircleIcon } from '@phosphor-icons/react'
import type { ChatMessage } from '../../../domain/types'
import { useMessageScroll } from '../hooks/useMessageScroll'
import styles from './MessageList.module.css'

type MessageListProps = {
  messages: ChatMessage[]
  isLoading: boolean
  error: string
  onRetry: () => void
}

const formatTime = (timestamp: number) =>
  new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)

const getDayKey = (timestamp: number) => {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

const formatDay = (timestamp: number) => {
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (getDayKey(timestamp) === getDayKey(today.getTime())) return 'Сегодня'
  if (getDayKey(timestamp) === getDayKey(yesterday.getTime())) return 'Вчера'

  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
  if (date.getFullYear() !== today.getFullYear()) options.year = 'numeric'
  return new Intl.DateTimeFormat('ru-RU', options).format(date)
}

function MessageRow({ message }: { message: ChatMessage }) {
  const failed = message.status === 'failed'
  return (
    <div className={`${styles.row} ${message.direction === 'outgoing' ? styles.outgoing : ''}`}>
      <div className={`${styles.bubble} ${failed ? styles.failed : ''}`}>
        <span>{message.text}</span>
        <span className={`${styles.meta} ${failed ? styles.failedMeta : ''}`}>
          {formatTime(message.timestamp)}
          {message.direction === 'outgoing' && (
            failed ? (
              <span className={styles.deliveryFailed} title={message.failureReason || 'Сообщение не доставлено'}>
                <WarningCircleIcon size={15} weight="fill" aria-hidden="true" />
                Не доставлено
              </span>
            ) : message.status === 'sent' ? (
              <ChecksIcon size={17} weight="bold" aria-label="Отправлено" />
            ) : (
              <CheckIcon size={16} weight="bold" aria-label="Отправляется" />
            )
          )}
        </span>
      </div>
    </div>
  )
}

export function MessageList({ messages, isLoading, error, onRetry }: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  useMessageScroll(listRef, messages)

  return (
    <div className={styles.list} ref={listRef} aria-live="polite">
      {isLoading && (
        <div className={styles.loader} role="status">
          <span className={styles.srOnly}>Загружаем историю сообщений</span>
          <span className={styles.loaderDots} aria-hidden="true">
            <span>.</span><span>.</span><span>.</span>
          </span>
        </div>
      )}
      {error && (
        <div className={styles.loadError} role="alert">
          <span>Не удалось загрузить историю: {error}</span>
          <button className={styles.retryButton} type="button" onClick={onRetry}>
            Повторить
          </button>
        </div>
      )}
      {messages.length === 0 && !isLoading && !error ? (
        <div className={styles.conversationEmpty}>
          <strong>Чат создан</strong>
          <span>Напишите первое текстовое сообщение</span>
        </div>
      ) : messages.map((message, index) => {
        const dayKey = getDayKey(message.timestamp)
        const previousDayKey = index > 0 ? getDayKey(messages[index - 1].timestamp) : null
        return (
          <Fragment key={`${message.chatId}-${message.id}`}>
            {dayKey !== previousDayKey && (
              <div className={styles.date}>{formatDay(message.timestamp)}</div>
            )}
            <MessageRow message={message} />
          </Fragment>
        )
      })}
    </div>
  )
}
