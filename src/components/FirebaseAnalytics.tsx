'use client';

import { useEffect } from 'react';
import { analytics } from '@/lib/firebase';

export default function FirebaseAnalytics() {
  useEffect(() => {
    // Analytics will be initialized when the module is imported, 
    // but we can ensure the reference is loaded here.
    if (analytics) {
      analytics.then(a => {
        if (a) {
          console.log("Firebase Analytics initialized");
        }
      });
    }
  }, []);

  return null;
}
