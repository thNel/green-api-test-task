import {
  ChatsCircleIcon,
  PlusIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'
import type { SidebarMode } from '../types'
import styles from './SidebarTools.module.css'

type SidebarToolsProps = {
  mode: SidebarMode
  isComposerOpen: boolean
  onModeChange: (mode: SidebarMode) => void
  onToggleComposer: () => void
}

export function SidebarTools({
  mode,
  isComposerOpen,
  onModeChange,
  onToggleComposer,
}: SidebarToolsProps) {
  return (
    <div className={styles.tools}>
      <div className={styles.tabs} role="group" aria-label="Списки чатов и контактов">
        <button
          className={`${styles.tab} ${mode === 'chats' ? styles.active : ''}`}
          type="button"
          aria-pressed={mode === 'chats'}
          onClick={() => onModeChange('chats')}
        >
          <ChatsCircleIcon size={17} weight="duotone" aria-hidden="true" />
          Чаты
        </button>
        <button
          className={`${styles.tab} ${mode === 'contacts' ? styles.active : ''}`}
          type="button"
          aria-pressed={mode === 'contacts'}
          onClick={() => onModeChange('contacts')}
        >
          <UsersThreeIcon size={17} weight="duotone" aria-hidden="true" />
          Контакты
        </button>
      </div>
      <button
        className={styles.newChat}
        type="button"
        onClick={onToggleComposer}
        aria-expanded={isComposerOpen}
      >
        <PlusIcon size={18} weight="bold" />
        Новый чат
      </button>
    </div>
  )
}
