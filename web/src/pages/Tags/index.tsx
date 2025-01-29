import { useState } from 'react'
import { Card, Table, Button, Modal, Input, Space, Tag, message } from 'antd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTags, deleteTag, mergeTag, getTagStats } from '@/api/tags'
import type { TagStats } from '@/api/types'

export default function Tags() {
  const [mergingTag, setMergingTag] = useState<TagStats | null>(null)
  const [newTagName, setNewTagName] = useState('')
  const queryClient = useQueryClient()

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: getTagStats
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      message.success('Tag deleted successfully')
    }
  })

  const mergeMutation = useMutation({
    mutationFn: ({ oldName, newName }: { oldName: string; newName: string }) =>
      mergeTag(oldName, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      setMergingTag(null)
      setNewTagName('')
      message.success('Tags merged successfully')
    }
  })

  const handleDelete = (name: string) => {
    Modal.confirm({
      title: 'Delete Tag',
      content: 'Are you sure you want to delete this tag? This will remove the tag from all notes.',
      onOk: () => deleteMutation.mutate(name)
    })
  }

  const handleMerge = () => {
    if (mergingTag && newTagName) {
      mergeMutation.mutate({
        oldName: mergingTag.name,
        newName: newTagName
      })
    }
  }

  const columns = [
    {
      title: 'Tag',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Tag>{name}</Tag>
    },
    {
      title: 'Usage Count',
      dataIndex: 'count',
      key: 'count',
      sorter: (a: TagStats, b: TagStats) => a.count - b.count
    },
    {
      title: 'Last Used',
      dataIndex: 'lastUsed',
      key: 'lastUsed',
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: TagStats) => (
        <Space>
          <Button size="small" onClick={() => setMergingTag(record)}>
            Merge
          </Button>
          <Button
            size="small"
            danger
            onClick={() => handleDelete(record.name)}
          >
            Delete
          </Button>
        </Space>
      )
    }
  ]

  return (
    <div>
      <Card title="Tag Management">
        <Table
          columns={columns}
          dataSource={tags}
          loading={isLoading}
          rowKey="name"
        />
      </Card>

      <Modal
        title="Merge Tag"
        open={!!mergingTag}
        onCancel={() => {
          setMergingTag(null)
          setNewTagName('')
        }}
        onOk={handleMerge}
        okButtonProps={{
          disabled: !newTagName,
          loading: mergeMutation.isPending
        }}
      >
        <p>Merge tag "{mergingTag?.name}" into:</p>
        <Input
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="Enter new tag name"
        />
      </Modal>
    </div>
  )
}