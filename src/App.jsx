import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import ScrollThumb from './components/ScrollThumb.jsx';
import Checkout from './pages/desk/Checkout.jsx';
import MyRooms from './pages/housekeeper/MyRooms.jsx';
import Rooms from './pages/manager/Rooms.jsx';
import Board from './pages/supervisor/Board.jsx';
import Work from './pages/supervisor/Work.jsx';
import Welcome from './pages/Welcome.jsx';

export default function App() {
  const { pathname } = useLocation();
  return (
    <div className="app">
      <Header />
      <ScrollThumb />
      {/* The key restarts the page's entrance animation on every navigation. */}
      <main className="main" key={pathname}>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/supervisor" element={<Navigate to="/supervisor/board" replace />} />
          <Route path="/supervisor/board" element={<Board />} />
          <Route path="/supervisor/work" element={<Work />} />
          <Route path="/desk" element={<Navigate to="/desk/checkout" replace />} />
          <Route path="/desk/checkout" element={<Checkout />} />
          <Route path="/housekeeper" element={<MyRooms />} />
          <Route path="/manager" element={<Navigate to="/manager/rooms" replace />} />
          <Route path="/manager/rooms" element={<Rooms />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}