import { Card, CardContent, Skeleton } from '@/components/ui'
import { Stack, Flex } from '@/components/layout'

export default function DocumentCardSkeleton() {
  return (
    <Card variant="outlined">
      <CardContent className="p-6">
        <Stack spacing="sm">
          <Flex justify="between" align="start">
            <div className="flex-1 min-w-0">
              <Flex align="center" gap="sm" className="mb-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </Flex>
              <Skeleton className="h-5 w-3/4 mb-1" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </Flex>

          <div className="flex items-center gap-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>

          <Skeleton className="h-9 w-full mt-2 rounded-md" />
        </Stack>
      </CardContent>
    </Card>
  )
}
