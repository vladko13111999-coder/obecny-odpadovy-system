import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/DashboardLayout';

export default function Nastavenia() {
  const router = useRouter();
  const [obec, setObec] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    nazov: '',
    ico: '',
    ulica: '',
    mesto: '',
    psc: '',
    email: '',
    velkost_obce: ''
  });

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
      setFormData({
        nazov: obecData.nazov || '',
        ico: obecData.ico || '',
        ulica: obecData.ulica || '',
        mesto: obecData.mesto || '',
        psc: obecData.psc || '',
        email: obecData.email || '',
        velkost_obce: obecData.velkost_obce || 'mala'
      });
    } catch (error) {
      console.error('Error loading data:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/obec', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Nastavenia boli úspešne uložené.');
        setObec(data);
      } else {
        setMessage('Chyba: ' + data.error);
      }
    } catch (error) {
      setMessage('Nastala chyba pri ukladaní.');
    } finally {
      setSaving(false);
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
          <h2 className="text-3xl font-bold text-gray-900">Nastavenia obce</h2>
          <p className="text-gray-600">Upravte základné údaje vašej obce</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Názov obce */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Názov obce
              </label>
              <input
                type="text"
                name="nazov"
                value={formData.nazov}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* IČO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IČO
              </label>
              <input
                type="text"
                name="ico"
                value={formData.ico}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Ulica a číslo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ulica a číslo
              </label>
              <input
                type="text"
                name="ulica"
                value={formData.ulica}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Mesto a PSČ */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mesto
                </label>
                <input
                  type="text"
                  name="mesto"
                  value={formData.mesto}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PSČ
                </label>
                <input
                  type="text"
                  name="psc"
                  value={formData.psc}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Email (readonly) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email (prihlasovací)
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Email nie je možné zmeniť</p>
            </div>

            {/* Veľkosť obce */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Veľkosť obce
              </label>
              <select
                name="velkost_obce"
                value={formData.velkost_obce}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="mala">Malá (do 500 obyvateľov)</option>
                <option value="stredna">Stredná (500-2000 obyvateľov)</option>
                <option value="velka">Veľká (nad 2000 obyvateľov)</option>
              </select>
            </div>

            {/* Správa */}
            {message && (
              <div className={`p-3 rounded-lg text-sm ${
                message.includes('úspešne') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {message}
              </div>
            )}

            {/* Tlačidlo */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Ukladám...' : 'Uložiť zmeny'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}