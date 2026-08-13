import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { createContext, useCallback, useContext, useState } from 'react';
import Layout from './components/Layout';
import Welcome from './pages/Welcome';
import VideoMatch from './pages/VideoMatch';
import LiveMatch from './pages/LiveMatch';
import FaceDatabase from './pages/FaceDatabase';
import EmotionDetect from './pages/EmotionDetect';
import NotFound from './pages/NotFound';
import { ToastItem, ToastType } from './types';
import { uid } from './lib/utils';
import ToastContainer from './components/Toast';

interface ToastCtx {
  toast: (msg: string, type?: ToastType) => void;
}
export const ToastContext = createContext<ToastCtx>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

export default function App() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const location = useLocation();

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = uid();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4500);
  }, []);

  const removeToast = (id: string) => setToasts((p) => p.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      <Layout>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Welcome />} />
            <Route path="/video" element={<VideoMatch />} />
            <Route path="/live" element={<LiveMatch />} />
            <Route path="/database" element={<FaceDatabase />} />
            <Route path="/emotion" element={<EmotionDetect />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnimatePresence>
      </Layout>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}
