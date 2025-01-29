import { Form, Input, Select, Switch, Button, Space } from 'antd'
import type { Note, CreateNoteInput, UpdateNoteInput } from '@/api/types'

interface NoteEditorProps {
  initialValues?: Note
  onSubmit: (values: CreateNoteInput | UpdateNoteInput) => void
  onCancel: () => void
  loading?: boolean
}

export default function NoteEditor({
  initialValues,
  onSubmit,
  onCancel,
  loading
}: NoteEditorProps) {
  const [form] = Form.useForm()

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={onSubmit}
    >
      <Form.Item
        name="content"
        label="Content"
        rules={[{ required: true, message: 'Please input note content!' }]}
      >
        <Input.TextArea rows={6} />
      </Form.Item>

      <Form.Item name="tags" label="Tags">
        <Select
          mode="tags"
          style={{ width: '100%' }}
          placeholder="Add tags"
          open={false}
        />
      </Form.Item>

      <Form.Item name="isPublic" label="Public" valuePropName="checked">
        <Switch />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            {initialValues ? 'Update' : 'Create'}
          </Button>
          <Button onClick={onCancel}>Cancel</Button>
        </Space>
      </Form.Item>
    </Form>
  )
}
