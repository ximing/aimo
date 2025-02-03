import { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Divider,
  Select,
  message,
  Upload,
  Avatar,
} from 'antd';
import { useMutation } from '@tanstack/react-query';
import { updateProfile } from '@/api/user';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { useI18nStore } from '@/stores/i18nStore';
import { useI18n } from '@/components/I18nProvider';
import {
  InboxOutlined,
  LoadingOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { importNotes } from '@/api/system';
import type { UploadChangeParam } from 'antd/es/upload';
import type { RcFile, UploadFile } from 'antd/es/upload/interface';
import './style.css';

const getBase64 = (img: RcFile, callback: (url: string) => void) => {
  const reader = new FileReader();
  reader.addEventListener('load', () => callback(reader.result as string));
  reader.readAsDataURL(img);
};

const normFile = (e: any) => {
  console.log('---->', e);
  if (Array.isArray(e)) {
    return e;
  }
  return e?.fileList;
};

export default function Settings() {
  const user = useAuthStore((state) => state.user);
  const [profileForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>();

  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const language = useI18nStore((state) => state.language);
  const setLanguage = useI18nStore((state) => state.setLanguage);
  const { t } = useI18n();

  const updateProfileMutation = useMutation({
    mutationFn: async (values: any) => {
      const formData = new FormData();
      if (values.avatar?.[0]?.originFileObj) {
        formData.append('avatar', values.avatar[0].originFileObj);
      }
      if (values.name) {
        formData.append('name', values.name);
      }
      if (values.nickname) {
        formData.append('nickname', values.nickname);
      }
      if (values.password) {
        formData.append('password', values.password);
      }
      return updateProfile(formData);
    },
    onSuccess: (data) => {
      message.success('Profile updated successfully');
      useAuthStore.getState().updateUser(data);
      setLoading(false);
      setImageUrl(undefined);
      profileForm.resetFields(['avatar']);
    },
    onError: (error) => {
      message.error('Failed to update profile');
      setLoading(false);
      setImageUrl(undefined);
      profileForm.resetFields(['avatar']);
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return importNotes(formData);
    },
    onSuccess: (data) => {
      message.success(`Successfully imported ${data.imported} notes`);
    },
    onError: (error) => {
      message.error('Failed to import notes');
    },
  });

  const handleChange = (info: UploadChangeParam<UploadFile>) => {
    if (info.file.status === 'uploading') {
      setLoading(true);
      return;
    }

    if (info.file.originFileObj) {
      try {
        getBase64(info.file.originFileObj as RcFile, (url) => {
          setLoading(false);
          setImageUrl(url);
        });
      } catch (error) {
        setLoading(false);
        message.error('Failed to read file');
      }
    }
  };

  const beforeUpload = (file: RcFile) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('You can only upload image files!');
      return false;
    }
    const isLt20M = file.size / 1024 / 1024 < 20;
    if (!isLt20M) {
      message.error('Image must smaller than 20MB!');
      return false;
    }
    return false;
  };

  const uploadButton = (
    <button style={{ border: 0, background: 'none' }} type="button">
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>Upload</div>
    </button>
  );

  return (
    <div className="settings-container">
      <Card title={t('settings.profile')} loading={!user}>
        <Form
          form={profileForm}
          layout="horizontal"
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 14 }}
          style={{ maxWidth: 600 }}
          initialValues={{
            ...user,
            password: undefined,
            avatar: user?.avatar ? [user?.avatar] : [],
          }}
          onFinish={updateProfileMutation.mutate}
        >
          <Form.Item
            label="Avatar"
            name="avatar"
            valuePropName="fileList"
            getValueFromEvent={normFile}
          >
            <Upload
              name="avatar"
              listType="picture-card"
              className="avatar-uploader"
              showUploadList={false}
              maxCount={1}
              beforeUpload={beforeUpload}
              onChange={handleChange}
              customRequest={({ onSuccess }) => {
                setTimeout(() => {
                  onSuccess?.('ok');
                }, 0);
              }}
            >
              {imageUrl ? (
                <Avatar size={100} src={imageUrl} alt="avatar" />
              ) : user?.avatar ? (
                <Avatar size={100} src={user.avatar} alt="avatar" />
              ) : (
                uploadButton
              )}
            </Upload>
          </Form.Item>

          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Please input your name!' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Nickname"
            name="nickname"
            rules={[{ required: true, message: 'Please input your nickname!' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="New Password"
            name="password"
            rules={[
              { min: 6, message: 'Password must be at least 6 characters!' },
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item wrapperCol={{ offset: 4, span: 14 }}>
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
        <Form
          layout="horizontal"
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 14 }}
          style={{ maxWidth: 600 }}
        >
          <Form.Item label={t('settings.theme')}>
            <Select value={theme} onChange={setTheme}>
              <Select.Option value="light">
                {t('settings.themeLight')}
              </Select.Option>
              <Select.Option value="dark">
                {t('settings.themeDark')}
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Language">
            <Select value={language} onChange={setLanguage}>
              <Select.Option value="en">English</Select.Option>
              <Select.Option value="zh">中文</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Card>

      <Divider />

      <Card title="Data Management">
        <Upload.Dragger
          name="file"
          accept=".json"
          showUploadList={false}
          customRequest={({ file }) => {
            if (file instanceof File) {
              importMutation.mutate(file);
            }
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click or drag file to import notes</p>
          <p className="ant-upload-hint">Support for JSON files only</p>
        </Upload.Dragger>
      </Card>
    </div>
  );
}
