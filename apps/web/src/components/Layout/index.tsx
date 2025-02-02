import {
  Outlet,
  useNavigate,
  useLocation,
  useSearchParams,
} from 'react-router-dom';
import {
  FileTextOutlined,
  HistoryOutlined,
  SearchOutlined,
  TagOutlined,
  SettingOutlined,
  LogoutOutlined,
  TeamOutlined,
  UserOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { useNoteStore } from '@/stores/noteStore';
import ContributionHeatmap from '@/components/ContributionHeatmap';
import { Avatar, Dropdown } from 'antd';
import dayjs from 'dayjs';
import './style.css';
import { useEffect } from 'react';
import { ItemType } from 'antd/es/menu/interface';

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const { notes, tags, selectedTag, setSelectedTag, fetchTags } =
    useNoteStore();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // 从 URL 同步标签状态到 store
  useEffect(() => {
    const tagFromUrl = searchParams.get('tag');
    setSelectedTag(tagFromUrl);
  }, [searchParams, setSelectedTag]);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  // 计算注册天数
  const getDaysFromRegister = () => {
    if (!user?.createdAt) return 0;
    return dayjs().diff(dayjs(user.createdAt), 'day');
  };

  const userMenuItems = [
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      onClick: () => navigate('/settings'),
    },
    user?.role === 'admin' && {
      key: 'admin',
      icon: <TeamOutlined />,
      label: '管理',
      onClick: () => navigate('/admin'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: handleLogout,
    },
  ].filter(Boolean);

  const navItems = [
    {
      key: '/notes',
      icon: <FileTextOutlined />,
      label: '全部笔记',
    },
    {
      key: '/daily',
      icon: <HistoryOutlined />,
      label: '每日回顾',
    },
    {
      key: '/search',
      icon: <SearchOutlined />,
      label: '找一找',
    },
  ];

  const handleTagClick = (tagName: string | null) => {
    if (tagName) {
      setSearchParams({ tag: tagName });
    } else {
      searchParams.delete('tag');
      setSearchParams(searchParams);
    }
    // 只有当前不在 notes 路由时才进行导航
    if (location.pathname !== '/notes') {
      navigate('/notes');
    }
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-content">
          <div className="profile-section">
            <Dropdown
              menu={{ items: userMenuItems as ItemType[] }}
              placement="bottomRight"
              trigger={['click', 'hover']}
            >
              <div className="user-dropdown">
                <div className="user-info">
                  <span className="avatar">
                    <Avatar size={32} src={user?.avatar} alt="avatar" />
                  </span>
                  <span className="username">
                    {user?.nickname || user?.name || user?.email}
                  </span>
                </div>
                <DownOutlined className="dropdown-icon" />
              </div>
            </Dropdown>
            <div className="user-stats">
              <div className="stat-item">
                <div className="stat-value">{notes.length}</div>
                <div className="stat-label">笔记</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{tags.length}</div>
                <div className="stat-label">标签</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{getDaysFromRegister()}</div>
                <div className="stat-label">天</div>
              </div>
            </div>
          </div>
          <div className="heatmap-container">
            <ContributionHeatmap notes={notes} />
          </div>
          <nav className="nav-menu">
            {navItems.map((item) => {
              // 当有标签选中时，notes 路由不显示激活状态
              const isActive =
                location.pathname === item.key &&
                (item.key !== '/notes' || !searchParams.get('tag'));

              return (
                <div
                  key={item.key}
                  className={`nav-item ${isActive ? 'active' : ''} ${
                    item.danger ? 'danger' : ''
                  }`}
                  onClick={() => {
                    if (item.key === 'logout') {
                      handleLogout();
                    } else if (item.key === '/notes') {
                      // 点击全部笔记时只清空标签选择
                      handleTagClick(null);
                    } else {
                      navigate(item.key);
                    }
                  }}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </div>
              );
            })}
          </nav>
          <div className="tags-section">
            <div className="tags-header">
              <TagOutlined /> 标签
            </div>
            <div className="tags-list">
              {tags.map((tag) => (
                <span
                  key={tag.name}
                  className={`tag-item ${searchParams.get('tag') === tag.name ? 'active' : ''}`}
                  onClick={() => handleTagClick(tag.name)}
                >
                  {tag.name} ({tag.count})
                </span>
              ))}
            </div>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <div className="content-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
