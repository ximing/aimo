import { Card, Form, Input, Button, Divider, Switch, Select, message } from 'antd'
import { useMutation, useQuery } from '@tanstack/react-query'
import { updateProfile, getUserSettings, updateUserSettings } from '@/api/user'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useI18nStore } from '@/stores/i18nStore'
import { useI18n } from '@/components/I18nProvider'

export default function Settings() {
  const user = useAuthStore(state => state.user)
  const [profileForm] = Form.useForm()
  const [settingsForm] = Form.useForm()

  const theme = useThemeStore(state => state.theme)
  const setTheme = useThemeStore(state => state.setTheme)
  const language = useI18nStore(state => state.language)
  const setLanguage = useI18nStore(state => state.setLanguage)

  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['userSettings'],
    queryFn: getUserSettings
  })

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      message.success('Profile updated successfully')
    }
  })

  const updateSettingsMutation = useMutation({
    mutationFn: updateUserSettings,
    onSuccess: () => {
      message.success('Settings updated successfully')
    }
  })

  const { t } = useI18n()

  return (
    <div>
      <Card title={t('settings.profile')} loading={!user}>
        <Form
          form={profileForm}
          layout="vertical"
          initialValues={user || {}}
          onFinish={updateProfileMutation.mutate}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please input your name!' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="password"
            label="New Password"
            rules={[{ min: 6, message: 'Password must be at least 6 characters!' }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={updateProfileMutation.isPending}
            >
              Update Profile
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Divider />

      <Card title={t('settings.appearance')}>
        <Form layout="vertical">
          <Form.Item label={t('settings.theme')}>
            <Select
              value={theme}
              onChange={setTheme}
            >
              <Select.Option value="light">{t('settings.themeLight')}</Select.Option>
              <Select.Option value="dark">{t('settings.themeDark')}</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Language">
            <Select
              value={language}
              onChange={setLanguage}
            >
              <Select.Option value="en">English</Select.Option>
              <Select.Option value="zh">中文</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Card>

      <Divider />

      <Card title="Preferences" loading={isLoadingSettings}>
        <Form
          form={settingsForm}
          layout="vertical"
          initialValues={settings}
          onFinish={updateSettingsMutation.mutate}
        >
          <Form.Item
            name="emailNotifications"
            label="Email Notifications"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={updateSettingsMutation.isPending}
            >
              Save Preferences
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
