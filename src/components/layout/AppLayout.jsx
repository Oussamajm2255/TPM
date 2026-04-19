import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
  return (
    <div className="h-full flex bg-slate-50">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <Header />
        <div className="flex-1 overflow-auto scroll-area p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
