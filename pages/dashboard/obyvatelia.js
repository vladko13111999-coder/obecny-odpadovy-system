import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/DashboardLayout';

export default function Obyvatelia() {
  const router = useRouter();
  const [obec, setObec] = useState(null);
  const [obyvatelia, setObyvatelia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    meno: '',
    priezvisko: '',
    ulica: '',
    cislo_popisne: ''
  });
  const [error, setError] = useState('');

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
      await loadObyvatelia(obecData.id);
    } catch (error) {
      console.error('Error loading data:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadObyvatelia = async (obecId) => {
    try {
      const { data, error } = await supabase
        .from('obyvatelia')
        .select('*')
        .eq('obec_id', obecId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setObyvatelia(data || []);
    } catch (error) {
      console.error('Error loading residents:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const { error } = await supabase
        .from('obyvatelia')
        .insert([
          {
            obec_id: obec.id,
            meno: formData.meno,
            priezvisko: formData.priezvisko,
            ulica: formData.ulica,
            cislo_popisne: formData.cislo_popisne
          }
        ]);

      if (error) throw error;

      setFormData({ meno: '', priezvisko: '', ulica: '', cislo_popisne: '' });
      setShowForm(false);
      await loadObyvatelia(obec.id);
    } catch (err) {
      console.error('Error adding resident:', err);
      setError('Chyba pri pridávaní obyvateľa');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Naozaj chcete odstrániť tohto obyvateľa?')) return;

    try {
      const { error } = await supabase
        .from('obyvatelia')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadObyvatelia(obec.id);
    } catch (err) {
      console.error('Error deleting resident:', err);
      alert('Chyba pri odstraňovaní obyvateľa');
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
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Obyvatelia</h2>
            <p className="text-gray-600">Spravujte obyvateľov a sledujte ich body</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition"
          >
            {showForm ? 'Zrušiť' : '+ Pridať obyvateľa'}
          </button>
        </div>

        {/* Add Resident Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Nový obyvateľ</h3>
            
            {error && (
              <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meno *
                </label>
                <input
                  type="text"
                  name="meno"
                  required
                  value={formData.meno}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priezvisko *
                </label>
                <input
                  type="text"
                  name="priezvisko"
                  required
                  value={formData.priezvisko}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ulica
                </label>
                <input
                  type="text"
                  name="ulica"
                  value={formData.ulica}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Číslo popisné
                </label>
                <input
                  type="text"
                  name="cislo_popisne"
                  value={formData.cislo_popisne}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition"
                >
                  Pridať obyvateľa
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Residents List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {obyvatelia.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Meno a priezvisko
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Adresa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Body
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Akcie
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {obyvatelia.map((obyvatel) => (
                    <tr key={obyvatel.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {obyvatel.meno} {obyvatel.priezvisko}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {obyvatel.ulica} {obyvatel.cislo_popisne}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          ⭐ {obyvatel.celkove_body || 0} bodov
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleDelete(obyvatel.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Odstrániť
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Zatiaľ nemáte žiadnych obyvateľov</p>
              <button
                onClick={() => setShowForm(true)}
                className="text-green-600 hover:text-green-700 font-medium"
              >
                Pridať prvého obyvateľa
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
