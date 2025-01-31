import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  FileTextOutlined,
  HistoryOutlined,
  SearchOutlined,
  TagOutlined,
  SettingOutlined,
  LogoutOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "@/stores/authStore";
import { useNoteStore } from "@/stores/noteStore";
import ContributionHeatmap from "@/components/ContributionHeatmap";
import { Dropdown } from "antd";
import dayjs from "dayjs";
import "./style.css";
import { useEffect } from "react";

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const { notes, tags, selectedTag, setSelectedTag, fetchTags } =
    useNoteStore();

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  // 计算注册天数
  const getDaysFromRegister = () => {
    if (!user?.createdAt) return 0;
    return dayjs().diff(dayjs(user.createdAt), "day");
  };

  const userMenuItems = [
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: "设置",
      onClick: () => navigate("/settings"),
    },
    user?.role === "admin" && {
      key: "admin",
      icon: <TeamOutlined />,
      label: "管理",
      onClick: () => navigate("/admin"),
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      danger: true,
      onClick: handleLogout,
    },
  ].filter(Boolean);

  const navItems = [
    {
      key: "/notes",
      icon: <FileTextOutlined />,
      label: "全部笔记",
    },
    {
      key: "/daily",
      icon: <HistoryOutlined />,
      label: "每日回顾",
    },
    {
      key: "/search",
      icon: <SearchOutlined />,
      label: "找一找",
    },
  ];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-content">
          <div className="profile-section">
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={["click"]}
            >
              <div className="user-info">
                <span className="avatar">
                  <UserOutlined />
                </span>
                <span className="username">{user?.name || user?.email}</span>
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
              if (item.type === "divider") {
                return <div key="divider" className="nav-divider" />;
              }
              const isActive = location.pathname === item.key;
              return (
                <div
                  key={item.key}
                  className={`nav-item ${isActive ? "active" : ""} ${
                    item.danger ? "danger" : ""
                  }`}
                  onClick={() => {
                    if (item.key === "logout") {
                      handleLogout();
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
                  className={`tag-item ${selectedTag === tag.name ? "active" : ""}`}
                  onClick={() => {
                    setSelectedTag(tag.name);
                    navigate("/notes");
                  }}
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
