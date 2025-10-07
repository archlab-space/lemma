'use client'

import React from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Container, Flex } from '@/components/layout'
import { Button, Avatar } from '@/components/ui'

interface HeaderProps {
  className?: string
}

const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  const { user, signOut } = useAuth()

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase()
  }

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <nav className={`bg-white shadow-sm border-b border-gray-200 ${className}`}>
      <Container size="xl">
        <Flex justify="between" align="center" className="h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-cyan-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-xl">L</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Lemma</h1>
              <p className="text-xs text-gray-500">Research Assistant</p>
            </div>
          </Link>

          {/* User Section */}
          {user && (
            <Flex align="center" gap="md">
              <span className="text-sm text-gray-700 hidden sm:inline">
                Welcome, {user.user_metadata?.full_name || user.email}
              </span>

              <Flex align="center" gap="sm">
                <Avatar
                  src={user.user_metadata?.avatar_url}
                  alt={user.user_metadata?.full_name || user.email}
                  fallback={getInitials(user.email)}
                  size="sm"
                />

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </Flex>
            </Flex>
          )}
        </Flex>
      </Container>
    </nav>
  )
}

Header.displayName = 'Header'

export default Header
