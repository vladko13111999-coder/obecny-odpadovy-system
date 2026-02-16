import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/DashboardLayout';

export default function Nastavenia() {
  const router = useRouter();
  const [obec, setObec] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: obecData, error: obecError } = await supabase
        .from('obce')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (obecError) throw obecError;
      
      setObec(obecData);
    } catch (error) {
      console.error('Error loading data:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Načítavam...</div>
      </div>
    );
  }

  return (
    <DashboardLayout obec={obec}>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Nastavenia</h2>
          <p className="text-gray-600">Spravujte nastavenia vašej obce</p>
        </div>

        {/* Municipality Info */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Informácie o obci</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Názov obce
              </label>
              <div className="text-lg text-gray-900">{obec?.nazov}</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="text-lg text-gray-900">{obec?.email}</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Veľkosť obce
              </label>
              <div className="text-lg text-gray-900 capitalize">{obec?.velkost_obce}</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stav predplatného
              </label>
              <div className="text-lg text-gray-900 capitalize">{obec?.subscription_status}</div>
            </div>

            {obec?.subscription_status === 'trial' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Koniec skúšobnej verzie
                </label>
                <div className="text-lg text-gray-900">
                  {new Date(obec.trial_end).toLocaleDateString('sk-SK')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Subscription Management */}
        {obec?.subscription_status !== 'active' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Predplatné</h3>
            <p className="text-gray-600 mb-4">
              Aktivujte si predplatné pre plný prístup k všetkým funkciám systému.
            </p>
            <button
              onClick={() => router.push('/upgrade')}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition"
            >
              Aktivovať predplatné
            </button>
          </div>
        )}

        {/* Account Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Účet</h3>
          
          <div className="space-y-3">
            <button
              onClick={async () => {
                if (confirm('Naozaj sa chcete odhlásiť?')) {
                  await supabase.auth.signOut();
                  router.push('/');
                }
              }}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-medium transition"
            >
              Odhlásiť sa
            </button>
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-6">
          <h4 className="font-bold text-blue-900 mb-2">💡 Potrebujete pomoc?</h4>
          <p className="text-sm text-blue-800 mb-3">
            Ak máte akékoľvek otázky alebo potrebujete technickú podporu, kontaktujte nás.
          </p>
          <a
            href="mailto:podpora@obecny-odpadovy-system.sk"
            className="text-blue-700 hover:text-blue-800 font-medium underline"
          >
            podpora@obecny-odpadovy-system.sk
          </a>
        </div>
      </div>
    </DashboardLayout>
  );
}
