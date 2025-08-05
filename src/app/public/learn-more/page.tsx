
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Fish } from 'lucide-react';
import Link from 'next/link';

export default function LearnMorePage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 text-white py-6">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-5xl font-bold text-white">MATCH MANAGER</h1>
          <h2 className="text-4xl font-bold mt-2">Learn More About Match Manager</h2>
          <p className="text-xl mt-4 text-gray-300">
            Discover the features and benefits of using our platform.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-6 py-12">
        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-1">
          {/* Benefits Card */}
          <Card className="overflow-hidden">
            <div className="p-6">
              <h3 className="text-2xl font-semibold mb-4">Benefits of Signing Up</h3>
              <p className="text-gray-600">
                Registered users can register for matches for their preferred club. They can also view historical match results. Registered users can also view WEIGH-IN data in realtime. Add and view match related images. Prepare and save PDF versions of angler lists and match results
              </p>
            </div>
          </Card>

          {/* Admin Users Card */}
          <Card className="overflow-hidden">
            <div className="p-6">
              <h3 className="text-2xl font-semibold mb-4">Admin Users</h3>
              <p className="text-gray-600">
                Admin users can request full READ/WRITE access from the SITE ADMINISTRATOR. This enables the creation and management of series, matches and anglers.
              </p>
            </div>
          </Card>

          {/* Contact Card */}
          <Card className="overflow-hidden">
            <div className="p-6">
              <h3 className="text-2xl font-semibold mb-4">Contact</h3>
              <p className="text-gray-600">
                Contact Stuart at <a href="mailto:stuart@emancium.com.au" className="text-blue-600 hover:underline">stuart@emancium.com.au</a> for more information about using MATCH MANAGER for your club's match management.
              </p>
            </div>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-6">
        <div className="container mx-auto px-6 text-center">
          <p>&copy; 2024 Match Manager. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
