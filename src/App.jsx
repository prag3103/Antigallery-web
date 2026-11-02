import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import GalleryPage from './pages/GalleryPage.jsx';

// Like the Route enum + NavigationStack in the iOS app:
// each web address shows a different screen.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/g/:galleryId" element={<GalleryPage />} />
    </Routes>
  );
}