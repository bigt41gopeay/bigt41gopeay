import { useEffect } from 'react'
import { TABS } from '../utils/constants'

export function useKeyboardShortcuts(setTab) {
  useEffect(() => {
    function handler(e) {
      // Don't trigger when typing in inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return

      // Alt + number to switch tabs
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const tab = TABS.find(t => t.shortcut === e.key)
        if (tab) {
          e.preventDefault()
          setTab(tab.id)
        }
      }

      // Alt+N for new item (triggers add button click)
      if (e.altKey && e.key === 'n') {
        e.preventDefault()
        const addBtn = document.querySelector('[data-action="add"]')
        if (addBtn) addBtn.click()
      }

      // Alt+S for search focus
      if (e.altKey && e.key === 's') {
        e.preventDefault()
        const search = document.querySelector('[data-role="search"]')
        if (search) search.focus()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setTab])
}
