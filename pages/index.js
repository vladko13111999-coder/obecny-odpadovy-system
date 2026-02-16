import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-4xl w-full text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Obecný odpadový systém
        </h1>
        <p className="text-xl md:text-2xl text-gray-700 mb-12">
          Jednoduchá evidencia a motivácia pre obce
        </p>
        
        <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
          <div className="mb-6">
            <p className="text-lg text-gray-600 mb-4">
              Pomôžeme vám splniť novú legislatívu (NIS2, vyhláška č. 89/2024 Z.z.) 
              a motivovať obyvateľov k triedeniu odpadu.
            </p>
            <ul className="text-left max-w-2xl mx-auto space-y-3 text-gray-700">
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Automatické generovanie kvartálnych hlásení pre štát (CSV a XML)</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Gamifikácia a bodovanie pre obyvateľov</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Evidencia obyvateľov a vývozov odpadu</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>30-dňová skúšobná verzia zadarmo</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/login">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition duration-200 shadow-lg hover:shadow-xl">
              Prihlásiť sa
            </button>
          </Link>
          <Link href="/register">
            <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition duration-200 shadow-lg hover:shadow-xl">
              Registrovať obec
            </button>
          </Link>
        </div>

        <div className="mt-12 p-6 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
          <p className="text-sm text-yellow-800 font-semibold">
            ⚠️ Od 1.1.2026 platí nová povinnosť kvartálnych hlásení podľa vyhlášky č. 89/2024 Z.z.
          </p>
        </div>
      </div>
    </div>
  );
}
