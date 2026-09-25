import { ConnectionView } from '../ConnectionView/ConnectionView'
import type { ConnectionCredentials } from '../../domain/types'
import styles from './ConnectionScreen.module.css'

type ConnectionScreenProps = {
  error: string
  isConnecting: boolean
  onConnect: (credentials: ConnectionCredentials) => Promise<boolean>
}

export function ConnectionScreen(props: ConnectionScreenProps) {
  return (
    <div className={styles.shell}>
      <section className={styles.intro} aria-label="О приложении">
        <div className={styles.copy}>
          <span className={styles.eyebrow}>GREEN-API · TELEGRAM</span>
          <h2>Текстовые сообщения без лишнего интерфейса</h2>
          <p>
            Компактный React-клиент в знакомой логике Telegram Web. Только чаты,
            отправка и получение сообщений.
          </p>
        </div>
        <div className={styles.message} aria-hidden="true">
          <span>Привет! Проверим интеграцию?</span>
          <small>12:48 ✓✓</small>
        </div>
      </section>
      <ConnectionView {...props} />
    </div>
  )
}
