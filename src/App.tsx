import React, { useState, useEffect } from 'react';
import { HomePage } from './components/HomePage';
import { AdminPage } from './pages/AdminPage';
import './styles/globals.css';

function App() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (hash === '#admin') return <AdminPage />;
  return <HomePage />;
}

export default App;
