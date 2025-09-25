import React from 'react'
import { Card, CardContent, CardHeader } from '../Card'
import Skeleton from '../Skeleton'
import Grid from '../../layout/Grid'

const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton variant="text" width="200px" height="32px" />
        <div className="mt-2">
          <Skeleton variant="text" width="300px" />
        </div>
      </div>
      
      <Grid cols={1} responsive={{ sm: 2, lg: 4 }} gap="md">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} variant="outlined">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton variant="text" width="80px" />
                  <div className="mt-1">
                    <Skeleton variant="text" width="40px" height="24px" />
                  </div>
                </div>
                <Skeleton variant="rectangular" width={40} height={40} />
              </div>
            </CardContent>
          </Card>
        ))}
      </Grid>
      
      <Grid cols={1} responsive={{ lg: 2 }} gap="md">
        <Card variant="outlined">
          <CardHeader className="p-4 pb-2">
            <Skeleton variant="text" width="150px" />
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <Skeleton variant="rectangular" width={40} height={32} />
                  <div className="flex-1">
                    <Skeleton variant="text" width="70%" />
                    <Skeleton variant="text" width="50%" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card variant="outlined">
          <CardHeader className="p-4 pb-2">
            <Skeleton variant="text" width="120px" />
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <Skeleton variant="text" width="100px" />
                    <Skeleton variant="text" width="80px" />
                  </div>
                  <Skeleton variant="text" width="60px" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </Grid>
    </div>
  )
}

export default DashboardSkeleton