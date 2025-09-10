import { useSession, signIn, signOut } from 'next-auth/react';
import dynamic from 'next/dynamic';
import Head from 'next/head';

// Dynamically import Map component to avoid SSR issues with Leaflet
const Map = dynamic(() => import('../components/Map'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96">
      <div className="text-lg">Loading map...</div>
    </div>
  ),
});

export default function Home() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Head>
          <title>Calendar Map App</title>
          <meta name="description" content="View your calendar events on a map" />
        </Head>
        
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-center mb-8">Calendar Map</h1>
          <p className="text-gray-600 text-center mb-8">
            Sign in with your Google account to view today's calendar events on a map.
          </p>
          <button
            onClick={() => signIn('google')}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Calendar Map App</title>
        <meta name="description" content="View your calendar events on a map" />
      </Head>

      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Calendar Map</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Welcome, {session.user?.name}
              </span>
              <button
                onClick={() => signOut()}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Events for {today}
          </h2>
          <p className="text-gray-600">
            Your calendar events with locations are displayed on the map below.
          </p>
        </div>
        
        <Map />
      </main>
    </div>
  );
}