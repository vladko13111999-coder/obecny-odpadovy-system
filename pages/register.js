import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nazov: '',
    email: '',
    password: '',
    confirmPassword: '',
    velkost_obce: 'mala'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Heslá sa nezhodujú');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Heslo musí mať aspoň 6 znakov');
      setLoading(false);
      return;
    }

    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Nepodarilo sa vytvoriť používateľa');
      }

      // Calculate trial dates
      const trialStart = new Date();
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 30);

      // Create municipality record
      const { error: dbError } = await supabase
        .from('obce')
        .insert([
          {
            nazov: formData.nazov,
            email: formData.email,
            velkost_obce: formData.velkost_obce,
            subscription_status: 'trial',
            trial_start: trialStart.toISOString(),
            trial_end: trialEnd.toISOString(),
            auth_user_id: authData.user.id
          }
        ]);

      if (dbError) throw dbError;

      // Sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) throw signInError;

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Chyba pri registrácii. Skúste to znova.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
            Registrácia obce
          </h1>
          <p className="text-gray-600 text-center mb-6">
            Získajte 30-dňovú skúšobnú verziu zadarmo
          </p>

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nazov" className="block text-sm font-medium text-gray-700 mb-1">
                Názov obce *
              </label>
              <input
                type="text"
                id="nazov"
                name="nazov"
                required
                value={formData.nazov}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Napr. Obec Horná Dolná"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="starosta@obec.sk"
              />
            </div>

            <div>
              <label htmlFor="velkost_obce" className="block text-sm font-medium text-gray-700 mb-1">
                Veľkosť obce *
              </label>
              <select
                id="velkost_obce"
                name="velkost_obce"
                required
                value={formData.velkost_obce}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="mala">Malá obec (do 500 obyvateľov) - 49 €/mesiac</option>
                <option value="stredna">Stredná obec (500-2000 obyvateľov) - 99 €/mesiac</option>
                <option value="velka">Veľká obec (nad 2000 obyvateľov) - 149 €/mesiac</option>
              </select>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Heslo *
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Minimálne 6 znakov"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Potvrdenie hesla *
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Zopakujte heslo"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registrujem...' : 'Registrovať obec'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Už máte účet?{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Prihláste sa
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-gray-600 hover:text-gray-800">
            ← Späť na hlavnú stránku
          </Link>
        </div>
      </div>
    </div>
  );
}
