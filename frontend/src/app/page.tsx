'use client'

import { StreamingDemo } from "@/components/StreamingDemo";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <header className="text-center mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1" />
            <h1 className="text-4xl font-bold text-gray-900">Lemma</h1>
            <div className="flex-1 flex justify-end">
              {!loading && (
                user ? (
                  <Link
                    href="/dashboard"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/auth"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Sign In
                  </Link>
                )
              )}
            </div>
          </div>
          <p className="text-lg text-gray-600">AI-Powered Academic Paper Analysis Platform</p>
          <p className="text-sm text-gray-500 mt-2">Phase 2.2: Streaming Pipeline Prototype</p>
        </header>
        
        <div className="space-y-16">
          <StreamingDemo />
        
        </div>
      </div>
    </div>
  );
}
