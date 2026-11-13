import { Outlet } from 'react-router-dom';
import { Nav } from '../components/sections/Nav';
import { Footer } from '../components/sections/Footer';

export function PublicLayout() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-bone text-ink-soft">
      <Nav />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
