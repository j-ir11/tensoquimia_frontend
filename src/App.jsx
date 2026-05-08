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

function App() {
  const { initialize, notification, clearNotification } = useStore();
  const [currentView, setCurrentView] = useState('dashboard');
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    initialize();
  }, []);

  // Función para editar (cambia vista + guarda producto)
  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setCurrentView('registro');
  };

  // Función para nuevo producto
  const handleNewProduct = () => {
    setEditingProduct(null);
    setCurrentView('registro');
  };

  return (
    <MainLayout currentView={currentView} setCurrentView={setCurrentView}>
      {/* Notificación */}
      {notification && (
        <Toast 
          message={notification.message} 
          type={notification.type || 'success'} 
          onClose={clearNotification} 
        />
      )}

      {currentView === 'dashboard' && (
        <Dashboard 
          onEdit={handleEditProduct}        // ← Corregido
          setCurrentView={setCurrentView} 
        />
      )}

      {currentView === 'registro' && (
        <ProductForm 
          mode={editingProduct ? 'edit' : 'create'}
          initialData={editingProduct}
          onCancel={() => {
            setEditingProduct(null);
            setCurrentView('dashboard');
          }}
        />
      )}

      {currentView === 'formulacion' && <FormulaEditor />}

      {currentView === 'reporte_individual' && <ReporteIndividualViewer />}
      {currentView === 'reporte_colectivo' && <ReporteColectivoViewer />}
      {currentView === 'historial' && <HistorialVersiones />}
      {currentView === 'grafica_evolucion' && <GraficaEvolucion />}
    </MainLayout>
  );
}

export default App;