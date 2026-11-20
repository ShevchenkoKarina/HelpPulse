import { Routes, Route } from 'react-router-dom';
import PublicLayout from './components/PublicLayout.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import Home from './pages/public/Home.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import NewRequest from './pages/public/NewRequest.jsx';
import Track from './pages/public/Track.jsx';
import Donate from './pages/public/Donate.jsx';
import Reviews from './pages/public/Reviews.jsx';
import ComingSoon from './pages/ComingSoon.jsx';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Публічний сайт */}
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="request" element={<NewRequest />} />
          <Route path="track" element={<Track />} />
          <Route path="track/:id" element={<Track />} />
          <Route path="donate" element={<Donate />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="*" element={<ComingSoon title="Сторінку не знайдено" notFound />} />
        </Route>

        {/* Керування (для координаторів) */}
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="requests" element={<ComingSoon title="Заявки" admin />} />
          <Route path="kits" element={<ComingSoon title="Набори допомоги" admin />} />
          <Route path="deliveries" element={<ComingSoon title="Доставки" admin />} />
          <Route path="stock" element={<ComingSoon title="Склад і залишки" admin />} />
          <Route path="donations" element={<ComingSoon title="Пожертви" admin />} />
          <Route path="volunteers" element={<ComingSoon title="Волонтери" admin />} />
          <Route path="refs" element={<ComingSoon title="Довідники" admin />} />
          <Route path="feedback" element={<ComingSoon title="Відгуки" admin />} />
          <Route path="reports" element={<ComingSoon title="Звіти" admin />} />
        </Route>
      </Routes>
    </>
  );
}
