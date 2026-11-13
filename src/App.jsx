import { Route, Routes } from 'react-router-dom';
import Welcome from './pages/Welcome.jsx';

export default function App() {
  return (
    <div className="app">
      <main className="main">
        <Routes>
          <Route path="/" element={<Welcome />} />
        </Routes>
      </main>
    </div>
  );
}