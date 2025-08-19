
import { redirect } from 'next/navigation';

export default function PublicPage() {
  // This page is just a redirector to the public dashboard.
  redirect('/public/dashboard');
}
