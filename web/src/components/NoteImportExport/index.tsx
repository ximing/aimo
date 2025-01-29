import { useState } from 'react'
import { Modal, Upload, Form, Select, Switch, Button, message } from 'antd'
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons'
import { useMutation } from '@tanstack/react-query'
import { importNotes, exportNotes } from '@/api/notes'
import type { ExportOptions } from '@/api/types'

interface NoteImportExportProps {
  availableTags: string[]
}

export default function NoteImportExport({ availableTags }: NoteImportExportProps) {
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportForm] = Form.useForm()

  const importMutation = useMutation({
    mutationFn: (file: File) => importNotes(file),
    onSuccess: (data) => {
      message.success(`Successfully imported ${data.success} notes`)
      setImportModalOpen(false)
      if (data.failed > 0) {
        Modal.warning({
          title: 'Import Warning',
          content: (
            <div>
              <p>{data.failed} notes failed to import.</p>
              {data.errors && (
                <ul>
                  {data.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          )
        })
      }
    }
  })

  const handleExport = async (values: ExportOptions) => {
    try {
      const response = await exportNotes(values)
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `notes-export.${values.format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      setExportModalOpen(false)
      message.success('Export completed')
    } catch (error) {
      message.error('Export failed')
    }
  }

  return (
    <>
      <Button.Group>
        <Button
          icon={<UploadOutlined />}
          onClick={() => setImportModalOpen(true)}
        >
          Import
        </Button>
        <Button
          icon={<DownloadOutlined />}
          onClick={() => setExportModalOpen(true)}
        >
          Export
        </Button>
      </Button.Group>

      <Modal
        title="Import Notes"
        open={importModalOpen}
        onCancel={() => setImportModalOpen(false)}
        footer={null}
      >
        <Upload.Dragger
          name="file"
          accept=".json,.csv,.xlsx"
          customRequest={({ file }) => {
            if (file instanceof File) {
              importMutation.mutate(file)
            }
          }}
          showUploadList={false}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text">
            Click or drag file to this area to upload
          </p>
          <p className="ant-upload-hint">
            Support for JSON, CSV, and Excel files
          </p>
        </Upload.Dragger>
      </Modal>

      <Modal
        title="Export Notes"
        open={exportModalOpen}
        onCancel={() => setExportModalOpen(false)}
        footer={null}
      >
        <Form
          form={exportForm}
          layout="vertical"
          onFinish={handleExport}
        >
          <Form.Item
            name="format"
            label="Format"
            initialValue="json"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="json">JSON</Select.Option>
              <Select.Option value="csv">CSV</Select.Option>
              <Select.Option value="xlsx">Excel</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="includePrivate"
            label="Include Private Notes"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="tags"
            label="Filter by Tags"
          >
            <Select
              mode="multiple"
              placeholder="Select tags to filter"
              allowClear
            >
              {availableTags.map(tag => (
                <Select.Option key={tag} value={tag}>
                  {tag}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Export
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}