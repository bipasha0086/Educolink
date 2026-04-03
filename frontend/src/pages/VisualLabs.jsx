import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  IoChevronForward,
  IoColorPaletteOutline,
  IoGitNetworkOutline,
  IoShapesOutline,
  IoSparklesOutline
} from 'react-icons/io5';
import { FloatingParticles, GradientMesh } from '../components/SVGBackgrounds/SVGBackgrounds';

const features = [
  { title: 'Mind Maps', detail: 'Build connected concept trees for quick revision.', icon: <IoGitNetworkOutline /> },
  { title: 'Flowcharts', detail: 'Turn complex topics into clear step-by-step diagrams.', icon: <IoShapesOutline /> },
  { title: 'Concept Boards', detail: 'Mix text, visuals, and references on one canvas.', icon: <IoColorPaletteOutline /> },
];

export default function VisualLabs() {
  return (
    <div className="module-page">
      <FloatingParticles />
      <GradientMesh colors={['#0e7490', '#06b6d4', '#67e8f9']} />
      
      <motion.div
        className="module-hero"
        style={{ background: 'linear-gradient(135deg, rgba(14,116,144,0.7), rgba(6,182,212,0.5), rgba(103,232,249,0.4))' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="module-hero-content">
          <div className="breadcrumb">
            <Link to="/">Home</Link>
            <IoChevronForward />
            <span>Visual Labs</span>
          </div>
          <h1>Visual Labs</h1>
          <p>Learn faster with visual thinking tools and diagram-based workflows.</p>
        </div>
      </motion.div>

      <div className="feature-grid">
        {features.map((feature, idx) => (
          <motion.div
            key={feature.title}
            className="feature-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="module-card-illustration" style={{ opacity: 0.08, transform: idx % 2 === 0 ? 'rotate(-5deg)' : 'rotate(8deg)' }}>
              {feature.icon}
            </div>
            <div className="feature-card-header">
              <div className="feature-card-icon" style={{ background: 'rgba(14,116,144,0.14)', color: '#0e7490' }}>
                {feature.icon}
              </div>
              <div>
                <div className="feature-card-title">{feature.title}</div>
                <div className="feature-card-subtitle">Visual productivity</div>
              </div>
            </div>
            <div className="feature-card-body">
              <div className="feature-item">
                <div className="feature-item-icon" style={{ background: 'rgba(14,116,144,0.14)', color: '#0e7490' }}>
                  <IoSparklesOutline />
                </div>
                {feature.detail}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
