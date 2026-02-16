import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function Upgrade() {
  const router = useRouter();
  const [obec, setObec] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingCheckout, setProcessingCheckout] = useState(false);

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

  const handleActivateSubscription = async (planSize) => {
    setProcessingCheckout(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No session');
      }

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ planSize }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Chyba pri vytváraní platby. Skúste to znova.');
      setProcessingCheckout(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Načítavam...</div>
      </div>
    );
  }

  const plans = [
    {
      size: 'mala',
      name: 'Malá obec',
      description: 'Do 500 obyvateľov',
      price: '49',
      features: [
        'Neomedzený počet obyvateľov',
        'Evidencia vývozov',
        'Bodovací systém',
        'Generovanie reportov CSV/XML',
        'Technická podpora'
      ]
    },
    {
      size: 'stredna',
      name: 'Stredná obec',
      description: '500-2000 obyvateľov',
      price: '99',
      features: [
        'Všetky funkcie malej obce',
        'Prioritná podpora',
        'Rozšírené štatistiky',
        'Export dát',
        'API prístup'
      ],
      recommended: true
    },
    {
      size: 'velka',
      name: 'Veľká obec',
      description: 'Nad 2000 obyvateľov',
      price: '149',
      features: [
        'Všetky funkcie strednej obce',
        'Dedikovaný account manager',
        'Vlastné prispôsobenie',
        'Integrácia s externými systémami',
        'SLA záruka'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Aktivujte predplatné
          </h1>
          <p className="text-xl text-gray-600">
            Vyberte si plán podľa veľkosti vašej obce
          </p>
          {obec?.subscription_status === 'trial' && (
            <div className="mt-4 inline-block bg-yellow-100 border border-yellow-300 text-yellow-800 px-6 py-3 rounded-lg">
              Momentálne používate skúšobnú verziu
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.size}
              className={`bg-white rounded-lg shadow-xl overflow-hidden ${
                plan.recommended ? 'ring-4 ring-green-500 transform scale-105' : ''
              }`}
            >
              {plan.recommended && (
                <div className="bg-green-500 text-white text-center py-2 font-bold">
                  ODPORÚČANÉ
                </div>
              )}
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-6">{plan.description}</p>
                
                <div className="mb-6">
                  <span className="text-5xl font-bold text-gray-900">{plan.price}€</span>
                  <span className="text-gray-600">/mesiac</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleActivateSubscription(plan.size)}
                  disabled={processingCheckout}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingCheckout ? 'Spracovávam...' : `Aktivovať predplatné (${plan.price}€/mesiac)`}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link href="/dashboard">
            <button className="text-gray-600 hover:text-gray-800 font-medium">
              ← Späť na dashboard
            </button>
          </Link>
        </div>

        <div className="mt-12 bg-white rounded-lg shadow-sm p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Často kladené otázky</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Môžem kedykoľvek zrušiť predplatné?</h4>
              <p className="text-gray-600">Áno, predplatné môžete zrušiť kedykoľvek bez dodatočných poplatkov.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Čo sa stane po skončení skúšobnej verzie?</h4>
              <p className="text-gray-600">Po skončení 30-dňovej skúšobnej verzie budete musieť aktivovať platené predplatné, aby ste mohli pokračovať v používaní systému.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Sú ceny uvedené s DPH?</h4>
              <p className="text-gray-600">Áno, všetky ceny sú uvedené vrátane DPH.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}