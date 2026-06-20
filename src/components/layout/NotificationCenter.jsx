import { useAppStore } from '../../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import Badge from '../common/Badge';

export default function NotificationCenter({ onClose }) {
  const { notifications, markRead, markAllRead } = useAppStore(s => ({
    notifications: s.notifications,
    markRead: s.markNotificationRead,
    markAllRead: s.markAllNotificationsRead
  }));
  const navigate = useNavigate();

  return (
    <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-1rem))] sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="p-4 border-b border-slate-50 flex items-center justify-between">
        <h3 className="font-bold text-slate-900">Notifications</h3>
        <button 
          onClick={markAllRead}
          className="text-[10px] font-bold text-brand-600 hover:text-brand-700 uppercase tracking-wider"
        >
          Tout lire
        </button>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm italic">
            Aucune notification
          </div>
        ) : (
          notifications.map((n) => (
            <div 
              key={n.id}
              onClick={() => {
                markRead(n.id);
                if (n.link) navigate(n.link);
                onClose();
              }}
              className={`p-4 border-b border-slate-50 last:border-0 cursor-pointer transition-colors hover:bg-slate-50 ${!n.is_read ? 'bg-brand-50/30' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                  n.type === 'danger' ? 'bg-rose-500' : 
                  n.type === 'warning' ? 'bg-amber-500' : 
                  'bg-brand-500'
                } ${n.is_read ? 'opacity-0' : ''}`} />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800">{n.title}</div>
                  <div className="text-[11px] text-slate-500 leading-relaxed">{n.message}</div>
                  <div className="text-[9px] text-slate-400 uppercase font-medium">
                    {new Date(n.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
        <button className="text-[10px] font-bold text-slate-500 uppercase hover:text-slate-700 transition-colors">
          Voir tout l'historique
        </button>
      </div>
    </div>
  );
}
