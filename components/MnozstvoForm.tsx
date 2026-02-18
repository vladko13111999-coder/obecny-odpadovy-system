import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Druh {
  id: number;
  kod: string;
  nazov: string;
}

interface Sposob {
  id: number;
  kod: string;
  nazov: string;
  typ: 'R' | 'D';
}

export default function MnozstvaForm({ obecId }: { obecId: number }) {
  const [druhy, setDruhy] = useState<Druh[]>([]);
  const [sposoby, setSposoby] = useState<Sposob[]>([]);
  const [formData, setFormData] = useState({
    druh_odpadu_id: '',
    sposob_nakladania_id: '',
    mnozstvo: '',
    datum_od: '',
    datum_do: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadCiselniky();
  }, []);

  async function loadCiselniky() {
    const { data: d } = await supabase.from('druhy_odpadov').select('*');
    if (d) setDruhy(d);
    const { data: s } = await supabase.from('sposoby_nakladania').select('*');
    if (s) setSposoby(s);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.from('mnozstva_odpadov').insert({
      obec_id: obecId,
      druh_odpadu_id: parseInt(formData.druh_odpadu_id),
      sposob_nakladania_id: parseInt(formData.sposob_nakladania_id),
      mnozstvo: parseFloat(formData.mnozstvo),
      datum_od: formData.datum_od,
      datum_do: formData.datum_do,
    });

    if (error) {
      setMessage(`Chyba: ${error.message}`);
    } else {
      setMessage('Údaje boli uložené.');
      setFormData({
        druh_odpadu_id: '',
        sposob_nakladania_id: '',
        mnozstvo: '',
        datum_od: '',
        datum_do: '',
      });
    }
    setLoading(false);
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Zadaj množstvá odpadov</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Druh odpadu</label>
          <select
            required
            className="w-full border rounded p-2"
            value={formData.druh_odpadu_id}
            onChange={(e) => setFormData({ ...formData, druh_odpadu_id: e.target.value })}
          >
            <option value="">-- Vyber --</option>
            {druhy.map((d) => (
              <option key={d.id} value={d.id}>
                {d.kod} – {d.nazov}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Spôsob nakladania</label>
          <select
            required
            className="w-full border rounded p-2"
            value={formData.sposob_nakladania_id}
            onChange={(e) => setFormData({ ...formData, sposob_nakladania_id: e.target.value })}
          >
            <option value="">-- Vyber --</option>
            {sposoby.map((s) => (
              <option key={s.id} value={s.id}>
                {s.kod} – {s.nazov}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Množstvo (v tonách)</label>
          <input
            type="number"
            step="0.001"
            min="0"
            required
            className="w-full border rounded p-2"
            value={formData.mnozstvo}
            onChange={(e) => setFormData({ ...formData, mnozstvo: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Dátum od</label>
            <input
              type="date"
              required
              className="w-full border rounded p-2"
              value={formData.datum_od}
              onChange={(e) => setFormData({ ...formData, datum_od: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Dátum do</label>
            <input
              type="date"
              required
              className="w-full border rounded p-2"
              value={formData.datum_do}
              onChange={(e) => setFormData({ ...formData, datum_do: e.target.value })}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Ukladám...' : 'Uložiť'}
        </button>
      </form>
      {message && <p className="mt-4 text-center text-sm text-gray-700">{message}</p>}
    </div>
  );
}