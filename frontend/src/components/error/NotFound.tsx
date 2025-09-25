import React from 'react'
import Link from 'next/link'
import Button from '../ui/Button'
import { Container, Stack } from '../layout'

export interface NotFoundProps {
  title?: string
  message?: string
  showHomeButton?: boolean
  customActions?: React.ReactNode
}

const NotFound: React.FC<NotFoundProps> = ({
  title = 'Page Not Found',
  message = 'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.',
  showHomeButton = true,
  customActions,
}) => {
  return (
    <Container size="md" className="py-16">
      <Stack spacing="lg" align="center">
        <div className="text-center">
          <div className="mb-4">
            <span className="text-6xl font-bold text-gray-400">404</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {title}
          </h1>
          <p className="text-gray-600 max-w-md mx-auto">
            {message}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {customActions || (
            <>
              {showHomeButton && (
                <Link href="/">
                  <Button variant="primary">
                    Go Home
                  </Button>
                </Link>
              )}
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
              >
                Go Back
              </Button>
            </>
          )}
        </div>
      </Stack>
    </Container>
  )
}

export default NotFound