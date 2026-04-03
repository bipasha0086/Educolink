import { motion } from 'framer-motion';
import {
  IoPersonCircleOutline,
  IoSchoolOutline,
  IoMailOutline,
  IoCalendarOutline
} from 'react-icons/io5';

const stats = [
  { label: 'Study Streak', value: '18 days' },
  { label: 'Completed Notes', value: '42' },
  { label: 'Focus Hours', value: '96h' },
];

export default function Profile() {
  return (
    <div className="module-page">
      <motion.div
        className="module-hero"
        style={{ background: 'linear-gradient(135deg, #123b6e, #2b67b2, #78a9ff)' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="module-hero-content">
          <h1>Profile</h1>
          <p>Your account details and learning snapshot.</p>
        </div>
      </motion.div>

      <motion.div className="clay-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="feature-card-header" style={{ marginBottom: '1rem' }}>
          <div className="feature-card-icon" style={{ background: 'rgba(18,59,110,0.14)', color: '#123b6e' }}>
            <IoPersonCircleOutline />
          </div>
          <div>
            <div className="feature-card-title">Shubham S.</div>
            <div className="feature-card-subtitle">B.Tech Student</div>
          </div>
        </div>

        <div className="feature-card-body">
          <div className="feature-item"><div className="feature-item-icon" style={{ background: 'rgba(18,59,110,0.14)', color: '#123b6e' }}><IoSchoolOutline /></div>Department: Computer Science</div>
          <div className="feature-item"><div className="feature-item-icon" style={{ background: 'rgba(18,59,110,0.14)', color: '#123b6e' }}><IoMailOutline /></div>Email: student@educolink.app</div>
          <div className="feature-item"><div className="feature-item-icon" style={{ background: 'rgba(18,59,110,0.14)', color: '#123b6e' }}><IoCalendarOutline /></div>Member since: Jan 2026</div>
        </div>

        <div className="feature-grid" style={{ marginTop: '1rem' }}>
          {stats.map((s) => (
            <div key={s.label} className="feature-card">
              <div className="feature-card-title">{s.label}</div>
              <div className="feature-card-subtitle" style={{ fontSize: '1.1rem', color: 'var(--on-surface)' }}>{s.value}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
