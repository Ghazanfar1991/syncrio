import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NotificationItem {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationsCardProps {
  notifications: NotificationItem[];
}

export const NotificationsCard: React.FC<NotificationsCardProps> = ({ notifications }) => {
  const router = useRouter();
  
  return (
    <div className="rounded-3xl p-4 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">Notifications</div>
        <button 
          onClick={() => router.push('/posts')}
          className="text-xs px-2 py-1 rounded-md bg-white/60 dark:bg-neutral-800/60 border border-black/10 dark:border-white/10 hover:bg-white/80 dark:hover:bg-neutral-700/80 transition-colors"
        >
          View all
        </button>
      </div>
      <div className="space-y-3">
        {notifications.length > 0 ? (
          notifications.slice(0, 3).map((notification) => (
            <div key={notification.id} className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                notification.type === 'success' ? 'bg-green-50 dark:bg-green-900/20' :
                notification.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                notification.type === 'error' ? 'bg-red-50 dark:bg-red-900/20' :
                'bg-indigo-50 dark:bg-indigo-900/20'
              }`}>
                {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-600"/> :
                 notification.type === 'warning' ? <AlertCircle className="w-5 h-5 text-yellow-600"/> :
                 notification.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-600"/> :
                 <CheckCircle2 className="w-5 h-5 text-indigo-600"/>}
              </div>
              <div className="text-sm">
                <div className="font-medium">{notification.title}</div>
                <div className="text-xs opacity-60">{notification.message}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-xs opacity-50">No new notifications</div>
        )}
      </div>
    </div>
  );
};
