import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/DashboardLayout';

export default function SpravaOdmien() {
  const router = useRouter();
  const [obec, setObec] = useState(null);
  const [odmeny, setOdmeny] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOdmena, setEditingOdmena] = useState(null);
  const [formData, setFormData] = useState({
    nazov: '',
    popis: '',
    cena_v_bodoch: '',
    obrazok_url: '',
    stav: 'aktivna'
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
      await loadOdmeny();
    } catch (error) {
      console.error('Error loading data:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadOdmeny = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/odmeny', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await res.json();
      
      if (res.ok) {
        setOdmeny(data);
      } else {
        console.error('Chyba pri načítaní:', data.error);
      }
    } catch (error) {
      console.error('Chyba:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setEditingOdmena(null);
    setFormData({
      nazov: '',
      popis: '',
      cena_v_bodoch: '',
      obrazok_url: '',
      stav: 'aktivna'
    });
    setShowModal(true);
  };

  const openEditModal = (odmena) => {
    setEditingOdmena(odmena);
    setFormData({
      nazov: odmena.nazov,
      popis: odmena.popis || '',
      cena_v_bodoch: odmena.cena_v_bodoch,
      obrazok_url: odmena.obrazok_url || '',
      stav: odmena.stav
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      let url = '/api/odmeny';
      let method = 'POST';

      if (editingOdmena) {
        url = `/api/odmeny/${editingOdmena.id}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setShowModal(false);
        await loadOdmeny();
      } else {
        alert('Chyba: ' + data.error);
      }
    } catch (error) {
      console.error('Chyba pri ukladaní:', error);
      alert('Nastala chyba pri ukladaní.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Naozaj chcete odstrániť túto odmenu?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`/api/odmeny/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (res.ok) {
        await loadOdmeny();
      } else {
        const data = await res.json();
        alert('Chyba: ' + data.error);
      }
    } catch (error) {
      console.error('Chyba pri mazaní:', error);
      alert('Nastala chyba pri mazaní.');
    }
  };

  const handleToggleStav = async (odmena) => {
    const novyStav = odmena.stav === 'aktivna' ? 'neaktivna' : 'aktivna';
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`/api/odmeny/${odmena.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ stav: novyStav }),
      });

      if (res.ok) {
        await loadOdmeny();
      } else {
        const data = await res.json();
        alert('Chyba: ' + data.error);
      }
    } catch (error) {
      console.error('Chyba pri zmene stavu:', error);
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
            <h2 className="text-3xl font-bold text-gray-900">Odmeny pre občanov</h2>
            <p className="text-gray-600">Nastavte, čo môžu občania získať za nazbierané body</p>
          </div>
          <button
            onClick={openAddModal}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition"
          >
            + Pridať odmenu
          </button>
        </div>

        {/* Zoznam odmien */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {odmeny.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Názov
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cena (body)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stav
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Akcie
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {odmeny.map((odmena) => (
                    <tr key={odmena.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {odmena.nazov}
                        </div>
                        {odmena.popis && (
                          <div className="text-sm text-gray-500">
                            {odmena.popis}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {odmena.cena_v_bodoch} bodov
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          odmena.stav === 'aktivna' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {odmena.stav === 'aktivna' ? 'Aktívna' : 'Neaktívna'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openEditModal(odmena)}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          Upraviť
                        </button>
                        <button
                          onClick={() => handleToggleStav(odmena)}
                          className="text-yellow-600 hover:text-yellow-900 mr-3"
                        >
                          {odmena.stav === 'aktivna' ? 'Deaktivovať' : 'Aktivovať'}
                        </button>
                        <button
                          onClick={() => handleDelete(odmena.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Zmazať
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Zatiaľ nemáte žiadne odmeny</p>
              <button
                onClick={openAddModal}
                className="text-green-600 hover:text-green-700 font-medium"
              >
                + Pridať prvú odmenu
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal pre pridanie/úpravu odmeny */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-lg bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {editingOdmena ? 'Upraviť odmenu' : 'Nová odmena'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Názov *
                </label>
                <input
                  type="text"
                  name="nazov"
                  value={formData.nazov}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Popis
                </label>
                <textarea
                  name="popis"
                  value={formData.popis}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cena v bodoch *
                </label>
                <input
                  type="number"
                  name="cena_v_bodoch"
                  value={formData.cena_v_bodoch}
                  onChange={handleInputChange}
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL obrázka (voliteľné)
                </label>
                <input
                  type="url"
                  name="obrazok_url"
                  value={formData.obrazok_url}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {editingOdmena && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stav
                  </label>
                  <select
                    name="stav"
                    value={formData.stav}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="aktivna">Aktívna</option>
                    <option value="neaktivna">Neaktívna</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                  {editingOdmena ? 'Uložiť zmeny' : 'Pridať odmenu'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium transition"
                >
                  Zrušiť
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}