"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import type { User } from "firebase/auth"
import { onAuthChange, getUserData, type UserData } from "@/lib/firebase/auth"
import { isFirebaseConfigured } from "@/lib/firebase/config"
import { setSessionCookie, clearSessionCookie } from "@/lib/utils/session"

interface AuthContextType {
  user: User | null
  userData: UserData | null
  loading: boolean
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  refreshSession: async () => {},
})

const IDLE_TIMEOUT = 30 * 60 * 1000

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshSession = useCallback(async () => {
    if (user) {
      const data = await getUserData(user.uid)
      setUserData(data)
      if (data?.role) await setSessionCookie(data.role)
    }
  }, [user])

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      console.warn("Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* environment variables.")
      setLoading(false)
      return
    }
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        const data = await getUserData(firebaseUser.uid)
        setUserData(data)
        if (data?.role) await setSessionCookie(data.role)
      } else {
        setUserData(null)
        clearSessionCookie()
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    let idleTimer: ReturnType<typeof setTimeout>
    const resetIdleTimer = () => {
      clearTimeout(idleTimer)
      idleTimer = setTimeout(async () => {
        const { signOut } = await import("@/lib/firebase/auth")
        await signOut()
        clearSessionCookie()
        window.location.href = "/auth/login"
      }, IDLE_TIMEOUT)
    }
    const events = ["mousedown", "keydown", "scroll", "touchstart"]
    events.forEach((e) => window.addEventListener(e, resetIdleTimer, { passive: true }))
    resetIdleTimer()
    return () => {
      clearTimeout(idleTimer)
      events.forEach((e) => window.removeEventListener(e, resetIdleTimer))
    }
  }, [user])

  return (
    <AuthContext.Provider value={{ user, userData, loading, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
