import { useEffect, useState } from 'react';
import { Settings, Info } from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';

export default function Configuracion() {
  const [version, setVersion] = useState<string>('Cargando...');
  const [build, setBuild] = useState<string>('');

  useEffect(() => {
    const fetchAppInfo = async () => {
      try {
        const info = await CapacitorApp.getInfo();
        setVersion(info.version);
        setBuild(info.build);
      } catch (error) {
        console.log('App info not available in web context', error);
        setVersion('Web/Dev');
        setBuild('N/A');
      }
    };
    fetchAppInfo();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings /> Configuración
        </h2>
        <p className="text-gray-500 text-sm mt-1">Ajustes del sistema y panel privado.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
          Información de la Aplicación
        </h3>

        <div className="flex items-start gap-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg text-blue-600 dark:text-blue-400">
            <Info size={24} />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white">Camborio Reservas Privado</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Versión de la APP: <strong className="font-mono text-gray-900 dark:text-white">v{version}</strong>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Código de Build: <strong className="font-mono text-gray-900 dark:text-white">{build}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
