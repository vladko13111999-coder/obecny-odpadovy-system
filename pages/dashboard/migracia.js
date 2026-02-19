import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/DashboardLayout';

export default function Migracia() {
  const router = useRouter();
  const [obec, setObec] = useState(null);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

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

  const handleMigration = async () => {
    setMigrating(true);
    setError(null);
    setResult(null);

    try {
      // Načítanie SQL skriptu cez API
      const response = await fetch('/api/get-migration-script');
      if (!response.ok) throw new Error('Nepodarilo sa načítať SQL skript');
      
      const data = await response.json();
      const sqlContent = data.sql;

      // Zobrazenie inštrukcií
      setResult({
        type: 'info',
        message: 'Migrácia musí byť spustená manuálne v Supabase SQL Editore',
        instructions: [
          '1. Otvorte Supabase Dashboard → SQL Editor',
          '2. Skopírujte SQL skript nižšie',
          '3. Vložte ho do SQL Editora a spustite',
          '4. Overte výsledok'
        ],
        sqlScript: sqlContent
      });

    } catch (err) {
      setError('Chyba pri načítaní migračného skriptu: ' + err.message);
    } finally {
      setMigrating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('SQL skript skopírovaný do schránky!');
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
          <h2 className="text-3xl font-bold text-gray-900">Migrácia databázy</h2>
          <p className="text-gray-600">Aktualizácia schémy pre podporu ISOH systému</p>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-2">ℹ️ Informácie</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Migrácia pridá nové stĺpce do tabuliek <code className="bg-blue-100 px-1 rounded">obce</code> a <code className="bg-blue-100 px-1 rounded">vyvozy</code></li>
            <li>Aktualizuje existujúce záznamy s automatickými kódmi odpadu</li>
            <li>Aktualizuje trigger funkciu pre automatické nastavenie kódov</li>
            <li>Migrácia je bezpečná a môže byť spustená viackrát</li>
          </ul>
        </div>

        {/* Migration button */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Spustiť migráciu</h3>
          
          <button
            onClick={handleMigration}
            disabled={migrating}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {migrating ? 'Pripravujem...' : 'Zobraziť SQL skript'}
          </button>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-6 space-y-4">
              <div className={`p-4 rounded-lg ${
                result.type === 'success' ? 'bg-green-50 border border-green-300 text-green-800' :
                result.type === 'error' ? 'bg-red-50 border border-red-300 text-red-800' :
                'bg-blue-50 border border-blue-300 text-blue-800'
              }`}>
                <h4 className="font-bold mb-2">{result.message}</h4>
                
                {result.instructions && (
                  <ol className="list-decimal list-inside space-y-1 mb-4">
                    {result.instructions.map((instruction, idx) => (
                      <li key={idx}>{instruction}</li>
                    ))}
                  </ol>
                )}

                {result.sqlScript && (
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium">SQL skript:</label>
                      <button
                        onClick={() => copyToClipboard(result.sqlScript)}
                        className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                      >
                        📋 Kopírovať
                      </button>
                    </div>
                    <textarea
                      readOnly
                      value={result.sqlScript}
                      className="w-full h-96 p-4 bg-gray-50 border border-gray-300 rounded font-mono text-xs overflow-auto"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Alternative methods */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Alternatívne metódy</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Metóda 1: Supabase SQL Editor (Odporúčané)</h4>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside ml-4">
                <li>Otvorte Supabase Dashboard</li>
                <li>Prejdite na SQL Editor</li>
                <li>Skopírujte SQL skript vyššie</li>
                <li>Spustite ho</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Metóda 2: API Endpoint</h4>
              <p className="text-sm text-gray-600 mb-2">
                Použite endpoint <code className="bg-gray-100 px-1 rounded">/api/migrate-database</code> s SERVICE_ROLE_KEY
              </p>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
{`curl -X POST http://localhost:3000/api/migrate-database \\
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"`}
              </pre>
            </div>
          </div>
        </div>

        {/* Documentation link */}
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-6">
          <h4 className="font-bold text-yellow-900 mb-2">📚 Dokumentácia</h4>
          <p className="text-sm text-yellow-800 mb-2">
            Pre podrobnejšie informácie pozrite súbor <code className="bg-yellow-100 px-1 rounded">MIGRATION_GUIDE.md</code>
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
