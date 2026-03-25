import { useState, useEffect, useCallback } from 'react'

export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : initial
    } catch {
      console.warn(`Failed to parse localStorage key "${key}"`)
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      console.error(`Failed to save to localStorage key "${key}":`, e)
    }
  }, [key, value])

  // Memoized setter to prevent unnecessary re-renders
  const set = useCallback((newValue) => {
    setValue(prev => typeof newValue === 'function' ? newValue(prev) : newValue)
  }, [])

  return [value, set]
}
