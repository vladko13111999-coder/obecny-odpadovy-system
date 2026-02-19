import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

export default function DashboardLayout({ children, obec }) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const navItems = [
    { href: '/dashboard', label: 'Prehľad', icon: '📊' },
    { href: '/dashboard/obyvatelia', label: 'Obyvatelia', icon: '👥' },
    { href: '/dashboard/vyvozy', label: 'Vývozy', icon: '🗑️' },
    { href: '/dashboard/kalendar', label: 'Harmonogram vývozov', icon: '📅' },
    { href: '/dashboard/odmeny', label: 'Odmeny', icon: '🎁' },          // <-- NOVÁ POLOŽKA
    { href: '/dashboard/reporty', label: 'Reporty pre štát', icon: '📄' },
    { href: '/dashboard/nastavenia', label: 'Nastavenia', icon: '⚙️' },
  ];

  const getSubscriptionStatusBadge = () => {
    if (!obec) return null;

    const status = obec.subscription_status;
    const trialEnd = new Date(obec.trial_end);
    const now = new Date();
    const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));

    if (status === 'trial') {
      return (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-800">
            <strong>Trial verzia:</strong> {daysLeft > 0 ? `${daysLeft} dní zostáva` : 'Vypršala'}
          </p>
          {daysLeft <= 7 && daysLeft > 0 && (
            <Link href="/upgrade">
              <button className="mt-2 text-sm bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded">
                Aktivovať predplatné
              </button>
            </Link>
          )}
        </div>
      );
    } else if (status === 'active') {
      return (
        <div className="bg-green-50 border border-green-300 rounded-lg p-4 mb-4">
          <p className="text-sm text-green-800">
            <strong>✓ Aktívne predplatné</strong>
          </p>
        </div>
      );
    } else if (status === 'expired' || status === 'cancelled') {
      return (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-800 mb-2">
            <strong>Predplatné expirované</strong>
          </p>
          <Link href="/upgrade">
            <button className="text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
              Obnoviť predplatné
            </button>
          </Link>
        </div>
      );
    }
  };

  const getQuarterNotification = () => {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const day = now.getDate();

    // Check if we're within 7 days of quarter end
    const quarterEnds = [
      { month: 2, day: 31, quarter: 1 }, // March 31
      { month: 5, day: 30, quarter: 2 }, // June 30
      { month: 8, day: 30, quarter: 3 }, // September 30
      { month: 11, day: 31, quarter: 4 }, // December 31
    ];

    for (const qEnd of quarterEnds) {
      if (month === qEnd.month) {
        const daysUntilEnd = qEnd.day - day;
        if (daysUntilEnd >= 0 && daysUntilEnd <= 7) {
          return (
            <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>⚠️ Upozornenie:</strong> Do konca {qEnd.quarter}. kvartálu zostáva {daysUntilEnd} dní. 
                Nezabudnite vygenerovať hlásenie pre štát.
              </p>
              <Link href="/dashboard/reporty">
                <button className="mt-2 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                  Prejsť na reporty
                </button>
              </Link>
            </div>
          );
        }
      }
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Banner */}
      <div className="bg-yellow-500 text-yellow-900 px-4 py-2 text-center text-sm font-medium">
        ⚠️ Od 1.1.2026 platí nová povinnosť kvartálnych hlásení podľa vyhlášky č. 89/2024 Z.z.
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Obecný odpadový systém</h1>
            {obec && <p className="text-sm text-gray-600">{obec.nazov}</p>}
          </div>
          <button
            onClick={handleLogout}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Odhlásiť sa
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full md:w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow-sm p-4 space-y-2">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                      router.pathname === item.href
                        ? 'bg-green-100 text-green-800 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                </Link>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {getSubscriptionStatusBadge()}
            {getQuarterNotification()}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}