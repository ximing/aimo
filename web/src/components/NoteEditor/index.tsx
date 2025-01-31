import { Form, Input, Select, Switch, Button } from 'antd'
import type { Note, CreateNoteInput, UpdateNoteInput } from '@/api/types'

interface NoteEditorProps {
  note?: Note
  onSubmit: (values: CreateNoteInput | UpdateNoteInput) => void
  onCancel: () => void
  loading?: boolean
}

export default function NoteEditor({
  note,
  onSubmit,
  onCancel,
  loading
}: NoteEditorProps) {
  return (
    <Form
      layout="vertical"
      initialValues={note}
      onFinish={onSubmit}
    >
      <Form.Item
        name="content"
        label="Content"
        rules={[{ required: true }]}
      >
        <Input.TextArea rows={6} />
      </Form.Item>

      <Form.Item
        name="tags"
        label="Tags"
      >
        <Select mode="tags" />
      </Form.Item>

      <Form.Item
        name="isPublic"
        label="Public"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          {note ? 'Update' : 'Create'}
        </Button>
        <Button onClick={onCancel} style={{ marginLeft: 8 }}>
          Cancel
        </Button>
      </Form.Item>
    </Form>
  )
}
