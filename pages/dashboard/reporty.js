import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/DashboardLayout';

export default function Reporty() {
  const router = useRouter();
  const [obec, setObec] = useState(null);
  const [reporty, setReporty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState({
    kvartal: Math.ceil((new Date().getMonth() + 1) / 3),
    rok: new Date().getFullYear()
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
      await loadReporty(obecData.id);
    } catch (error) {
      console.error('Error loading data:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadReporty = async (obecId) => {
  console.log('loadReporty volaná s obecId:', obecId);
  try {
    const { data, error } = await supabase
      .from('reporty')
      .select('*')
      .eq('obec_id', obecId)
      .order('rok', { ascending: false })
      .order('kvartal', { ascending: false });

    if (error) {
      console.error('Chyba pri načítaní reportov:', error);
      throw error;
    }
    
    console.log('Načítané reporty:', data);
    setReporty(data || []);
  } catch (error) {
    console.error('Error loading reports:', error);
  }
};

const handleGenerateReport = async () => {
  setGenerating(true);
  console.log('Generujem report pre:', selectedQuarter);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Session token existuje:', !!session);

    const response = await fetch('/api/generate-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(selectedQuarter),
    });

    console.log('Odpoveď z API:', response.status);
    const data = await response.json();
    console.log('Dáta z API:', data);

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate report');
    }

    alert(`Report vygenerovaný! Celkovo ${data.summary.totalCollections} záznamov.`);
    console.log('Volám loadReporty pre obecId:', obec.id);
    await loadReporty(obec.id);
    console.log('loadReporty dokončené');
  } catch (error) {
    console.error('Error generating report:', error);
    alert('Chyba pri generovaní reportu: ' + error.message);
  } finally {
    setGenerating(false);
  }
};

  const downloadFile = (dataUri, filename) => {
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Načítavam...</div>
      </div>
    );
  }

  const quarters = [
    { value: 1, label: 'Q1 (Január - Marec)' },
    { value: 2, label: 'Q2 (Apríl - Jún)' },
    { value: 3, label: 'Q3 (Júl - September)' },
    { value: 4, label: 'Q4 (Október - December)' }
  ];

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let i = currentYear; i >= currentYear - 5; i--) {
    years.push(i);
  }

  return (
    <DashboardLayout obec={obec}>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Reporty pre štát</h2>
          <p className="text-gray-600">Generujte kvartálne hlásenia podľa vyhlášky č. 89/2024 Z.z.</p>
        </div>

        {/* Generate Report Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Generovať nový report</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kvartál
              </label>
              <select
                value={selectedQuarter.kvartal}
                onChange={(e) => setSelectedQuarter({ ...selectedQuarter, kvartal: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {quarters.map(q => (
                  <option key={q.value} value={q.value}>{q.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rok
              </label>
              <select
                value={selectedQuarter.rok}
                onChange={(e) => setSelectedQuarter({ ...selectedQuarter, rok: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleGenerateReport}
                disabled={generating}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? 'Generujem...' : 'Generovať report'}
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-300 text-blue-800 px-4 py-3 rounded text-sm">
            <strong>Poznámka:</strong> Report obsahuje agregované údaje o odpade za vybraný kvartál vo formátoch CSV a XML pripravené pre odoslanie do systému ISOH.
          </div>
        </div>

        {/* Reports List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Vygenerované reporty</h3>
          </div>
          
          {reporty.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Obdobie
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dátum generovania
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Súbory
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reporty.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          Q{report.kvartal} {report.rok}
                        </div>
                        <div className="text-sm text-gray-500">
                          {quarters.find(q => q.value === report.kvartal)?.label}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(report.vygenerovane_dna).toLocaleString('sk-SK')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => downloadFile(report.subor_csv, `report_Q${report.kvartal}_${report.rok}.csv`)}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded font-medium transition text-xs"
                          >
                            📄 CSV
                          </button>
                          <button
                            onClick={() => downloadFile(report.subor_xml, `report_Q${report.kvartal}_${report.rok}.xml`)}
                            className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded font-medium transition text-xs"
                          >
                            📄 XML
                          </button>
                          <button
                            onClick={() => downloadFile(report.subor_xlsx, `report_Q${report.kvartal}_${report.rok}.xlsx`)}
                            className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1.5 rounded font-medium transition text-xs"
                          >
                            📊 Excel (XLSX)
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Zatiaľ nemáte žiadne vygenerované reporty</p>
              <p className="text-sm text-gray-400">Použite formulár vyššie na vytvorenie prvého reportu</p>
            </div>
          )}
        </div>

        {/* Information Section */}
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-6">
          <h4 className="font-bold text-yellow-900 mb-2">⚠️ Dôležité informácie</h4>
          <ul className="text-sm text-yellow-800 space-y-2">
            <li>• Reporty musia byť odoslané do systému ISOH do 30 dní po skončení kvartálu</li>
            <li>• CSV formát je vhodný pre import do tabuľkových procesorov</li>
            <li>• XML formát je pripravený pre automatické spracovanie v systéme ISOH</li>
            <li>• Reporty obsahujú agregované údaje o všetkých vývozoch za dané obdobie</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}