import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/DashboardLayout';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Základný štýl kalendára

export default function Kalendar() {
  const router = useRouter();
  const [obec, setObec] = useState(null);
  const [udalosti, setUdalosti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingUdalost, setEditingUdalost] = useState(null);
  const [formData, setFormData] = useState({
    datum: '',
    typ_odpadu: 'plast',
    poznamka: ''
  });

  // Mapovanie typov odpadu na farby
  const typFarba = {
    plast: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    papier: 'bg-blue-100 text-blue-800 border-blue-300',
    sklo: 'bg-green-100 text-green-800 border-green-300',
    zmesovy: 'bg-gray-100 text-gray-800 border-gray-300'
  };

  const typNazov = {
    plast: 'Plast',
    papier: 'Papier',
    sklo: 'Sklo',
    zmesovy: 'Zmesový odpad'
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (obec) {
      loadUdalosti();
    }
  }, [obec, selectedDate]);

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

  const loadUdalosti = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const mesiac = selectedDate.getMonth() + 1;
      const rok = selectedDate.getFullYear();

      const res = await fetch(`/api/harmonogram?mesiac=${mesiac}&rok=${rok}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await res.json();
      
      if (res.ok) {
        setUdalosti(data);
      } else {
        console.error('Chyba pri načítaní:', data.error);
      }
    } catch (error) {
      console.error('Chyba:', error);
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const getUdalostiPreDen = (datum) => {
    const datumStr = datum.toISOString().split('T')[0];
    return udalosti.filter(u => u.datum === datumStr);
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const udalostiDna = getUdalostiPreDen(date);
      if (udalostiDna.length > 0) {
        return (
          <div className="flex flex-col gap-1 mt-1">
            {udalostiDna.map(u => (
              <div
                key={u.id}
                className={`text-xs px-1 py-0.5 rounded border ${typFarba[u.typ_odpadu]}`}
              >
                {typNazov[u.typ_odpadu]}
              </div>
            ))}
          </div>
        );
      }
    }
    return null;
  };

  const openAddModal = () => {
    setEditingUdalost(null);
    setFormData({
      datum: selectedDate.toISOString().split('T')[0],
      typ_odpadu: 'plast',
      poznamka: ''
    });
    setShowModal(true);
  };

  const openEditModal = (udalost) => {
    setEditingUdalost(udalost);
    setFormData({
      datum: udalost.datum,
      typ_odpadu: udalost.typ_odpadu,
      poznamka: udalost.poznamka || ''
    });
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      let url = '/api/harmonogram';
      let method = 'POST';

      if (editingUdalost) {
        url = `/api/harmonogram/${editingUdalost.id}`;
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
        await loadUdalosti();
      } else {
        alert('Chyba: ' + data.error);
      }
    } catch (error) {
      console.error('Chyba pri ukladaní:', error);
      alert('Nastala chyba pri ukladaní.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Naozaj chcete odstrániť túto udalosť?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`/api/harmonogram/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (res.ok) {
        await loadUdalosti();
      } else {
        const data = await res.json();
        alert('Chyba: ' + data.error);
      }
    } catch (error) {
      console.error('Chyba pri mazaní:', error);
      alert('Nastala chyba pri mazaní.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Načítavam...</div>
      </div>
    );
  }

  const udalostiPreVybranyDen = getUdalostiPreDen(selectedDate);

  return (
    <DashboardLayout obec={obec}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Harmonogram vývozov</h2>
            <p className="text-gray-600">Spravujte pravidelné vývozy odpadu vo vašej obci</p>
          </div>
          <button
            onClick={openAddModal}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition"
          >
            + Pridať vývoz
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kalendár */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-4">
            <Calendar
              onChange={handleDateChange}
              value={selectedDate}
              tileContent={tileContent}
              locale="sk-SK"
              className="w-full border-0"
            />
          </div>

          {/* Detail vybraného dňa */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {selectedDate.toLocaleDateString('sk-SK', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h3>

            {udalostiPreVybranyDen.length > 0 ? (
              <div className="space-y-3">
                {udalostiPreVybranyDen.map(u => (
                  <div
                    key={u.id}
                    className={`p-3 rounded-lg border ${typFarba[u.typ_odpadu]}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium">{typNazov[u.typ_odpadu]}</span>
                        {u.poznamka && (
                          <p className="text-sm mt-1 opacity-75">{u.poznamka}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Žiadne vývozy</p>
                <button
                  onClick={openAddModal}
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  + Pridať vývoz na tento deň
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal pre pridanie/úpravu vývozu */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-lg bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {editingUdalost ? 'Upraviť vývoz' : 'Nový vývoz'}
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
                  Dátum *
                </label>
                <input
                  type="date"
                  name="datum"
                  value={formData.datum}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Typ odpadu *
                </label>
                <select
                  name="typ_odpadu"
                  value={formData.typ_odpadu}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="plast">Plast</option>
                  <option value="papier">Papier</option>
                  <option value="sklo">Sklo</option>
                  <option value="zmesovy">Zmesový odpad</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Poznámka (voliteľné)
                </label>
                <input
                  type="text"
                  name="poznamka"
                  value={formData.poznamka}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="napr. Mimoriadny vývoz"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                  {editingUdalost ? 'Uložiť zmeny' : 'Pridať vývoz'}
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