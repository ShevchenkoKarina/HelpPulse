//Карта сторінок: яка адреса веде на яку сторінку (/request → форма заявки, /admin/stock → склад)
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
import AdminRequests from './pages/admin/AdminRequests.jsx';
import AdminKits from './pages/admin/AdminKits.jsx';
import AdminDeliveries from './pages/admin/AdminDeliveries.jsx';
import RequireAdmin from './components/RequireAdmin.jsx';
import AdminStock from './pages/admin/AdminStock.jsx';
import AdminDonations from './pages/admin/AdminDonations.jsx';
import AdminVolunteers from './pages/admin/AdminVolunteers.jsx';
import AdminRefs from './pages/admin/AdminRefs.jsx';
import AdminFeedback from './pages/admin/AdminFeedback.jsx';
import AdminReports from './pages/admin/AdminReports.jsx';
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
        <Route path="admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<AdminDashboard />} />
          <Route path="requests" element={<AdminRequests />} />
          <Route path="kits" element={<AdminKits />} />
          <Route path="deliveries" element={<AdminDeliveries />} />
          <Route path="stock" element={<AdminStock />} />
          <Route path="donations" element={<AdminDonations />} />
          <Route path="volunteers" element={<AdminVolunteers />} />
          <Route path="refs" element={<AdminRefs />} />
          <Route path="feedback" element={<AdminFeedback />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>
      </Routes>
    </>
  );
}
