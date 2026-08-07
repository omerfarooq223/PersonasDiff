import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import RunList from './pages/RunList';
import CreateRun from './pages/CreateRun';
import RunDetail from './pages/RunDetail';
import Comparison from './pages/Comparison';
import Replay from './pages/Replay';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/runs" replace />} />
        <Route path="/runs" element={<RunList />} />
        <Route path="/runs/new" element={<CreateRun />} />
        <Route path="/runs/:id" element={<RunDetail />} />
        <Route path="/runs/:id/comparison" element={<Comparison />} />
        <Route path="/runs/:id/replay" element={<Replay />} />
      </Routes>
    </Layout>
  );
}

export default App;
