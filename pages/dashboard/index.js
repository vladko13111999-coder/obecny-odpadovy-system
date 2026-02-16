import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/DashboardLayout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const router = useRouter();
  const [obec, setObec] = useState(null);
  const [stats, setStats] = useState({
    totalResidents: 0,
    totalCollections: 0,
    totalPoints: 0,
    wasteByType: {}
  });
  const [chartData, setChartData] = useState([]);
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

      // Get municipality data
      const { data: obecData, error: obecError } = await supabase
        .from('obce')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (obecError) throw obecError;
      
      setObec(obecData);

      // Get statistics
      await loadStats(obecData.id);
      await loadChartData(obecData.id);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (obecId) => {
    try {
      // Get total residents
      const { count: residentCount } = await supabase
        .from('obyvatelia')
        .select('*', { count: 'exact', head: true })
        .eq('obec_id', obecId);

      // Get total collections
      const { count: collectionCount } = await supabase
        .from('vyvozy')
        .select('*', { count: 'exact', head: true })
        .eq('obec_id', obecId);

      // Get total points
      const { data: residentsData } = await supabase
        .from('obyvatelia')
        .select('celkove_body')
        .eq('obec_id', obecId);

      const totalPoints = residentsData?.reduce((sum, r) => sum + (r.celkove_body || 0), 0) || 0;

      // Get waste by type
      const { data: wasteData } = await supabase
        .from('vyvozy')
        .select('typ_odpadu, mnozstvo_kg')
        .eq('obec_id', obecId);

      const wasteByType = {};
      wasteData?.forEach(item => {
        if (!wasteByType[item.typ_odpadu]) {
          wasteByType[item.typ_odpadu] = 0;
        }
        wasteByType[item.typ_odpadu] += parseFloat(item.mnozstvo_kg);
      });

      setStats({
        totalResidents: residentCount || 0,
        totalCollections: collectionCount || 0,
        totalPoints,
        wasteByType
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadChartData = async (obecId) => {
    try {
      const { data: vyvozy, error } = await supabase
        .from('vyvozy')
        .select('typ_odpadu, mnozstvo_kg')
        .eq('obec_id', obecId);

      if (error) throw error;

      const aggregated = {
        plast: 0,
        papier: 0,
        sklo: 0,
        zmesovy: 0,
      };

      vyvozy?.forEach(v => {
        aggregated[v.typ_odpadu] += parseFloat(v.mnozstvo_kg);
      });

      const chartDataFormatted = [
        { name: 'Plast', kg: aggregated.plast, color: '#F59E0B' },
        { name: 'Papier', kg: aggregated.papier, color: '#3B82F6' },
        { name: 'Sklo', kg: aggregated.sklo, color: '#10B981' },
        { name: 'Zmiešaný', kg: aggregated.zmesovy, color: '#6B7280' },
      ];

      setChartData(chartDataFormatted);
    } catch (error) {
      console.error('Error loading chart data:', error);
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

  return (
    <DashboardLayout obec={obec}>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Prehľad</h2>
          <p className="text-gray-600">Vitajte v systéme správy odpadového hospodárstva</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Obyvatelia</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalResidents}</p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Vývozy</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalCollections}</p>
              </div>
              <div className="text-4xl">🗑️</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Celkové body</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalPoints}</p>
              </div>
              <div className="text-4xl">⭐</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Veľkosť obce</p>
                <p className="text-xl font-bold text-gray-900 capitalize">{obec?.velkost_obce}</p>
              </div>
              <div className="text-4xl">🏘️</div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Prehľad odpadu podľa typu</h3>
          {chartData.some(item => item.kg > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis unit=" kg" />
                <Tooltip />
                <Legend />
                <Bar dataKey="kg" fill="#4CAF50">
                  {chartData.map((entry, index) => (
                    <Bar key={`bar-${index}`} dataKey="kg" fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-4">Zatiaľ nie sú žiadne záznamy o odpade</p>
          )}
        </div>

        {/* Waste by Type (progress bars) */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Odpad podľa typu</h3>
          {Object.keys(stats.wasteByType).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(stats.wasteByType).map(([type, amount]) => (
                <div key={type}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {wasteTypeLabels[type] || type}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {amount.toFixed(2)} kg
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        type === 'zmesovy' ? 'bg-gray-500' :
                        type === 'plast' ? 'bg-yellow-500' :
                        type === 'papier' ? 'bg-blue-500' :
                        'bg-green-500'
                      }`}
                      style={{
                        width: `${(amount / Math.max(...Object.values(stats.wasteByType))) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Zatiaľ nie sú žiadne záznamy o odpade</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Rýchle akcie</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/dashboard/obyvatelia')}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-6 py-4 rounded-lg font-medium transition"
            >
              + Pridať obyvateľa
            </button>
            <button
              onClick={() => router.push('/dashboard/vyvozy')}
              className="bg-green-50 hover:bg-green-100 text-green-700 px-6 py-4 rounded-lg font-medium transition"
            >
              + Pridať vývoz
            </button>
            <button
              onClick={() => router.push('/dashboard/reporty')}
              className="bg-purple-50 hover:bg-purple-100 text-purple-700 px-6 py-4 rounded-lg font-medium transition"
            >
              📄 Generovať report
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}