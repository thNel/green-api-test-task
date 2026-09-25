import { TelegramLogoIcon } from '@phosphor-icons/react'
import styles from './EmptyChatView.module.css'

export function EmptyChatView({ mobileVisible }: { mobileVisible: boolean }) {
  return (
    <main className={`${styles.empty} ${mobileVisible ? styles.mobileVisible : ''}`}>
      <div className={styles.mark} aria-hidden="true">
        <TelegramLogoIcon size={58} weight="fill" />
      </div>
      <h1>Telegram Chat</h1>
      <p>Выберите существующий чат или создайте новый.</p>
    </main>
  )
}
