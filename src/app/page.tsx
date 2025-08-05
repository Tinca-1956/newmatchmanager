import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to the new public dashboard page.
  redirect('/public/dashboard');
}
