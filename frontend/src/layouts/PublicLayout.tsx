import { Outlet, useLocation } from 'react-router-dom';
import { Nav } from '../components/sections/Nav';
import { Footer } from '../components/sections/Footer';

export function PublicLayout() {
  // The landing page opens on a dark full-bleed hero, so its nav starts transparent.
  const overlay = useLocation().pathname === '/';
  return (
    <div className="min-h-[100dvh] flex flex-col bg-bone text-ink-soft">
      <Nav overlay={overlay} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
