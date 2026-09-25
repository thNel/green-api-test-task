import { useState, type FormEvent } from 'react'
import {
  EyeIcon,
  EyeSlashIcon,
  LockKeyIcon,
  PlugsConnectedIcon,
  ShieldCheckIcon,
} from '@phosphor-icons/react'
import type { ConnectionCredentials } from '../../domain/types'
import styles from './ConnectionView.module.css'

type ConnectionViewProps = {
  error: string
  isConnecting: boolean
  onConnect: (credentials: ConnectionCredentials) => Promise<boolean>
}

const initialCredentials: ConnectionCredentials = {
  apiUrl: 'https://api.green-api.com',
  idInstance: '',
  apiTokenInstance: '',
}

export function ConnectionView({
  error,
  isConnecting,
  onConnect,
}: ConnectionViewProps) {
  const [credentials, setCredentials] = useState(initialCredentials)
  const [showToken, setShowToken] = useState(false)

  const updateField = (field: keyof ConnectionCredentials, value: string) => {
    setCredentials((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void onConnect(credentials)
  }

  return (
    <main className={styles.view}>
      <div className={styles.card}>
        <div className={styles.icon} aria-hidden="true">
          <ShieldCheckIcon size={38} weight="fill" />
        </div>
        <h1>Подключение к Telegram</h1>
        <p className={styles.lead}>
          Введите параметры инстанса GREEN-API. Данные останутся только в этой вкладке.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>API URL</span>
            <input
              type="url"
              value={credentials.apiUrl}
              onChange={(event) => updateField('apiUrl', event.target.value)}
              autoComplete="url"
              required
            />
            <small>Адрес хоста из личного кабинета GREEN-API</small>
          </label>

          <label className={styles.field}>
            <span>ID Instance</span>
            <input
              inputMode="numeric"
              value={credentials.idInstance}
              onChange={(event) => updateField('idInstance', event.target.value)}
              placeholder="4100123456"
              autoComplete="off"
              required
            />
          </label>

          <label className={styles.field}>
            <span>API Token Instance</span>
            <span className={styles.passwordField}>
              <input
                type={showToken ? 'text' : 'password'}
                value={credentials.apiTokenInstance}
                onChange={(event) =>
                  updateField('apiTokenInstance', event.target.value)
                }
                autoComplete="off"
                required
              />
              <button
                type="button"
                className={styles.fieldAction}
                onClick={() => setShowToken((value) => !value)}
                aria-label={showToken ? 'Скрыть токен' : 'Показать токен'}
              >
                {showToken ? <EyeSlashIcon size={20} /> : <EyeIcon size={20} />}
              </button>
            </span>
          </label>

          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}

          <button className={styles.primaryButton} type="submit" disabled={isConnecting}>
            {isConnecting ? (
              <>Проверяем подключение...</>
            ) : (
              <>
                <PlugsConnectedIcon size={20} weight="bold" />
                Подключиться
              </>
            )}
          </button>
        </form>

        <div className={styles.securityNote}>
          <LockKeyIcon size={18} weight="fill" aria-hidden="true" />
          <span>Токен не сохраняется в localStorage и не выводится в консоль.</span>
        </div>
      </div>
    </main>
  )
}
