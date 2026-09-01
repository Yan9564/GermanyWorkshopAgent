'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'

export default function AdminLogin() {
  const router = useRouter()
  const setRole = useStore((s) => s.setRole)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.loginAdmin(pin)
      setRole('admin')
      router.push('/activity')
    } catch {
      setError('Incorrect PIN. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-70px)] flex items-center justify-center px-4">
      <div className="bg-white border-2 border-border-brand rounded-xl3 p-8 w-full max-w-sm shadow-card">
        <div className="h-1.5 bg-gradient-action rounded-full mb-6" />
        <h1 className="text-2xl font-extrabold text-text-default mb-1">Admin Access</h1>
        <p className="text-text-muted text-sm mb-6">Enter the workshop PIN to continue.</p>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            className="w-full px-4 py-3 border-2 border-border-brand rounded-xl text-text-default outline-none focus:border-violet-brand transition text-center text-xl tracking-widest"
            maxLength={8}
          />
          {error && <p className="text-red-brand text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className="w-full bg-gradient-action text-white font-bold py-3 rounded-full hover:shadow-glow transition disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
