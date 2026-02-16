import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/DashboardLayout';

export default function Vyvozy() {
  const router = useRouter();
  const [obec, setObec] = useState(null);
  const [obyvatelia, setObyvatelia] = useState([]);
  const [vyvozy, setVyvozy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    obyvatel_id: '',
    datum: new Date().toISOString().split('T')[0],
    typ_odpadu: 'plast',
    mnozstvo_kg: ''
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
      await loadData(obecData.id);
    } catch (error) {
      console.error('Error loading data:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async (obecId) => {
    try {
      // Load residents
      const { data: residentsData, error: residentsError } = await supabase
        .from('obyvatelia')
        .select('*')
        .eq('obec_id', obecId)
        .order('priezvisko', { ascending: true });

      if (residentsError) throw residentsError;
      setObyvatelia(residentsData || []);

      // Load waste collections
      const { data: vyvozData, error: vyvozError } = await supabase
        .from('vyvozy')
        .select(`
          *,
          obyvatelia (meno, priezvisko)
        `)
        .eq('obec_id', obecId)
        .order('datum', { ascending: false })
        .limit(50);

      if (vyvozError) throw vyvozError;
      setVyvozy(vyvozData || []);
    } catch (error) {
      console.error('Error loading data:', error);
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

    if (!formData.obyvatel_id) {
      setError('Vyberte obyvateľa');
      return;
    }

    if (parseFloat(formData.mnozstvo_kg) <= 0) {
      setError('Množstvo musí byť väčšie ako 0');
      return;
    }

    try {
      const { error } = await supabase
        .from('vyvozy')
        .insert([
          {
            obec_id: obec.id,
            obyvatel_id: parseInt(formData.obyvatel_id),
            datum: formData.datum,
            typ_odpadu: formData.typ_odpadu,
            mnozstvo_kg: parseFloat(formData.mnozstvo_kg)
          }
        ]);

      if (error) throw error;

      setFormData({
        obyvatel_id: '',
        datum: new Date().toISOString().split('T')[0],
        typ_odpadu: 'plast',
        mnozstvo_kg: ''
      });
      
      await loadData(obec.id);
    } catch (err) {
      console.error('Error adding collection:', err);
      setError('Chyba pri pridávaní vývozu');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Naozaj chcete odstrániť tento vývoz?')) return;

    try {
      const { error } = await supabase
        .from('vyvozy')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData(obec.id);
    } catch (err) {
      console.error('Error deleting collection:', err);
      alert('Chyba pri odstraňovaní vývozu');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Načítavam...</div>
      </div>
    );
  }

  const wasteTypeLabels = {
    zmesovy: 'Zmiešaný odpad',
    plast: 'Plast',
    papier: 'Papier',
    sklo: 'Sklo'
  };

  const wasteTypeColors = {
    zmesovy: 'bg-gray-100 text-gray-800',
    plast: 'bg-yellow-100 text-yellow-800',
    papier: 'bg-blue-100 text-blue-800',
    sklo: 'bg-green-100 text-green-800'
  };

  return (
    <DashboardLayout obec={obec}>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Vývozy odpadu</h2>
          <p className="text-gray-600">Evidujte vývozy a automaticky počítajte body</p>
        </div>

        {/* Add Collection Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Pridať nový vývoz</h3>
          
          {error && (
            <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {obyvatelia.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 rounded">
              <p>Najprv musíte pridať obyvateľov. <a href="/dashboard/obyvatelia" className="font-medium underline">Prejsť na obyvateľov</a></p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Obyvateľ *
                </label>
                <select
                  name="obyvatel_id"
                  required
                  value={formData.obyvatel_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Vyberte obyvateľa</option>
                  {obyvatelia.map((obyvatel) => (
                    <option key={obyvatel.id} value={obyvatel.id}>
                      {obyvatel.meno} {obyvatel.priezvisko}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dátum *
                </label>
                <input
                  type="date"
                  name="datum"
                  required
                  value={formData.datum}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Typ odpadu *
                </label>
                <select
                  name="typ_odpadu"
                  required
                  value={formData.typ_odpadu}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="plast">Plast (2 body/kg)</option>
                  <option value="papier">Papier (2 body/kg)</option>
                  <option value="sklo">Sklo (2 body/kg)</option>
                  <option value="zmesovy">Zmiešaný (0 bodov)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Množstvo (kg) *
                </label>
                <input
                  type="number"
                  name="mnozstvo_kg"
                  required
                  step="0.01"
                  min="0.01"
                  value={formData.mnozstvo_kg}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition"
                >
                  Pridať vývoz
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Collections List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Posledné vývozy</h3>
          </div>
          
          {vyvozy.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dátum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Obyvateľ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Typ odpadu
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Množstvo
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
                  {vyvozy.map((vyvoz) => (
                    <tr key={vyvoz.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(vyvoz.datum).toLocaleDateString('sk-SK')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vyvoz.obyvatelia?.meno} {vyvoz.obyvatelia?.priezvisko}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${wasteTypeColors[vyvoz.typ_odpadu]}`}>
                          {wasteTypeLabels[vyvoz.typ_odpadu]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {parseFloat(vyvoz.mnozstvo_kg).toFixed(2)} kg
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        +{vyvoz.body || 0} bodov
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleDelete(vyvoz.id)}
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
              <p className="text-gray-500">Zatiaľ nemáte žiadne vývozy</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
