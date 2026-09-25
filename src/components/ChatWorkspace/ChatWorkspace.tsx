import { WarningCircleIcon } from '@phosphor-icons/react'
import { Sidebar } from '../Sidebar/Sidebar'
import { ChatView } from '../ChatView/ChatView'
import { useChatWorkspace } from './hooks/useChatWorkspace'
import styles from './ChatWorkspace.module.css'

type ChatWorkspaceProps = {
  sessionId: string
  onDisconnect: () => void
}

export function ChatWorkspace({ sessionId, onDisconnect }: ChatWorkspaceProps) {
  const workspace = useChatWorkspace(sessionId)

  return (
    <div
      className={`${styles.shell} ${workspace.isMobileChatOpen ? styles.mobileChatOpen : ''}`}
    >
      <Sidebar
        chats={workspace.chats}
        contacts={workspace.contacts}
        activeChatId={workspace.activeChatId}
        isLoadingChats={workspace.chatListLoading}
        chatListError={workspace.chatListError}
        isLoadingContacts={workspace.contactsLoading}
        contactsError={workspace.contactsError}
        isCreatingChat={workspace.isCreatingChat}
        createChatError={workspace.createChatError}
        onCreateChat={workspace.createChat}
        onRetryLoadChats={workspace.reload}
        onRetryLoadContacts={workspace.reload}
        onRequestContactInfo={workspace.requestContactInfo}
        onStartContactChat={workspace.startContactChat}
        onSelectChat={workspace.selectChat}
        onDisconnect={onDisconnect}
      />
      <ChatView
        chat={workspace.activeChat}
        messages={workspace.messages}
        sendError={workspace.sendError}
        isLoadingHistory={workspace.historyLoading}
        historyError={workspace.historyError}
        mobileVisible={workspace.isMobileChatOpen}
        onBack={() => workspace.setMobileChatOpen(false)}
        onSend={workspace.send}
        onRetryHistory={workspace.retryHistory}
        onRequestContactInfo={workspace.requestContactInfo}
      />
      {workspace.pollingError && (
        <div className={styles.pollingAlert} role="status">
          <WarningCircleIcon size={18} weight="fill" />
          {workspace.pollingError}
        </div>
      )}
    </div>
  )
}
