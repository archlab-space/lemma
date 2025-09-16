import { StreamingDemo } from "@/components/StreamingDemo";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Lemma</h1>
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
