
'use server';

import { firestore } from './firebase-admin';
import { serverTimestamp } from 'firebase/firestore';

interface PublishPostArgs {
  postId: string;
  clubId: string;
  authorName: string;
  subject: string;
  content: string;
  mediaFiles: { url: string; type: string }[];
}

export async function publishPost(args: PublishPostArgs) {
  const { postId, clubId, authorName, subject, content, mediaFiles } = args;

  if (!firestore) {
    throw new Error('Firestore not initialized on the server.');
  }

  try {
    const plainText = content.replace(/<[^>]*>?/gm, '');
    const snippet = plainText.substring(0, 150) + (plainText.length > 150 ? '...' : '');
    const coverImageUrl = mediaFiles.find(file => file.type.startsWith('image/'))?.url || '';

    const publicPostData = {
      originalPostId: postId,
      clubId: clubId,
      authorName: authorName,
      subject: subject,
      snippet: snippet,
      coverImageUrl: coverImageUrl,
      publishedAt: serverTimestamp(),
    };

    const publicDocRef = firestore.collection('publicBlogPosts').doc(postId);
    await publicDocRef.set(publicPostData, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('Error in publishPost server action:', error);
    // Re-throw the error so the client-side catch block can handle it
    throw new Error('Failed to publish the post. See server logs for details.');
  }
}
