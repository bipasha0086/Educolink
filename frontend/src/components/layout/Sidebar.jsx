import { NavLink } from 'react-router-dom';
import { 
  IoHomeOutline, IoHome,
  IoRocketOutline, IoRocket,
  IoDocumentTextOutline, IoDocumentText,
  IoPeopleOutline, IoPeople,
  IoConstructOutline, IoConstruct,
  IoColorPaletteOutline, IoColorPalette,
  IoGlobeOutline, IoGlobe,
  IoCafeOutline, IoCafe,
  IoPlayCircleOutline, IoPlayCircle,
  IoPersonOutline, IoPerson,
  IoSettingsOutline, IoSettings
} from 'react-icons/io5';

const navItems = [
  { path: '/', label: 'Home', icon: IoHomeOutline, activeIcon: IoHome },
  { path: '/educoassist', label: 'EducoAssist', icon: IoRocketOutline, activeIcon: IoRocket },
  { path: '/notes', label: 'Notes Hub', icon: IoDocumentTextOutline, activeIcon: IoDocumentText },
  { path: '/study-room', label: 'Study Room', icon: IoPeopleOutline, activeIcon: IoPeople },
  { path: '/tools', label: 'Productivity', icon: IoConstructOutline, activeIcon: IoConstruct },
  { path: '/visual-labs', label: 'Visual Labs', icon: IoColorPaletteOutline, activeIcon: IoColorPalette },
  { path: '/workspace', label: 'Workspace', icon: IoGlobeOutline, activeIcon: IoGlobe },
  { path: '/break', label: 'Break Zone', icon: IoCafeOutline, activeIcon: IoCafe },
  { path: '/lectures', label: 'Lecture Zone', icon: IoPlayCircleOutline, activeIcon: IoPlayCircle },
];

const bottomItems = [
  { path: '/profile', label: 'Profile', icon: IoPersonOutline, activeIcon: IoPerson },
  { path: '/settings', label: 'Settings', icon: IoSettingsOutline, activeIcon: IoSettings },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/Educolink%20logo.png" alt="EducoLink" className="sidebar-logo-img" />
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Modules</div>
        <nav className="sidebar-nav">
          {navItems.map(({ path, label, icon: Icon, activeIcon: ActiveIcon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              {({ isActive }) => (
                <>
                  <span className="sidebar-link-icon">
                    {isActive ? <ActiveIcon /> : <Icon />}
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="sidebar-section" style={{ marginTop: 'auto' }}>
        <div className="sidebar-section-title">Account</div>
        <nav className="sidebar-nav">
          {bottomItems.map(({ path, label, icon: Icon, activeIcon: ActiveIcon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              {({ isActive }) => (
                <>
                  <span className="sidebar-link-icon">
                    {isActive ? <ActiveIcon /> : <Icon />}
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
