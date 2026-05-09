import { useEffect, useState } from 'react';
import useStore from './store/useStore';
import Toast from './components/ui/Toast';

import MainLayout from './components/layout/MainLayout';
import Dashboard from './features/dashboard/Dashboard';
import ProductForm from './features/inventory/ProductForm';
import FormulaEditor from './features/formulas/FormulaEditor';
import ReporteIndividualViewer from './components/reportes/ReporteIndividualViewer';
import ReporteColectivoViewer from './components/reportes/ReporteColectivoViewer';
import HistorialVersiones from './features/historial/historialVersiones';
import GraficaEvolucion from './features/historial/GraficaEvolucion';

// IMPORTAMOS EL LOGIN
import Login from './features/auth/Login';

function App() {
  const { initialize, notification, clearNotification, user } = useStore();
  
  // 1. Estado inicial inteligente: Redirige según el rol al cargar
  const [currentView, setCurrentView] = useState(() => {
    if (!user) return 'dashboard';
    return user.rol === 'PRODUCCION' ? 'reporte_colectivo' : 'dashboard';
  });
  
  const [editingProduct, setEditingProduct] = useState(null);

  // 2. Efecto para inicializar datos y corregir vista si el usuario cambia
  useEffect(() => {
    if (user) {
      initialize();
      // Si un Auxiliar entra y por alguna razón el estado quedó en dashboard, lo movemos
      if (user.rol === 'PRODUCCION') {
        setCurrentView('reporte_colectivo');
      }
    }
  }, [user, initialize]);

  // 3. Guardia de seguridad: Si no hay usuario, bloqueamos todo el Layout
  if (!user) {
    return <Login />;
  }

  // Handlers para edición de productos (Solo para ADMIN)
  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setCurrentView('registro');
  };

  const handleNewProduct = () => {
    setEditingProduct(null);
    setCurrentView('registro');
  };

  return (
    <MainLayout currentView={currentView} setCurrentView={setCurrentView}>
      {/* Sistema de Notificaciones */}
      {notification && (
        <Toast 
          message={notification.message} 
          type={notification.type || 'success'} 
          onClose={clearNotification} 
        />
      )}

      {/* --- RENDERIZADO CONDICIONAL POR ROL --- */}

      {/* DASHBOARD: Solo ADMIN */}
      {currentView === 'dashboard' && user.rol === 'ADMIN' && (
        <Dashboard 
          onEdit={handleEditProduct}
          setCurrentView={setCurrentView} 
        />
      )}

      {/* REGISTRO: Solo ADMIN */}
      {currentView === 'registro' && user.rol === 'ADMIN' && (
        <ProductForm 
          mode={editingProduct ? 'edit' : 'create'}
          initialData={editingProduct}
          onCancel={() => {
            setEditingProduct(null);
            setCurrentView('dashboard');
          }}
        />
      )}

      {/* FORMULACIÓN: Solo ADMIN */}
      {currentView === 'formulacion' && user.rol === 'ADMIN' && (
        <FormulaEditor />
      )}

      {/* FICHA INDIVIDUAL: Solo ADMIN */}
      {currentView === 'reporte_individual' && user.rol === 'ADMIN' && (
        <ReporteIndividualViewer />
      )}

      {/* REPORTE COLECTIVO: ADMIN y PRODUCCION (Auxiliar) */}
      {currentView === 'reporte_colectivo' && (
        <ReporteColectivoViewer />
      )}

      {/* HISTORIAL: Solo ADMIN */}
      {currentView === 'historial' && user.rol === 'ADMIN' && (
        <HistorialVersiones />
      )}

      {/* GRAFICAS: Solo ADMIN */}
      {currentView === 'grafica_evolucion' && user.rol === 'ADMIN' && (
        <GraficaEvolucion />
      )}
    </MainLayout>
  );
}

export default App;