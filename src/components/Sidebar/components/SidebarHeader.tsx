import { SignOutIcon, TelegramLogoIcon } from '@phosphor-icons/react'
import styles from './SidebarHeader.module.css'

type SidebarHeaderProps = { onDisconnect: () => void }

export function SidebarHeader({ onDisconnect }: SidebarHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.brandMark} aria-hidden="true">
        <TelegramLogoIcon size={28} weight="fill" />
      </div>
      <div className={styles.brandCopy}>
        <strong>Telegram</strong>
        <span>через GREEN-API</span>
      </div>
      <button
        className={styles.disconnect}
        type="button"
        onClick={onDisconnect}
        aria-label="Отключиться"
        title="Отключиться"
      >
        <SignOutIcon size={21} />
      </button>
    </header>
  )
}
