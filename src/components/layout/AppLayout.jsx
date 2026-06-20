import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
  return (
    <div className="h-full bg-slate-50">
      <Header />
      <main className="h-full overflow-auto scroll-area pt-20 pb-36 sm:pb-32">
        <div className="p-3 sm:p-4 md:p-6">
          <Outlet />
        </div>
      </main>
      <Sidebar />
    </div>
  );
}
