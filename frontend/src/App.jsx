import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import EducoAssist from './pages/EducoAssist';
import NotesHub from './pages/NotesHub';
import StudyRoom from './pages/StudyRoom';
import SharedWorkspace from './pages/SharedWorkspace';
import ProductivityTools from './pages/ProductivityTools';
import VisualLabs from './pages/VisualLabs';
import SmartWorkspace from './pages/SmartWorkspace';
import BreakZone from './pages/BreakZone';
import LectureZone from './pages/LectureZone';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import './App.css';
import './styles/layout.css';
import './styles/modern.css';
import './styles/home.css';
import './styles/modules.css';
import './styles/components.css';
import './styles/animations.css';
import './styles/decorations.css';
import './styles/login.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/workspace/shared/:roomCode" element={<SharedWorkspace />} />
        <Route
          path="*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/educoassist" element={<EducoAssist />} />
                <Route path="/notes" element={<NotesHub />} />
                <Route path="/study-room" element={<StudyRoom />} />
                <Route path="/tools" element={<ProductivityTools />} />
                <Route path="/visual-labs" element={<VisualLabs />} />
                <Route path="/workspace" element={<SmartWorkspace />} />
                <Route path="/break" element={<BreakZone />} />
                <Route path="/lectures" element={<LectureZone />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
