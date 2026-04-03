import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  IoChevronForward,
  IoPlayCircleOutline,
  IoBookOutline,
  IoMicOutline,
  IoDocumentTextOutline
} from 'react-icons/io5';
import { FloatingParticles, GradientMesh } from '../components/SVGBackgrounds/SVGBackgrounds';

const lectureTools = [
  { title: 'Live Lectures', text: 'Join live classes and keep synchronized notes.', icon: <IoPlayCircleOutline /> },
  { title: 'Transcripts', text: 'Auto-generate text from lecture audio.', icon: <IoMicOutline /> },
  { title: 'Quick Summaries', text: 'Condense sessions into actionable revision points.', icon: <IoDocumentTextOutline /> },
];

export default function LectureZone() {
  return (
    <div className="module-page">
      <FloatingParticles />
      <GradientMesh colors={['#7a001f', '#b41340', '#f06292']} />
      
      <motion.div
        className="module-hero"
        style={{ background: 'linear-gradient(135deg, rgba(122,0,31,0.7), rgba(180,19,64,0.5), rgba(240,98,146,0.4))' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="module-hero-content">
          <div className="breadcrumb">
            <Link to="/">Home</Link>
            <IoChevronForward />
            <span>Lecture Zone</span>
          </div>
          <h1>Lecture Zone</h1>
          <p>Watch, capture, and revise lectures with AI-assisted tools.</p>
        </div>
      </motion.div>

      <div className="feature-grid">
        {lectureTools.map((tool, idx) => (
          <motion.div
            key={tool.title}
            className="feature-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="module-card-illustration" style={{ opacity: 0.08, transform: idx % 2 === 0 ? 'rotate(-5deg)' : 'rotate(8deg)' }}>
              {tool.icon}
            </div>
            <div className="feature-card-header">
              <div className="feature-card-icon" style={{ background: 'rgba(122,0,31,0.14)', color: '#7a001f' }}>
                {tool.icon}
              </div>
              <div>
                <div className="feature-card-title">{tool.title}</div>
                <div className="feature-card-subtitle">Lecture workflow</div>
              </div>
            </div>
            <div className="feature-card-body">
              <div className="feature-item">
                <div className="feature-item-icon" style={{ background: 'rgba(122,0,31,0.14)', color: '#7a001f' }}>
                  <IoBookOutline />
                </div>
                {tool.text}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
