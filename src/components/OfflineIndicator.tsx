import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showAlert, setShowAlert] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowAlert(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showAlert) return null;

  return (
    <Alert 
      className={`fixed top-4 right-4 z-50 w-auto max-w-sm shadow-lg transition-all ${
        isOnline 
          ? 'border-green-500 bg-green-50 dark:bg-green-950' 
          : 'border-orange-500 bg-orange-50 dark:bg-orange-950'
      }`}
    >
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
        ) : (
          <WifiOff className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        )}
        <AlertDescription className={isOnline ? 'text-green-800 dark:text-green-200' : 'text-orange-800 dark:text-orange-200'}>
          {isOnline ? 'Back online - syncing data...' : 'Working offline - data will sync when connected'}
        </AlertDescription>
      </div>
    </Alert>
  );
};
