import { ChatHeader } from './components/ChatHeader'
import { EmptyChatView } from './components/EmptyChatView'
import { MessageComposer } from './components/MessageComposer'
import { MessageList } from './components/MessageList'
import type { Chat, ChatMessage } from '../../domain/types'
import styles from './ChatView.module.css'

export type ChatViewProps = {
  chat: Chat | null
  messages: ChatMessage[]
  sendError: string
  isLoadingHistory: boolean
  historyError: string
  mobileVisible: boolean
  onBack: () => void
  onSend: (message: string) => Promise<void>
  onRetryHistory: () => void
  onRequestContactInfo: (chatId: string, type?: Chat['type']) => void
}

export function ChatView({
  chat,
  messages,
  sendError,
  isLoadingHistory,
  historyError,
  mobileVisible,
  onBack,
  onSend,
  onRetryHistory,
  onRequestContactInfo,
}: ChatViewProps) {
  if (!chat) return <EmptyChatView mobileVisible={mobileVisible} />

  return (
    <main className={`${styles.root} ${mobileVisible ? styles.mobileVisible : ''}`}>
      <ChatHeader
        chat={chat}
        onBack={onBack}
        onRequestContactInfo={onRequestContactInfo}
      />
      <div className={styles.stage}>
        <div className={styles.wallpaper} aria-hidden="true" />
        <MessageList
          messages={messages}
          isLoading={isLoadingHistory}
          error={historyError}
          onRetry={onRetryHistory}
        />
      </div>
      <MessageComposer sendError={sendError} onSend={onSend} />
    </main>
  )
}
