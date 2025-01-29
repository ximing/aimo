import { Layout as AntLayout, Menu } from 'antd'
import { Outlet, useNavigate } from 'react-router-dom'
import {
  FileTextOutlined,
  SettingOutlined,
  LogoutOutlined,
  TeamOutlined,
  TagsOutlined
} from '@ant-design/icons'
import { useAuthStore } from '@/stores/authStore'

const { Header, Sider, Content } = AntLayout

export default function Layout() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore(state => state.clearAuth)
  const user = useAuthStore(state => state.user)

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <AntLayout style={{ height: '100vh' }}>
      <Header style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ color: '#fff', margin: 0 }}>Aimo</h1>
        <span style={{ color: '#fff' }}>{user?.name || user?.email}</span>
      </Header>
      <AntLayout>
        <Sider width={200}>
          <Menu
            mode="inline"
            style={{ height: '100%', borderRight: 0 }}
            items={[
              {
                key: 'notes',
                icon: <FileTextOutlined />,
                label: 'Notes',
                onClick: () => navigate('/notes')
              },
              {
                key: 'tags',
                icon: <TagsOutlined />,
                label: 'Tags',
                onClick: () => navigate('/tags')
              },
              {
                key: 'settings',
                icon: <SettingOutlined />,
                label: 'Settings',
                onClick: () => navigate('/settings')
              },
              user?.role === 'admin' && {
                key: 'admin',
                icon: <TeamOutlined />,
                label: 'Admin',
                onClick: () => navigate('/admin')
              },
              {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: 'Logout',
                onClick: handleLogout
              }
            ].filter(Boolean)}
          />
        </Sider>
        <Content style={{ padding: '24px', minHeight: 280 }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}