import React from 'react'
import { Card, CardContent } from '../Card'
import Skeleton from '../Skeleton'

export interface DocumentListSkeletonProps {
  count?: number
}

const DocumentListSkeleton: React.FC<DocumentListSkeletonProps> = ({ 
  count = 3 
}) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} variant="outlined">
          <CardContent className="p-4">
            <div className="flex items-start space-x-4">
              <Skeleton variant="rectangular" width={48} height={64} />
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="text" width="60%" />
                <div className="flex items-center space-x-2 mt-3">
                  <Skeleton variant="text" width={80} />
                  <Skeleton variant="text" width={120} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default DocumentListSkeleton