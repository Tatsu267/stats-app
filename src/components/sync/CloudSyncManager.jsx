import { useEffect } from 'react';
import { startCloudSync } from '../../services/cloudSync';

export default function CloudSyncManager() {
  useEffect(() => {
    const stop = startCloudSync();
    return () => {
      stop();
    };
  }, []);

  return null;
}
