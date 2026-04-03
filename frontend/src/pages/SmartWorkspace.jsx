import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  IoChevronForward,
  IoGlobeOutline,
  IoAppsOutline,
  IoTimerOutline,
  IoLayersOutline
} from 'react-icons/io5';
import { FloatingParticles, GradientMesh } from '../components/SVGBackgrounds/SVGBackgrounds';

const blocks = [
  { title: 'Workspace Tabs', text: 'Keep your class portals and docs organized in one place.', icon: <IoAppsOutline /> },
  { title: 'Focus Timer', text: 'Attach Pomodoro sessions directly to your active task.', icon: <IoTimerOutline /> },
  { title: 'Study Layouts', text: 'Switch between reading, coding, and planning layouts.', icon: <IoLayersOutline /> },
];

export default function SmartWorkspace() {
  return (
    <div className="module-page">
      <FloatingParticles />
      <GradientMesh colors={['#00685a', '#00a58e', '#72e5d3']} />
      
      <motion.div
        className="module-hero"
        style={{ background: 'linear-gradient(135deg, rgba(0,104,90,0.7), rgba(0,165,142,0.5), rgba(114,229,211,0.4))' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="module-hero-content">
          <div className="breadcrumb">
            <Link to="/">Home</Link>
            <IoChevronForward />
            <span>Smart Workspace</span>
          </div>
          <h1>Smart Workspace</h1>
          <p>Your personalized study cockpit for tasks, tabs, and focus routines.</p>
        </div>
      </motion.div>

      <div className="feature-grid">
        {blocks.map((block, idx) => (
          <motion.div
            key={block.title}
            className="feature-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="module-card-illustration" style={{ opacity: 0.08, transform: idx % 2 === 0 ? 'rotate(-5deg)' : 'rotate(8deg)' }}>
              {block.icon}
            </div>
            <div className="feature-card-header">
              <div className="feature-card-icon" style={{ background: 'rgba(0,104,90,0.14)', color: '#00685a' }}>
                {block.icon}
              </div>
              <div>
                <div className="feature-card-title">{block.title}</div>
                <div className="feature-card-subtitle">Workspace feature</div>
              </div>
            </div>
            <div className="feature-card-body">
              <div className="feature-item">
                <div className="feature-item-icon" style={{ background: 'rgba(0,104,90,0.14)', color: '#00685a' }}>
                  <IoGlobeOutline />
                </div>
                {block.text}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
