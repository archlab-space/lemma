'use client'

import { ReactNode, createContext, useContext, useState } from 'react'

interface TabsContextValue {
  activeTab: string
  setActiveTab: (value: string) => void
  orientation: 'horizontal' | 'vertical'
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined)

interface TabsProps {
  defaultValue: string
  children: ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

export function Tabs({ defaultValue, children, className = '', orientation = 'horizontal' }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue)

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, orientation }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  children: ReactNode
  className?: string
}

export function TabsList({ children, className = '' }: TabsListProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsList must be used within Tabs')

  const { orientation } = context

  if (orientation === 'vertical') {
    return (
      <div className={`flex flex-col border-r border-gray-200 ${className}`}>
        {children}
      </div>
    )
  }

  return (
    <div className={`flex border-b border-gray-200 overflow-x-auto scrollbar-hide ${className}`}>
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: ReactNode
  className?: string
  hideLabel?: boolean
}

export function TabsTrigger({ value, children, className = '', hideLabel = false }: TabsTriggerProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsTrigger must be used within Tabs')

  const { activeTab, setActiveTab, orientation } = context
  const isActive = activeTab === value

  if (orientation === 'vertical') {
    // Extract icon and label from children
    const childrenStr = typeof children === 'string' ? children : ''
    const parts = childrenStr.split(' ')
    const icon = parts[0] || ''
    const label = parts.slice(1).join(' ') || childrenStr

    return (
      <button
        onClick={() => setActiveTab(value)}
        title={label} // Tooltip shows full label on hover
        className={`w-full py-4 px-2 text-xs font-medium transition-all flex flex-col items-center justify-center border-l-3 ${
          isActive
            ? 'bg-blue-50 text-blue-700 border-blue-600'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-transparent'
        } ${className}`}
      >
        <span className="text-xl leading-none">{icon}</span>
        {!hideLabel && (
          <span className="leading-snug text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-full">{label}</span>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
        isActive
          ? 'text-blue-600 border-b-2 border-blue-600'
          : 'text-gray-600 hover:text-gray-900 hover:border-b-2 hover:border-gray-300'
      } ${className}`}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: ReactNode
  className?: string
}

export function TabsContent({ value, children, className = '' }: TabsContentProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsContent must be used within Tabs')

  const { activeTab } = context
  if (activeTab !== value) return null

  return <div className={className}>{children}</div>
}
