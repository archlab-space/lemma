import React from 'react'
import Skeleton from '../Skeleton'

export interface ChatSkeletonProps {
  messageCount?: number
}

const ChatSkeleton: React.FC<ChatSkeletonProps> = ({ 
  messageCount = 3 
}) => {
  return (
    <div className="space-y-6">
      {Array.from({ length: messageCount }).map((_, index) => {
        const isUser = index % 2 === 0
        return (
          <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md ${isUser ? 'order-2' : 'order-1'}`}>
              {!isUser && (
                <div className="flex items-center space-x-2 mb-2">
                  <Skeleton variant="circular" width={24} height={24} />
                  <Skeleton variant="text" width={60} />
                </div>
              )}
              <div className={`p-3 rounded-lg ${
                isUser ? 'bg-blue-50' : 'bg-gray-50'
              }`}>
                <Skeleton 
                  variant="text" 
                  lines={Math.floor(Math.random() * 3) + 1}
                />
              </div>
              <div className="mt-1">
                <Skeleton variant="text" width={60} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ChatSkeleton