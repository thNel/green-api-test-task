import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import styles from './ContactSearch.module.css'

type ContactSearchProps = {
  value: string
  onChange: (value: string) => void
}

export function ContactSearch({ value, onChange }: ContactSearchProps) {
  return (
    <label className={styles.search}>
      <MagnifyingGlassIcon size={17} aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Поиск контактов"
        aria-label="Поиск контактов"
      />
    </label>
  )
}
