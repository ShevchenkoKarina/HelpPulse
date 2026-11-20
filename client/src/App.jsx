import { Routes, Route } from 'react-router-dom';
import PublicLayout from './components/PublicLayout.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import Home from './pages/public/Home.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import ComingSoon from './pages/ComingSoon.jsx';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Публічний сайт */}
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="request" element={<ComingSoon title="Подати заявку на допомогу" />} />
          <Route path="track" element={<ComingSoon title="Відстежити заявку" />} />
          <Route path="track/:id" element={<ComingSoon title="Стан заявки" />} />
          <Route path="donate" element={<ComingSoon title="Допомогти як донор" />} />
          <Route path="reviews" element={<ComingSoon title="Відгуки отримувачів" />} />
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
