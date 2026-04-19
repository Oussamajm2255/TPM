import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import AppRouter from './router/AppRouter';

export default function App() {
  const bootstrap = useAppStore((s) => s.bootstrap);
  const authLoading = useAppStore((s) => s.authLoading);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  if (authLoading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
        Chargement…
      </div>
    );
  }
  return <AppRouter />;
}
