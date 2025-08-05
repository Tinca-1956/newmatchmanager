import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to the main authenticated part of the app.
  // The layout will handle redirecting to login if not authenticated.
  redirect('/main/dashboard');
}
