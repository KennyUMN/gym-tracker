import { useEffect, useRef } from 'react'
import NetInfo from '@react-native-community/netinfo'
import { AppState } from 'react-native'
import { getDb } from '@/db/client'
import { supabase } from '@/lib/supabase'
import { replaySyncQueue } from './engine'

export function useSyncOnReconnect(userId: string | undefined) {
  const syncing = useRef(false)

  useEffect(() => {
    if (!userId) return

    const runSync = async () => {
      if (syncing.current) return
      syncing.current = true
      try {
        const db = await getDb()
        await replaySyncQueue(userId, db, supabase)
      } finally {
        syncing.current = false
      }
    }

    runSync()

    const netUnsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) runSync()
    })

    const appStateSubscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') runSync()
    })

    return () => {
      netUnsubscribe()
      appStateSubscription.remove()
    }
  }, [userId])
}
