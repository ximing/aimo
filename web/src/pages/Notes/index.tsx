import { useState } from 'react'
import { Card, Button, List, Tag, Modal, Input, Space, message } from 'antd'
import { PlusOutlined, SearchOutlined, ShareAltOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getNotes, createNote, updateNote, deleteNote, searchNotes, shareNote } from '@/api/notes'
import NoteEditor from '@/components/NoteEditor'
import type { Note, CreateNoteInput, UpdateNoteInput } from '@/api/types'
import NoteImportExport from '@/components/NoteImportExport'

export default function Notes() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const queryClient = useQueryClient()

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes', searchQuery],
    queryFn: () => searchQuery ? searchNotes(searchQuery) : getNotes()
  })

  const createMutation = useMutation({
    mutationFn: createNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      setIsModalOpen(false)
      message.success('Note created successfully')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateNoteInput }) =>
      updateNote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      setEditingNote(null)
      message.success('Note updated successfully')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      message.success('Note deleted successfully')
    }
  })

  const shareMutation = useMutation({
    mutationFn: shareNote,
    onSuccess: (data) => {
      Modal.success({
        title: 'Note Shared',
        content: (
          <div>
            <p>Share this link with others:</p>
            <Input.TextArea
              value={data.shareUrl}
              autoSize
              readOnly
              onClick={(e) => e.currentTarget.select()}
            />
          </div>
        )
      })
    }
  })

  const handleCreate = (values: CreateNoteInput) => {
    createMutation.mutate(values)
  }

  const handleUpdate = (values: UpdateNoteInput) => {
    if (editingNote) {
      updateMutation.mutate({ id: editingNote.id, data: values })
    }
  }

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: 'Delete Note',
      content: 'Are you sure you want to delete this note?',
      onOk: () => deleteMutation.mutate(id)
    })
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search notes..."
          prefix={<SearchOutlined />}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 200 }}
        />
        <NoteImportExport
          availableTags={Array.from(new Set(notes.flatMap(note => note.tags)))}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalOpen(true)}
        >
          New Note
        </Button>
      </Space>

      <List
        grid={{ gutter: 16, column: 3 }}
        dataSource={notes}
        loading={isLoading}
        renderItem={(note) => (
          <List.Item>
            <Card
              title={note.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
              extra={
                <Space>
                  {note.isPublic && (
                    <Button
                      size="small"
                      icon={<ShareAltOutlined />}
                      onClick={() => shareMutation.mutate(note.id)}
                    >
                      Share
                    </Button>
                  )}
                  <Button size="small" onClick={() => setEditingNote(note)}>
                    Edit
                  </Button>
                  <Button
                    size="small"
                    danger
                    onClick={() => handleDelete(note.id)}
                  >
                    Delete
                  </Button>
                </Space>
              }
            >
              <div style={{ whiteSpace: 'pre-wrap' }}>{note.content}</div>
            </Card>
          </List.Item>
        )}
      />

      <Modal
        title="New Note"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <NoteEditor
          onSubmit={handleCreate}
          onCancel={() => setIsModalOpen(false)}
          loading={createMutation.isPending}
        />
      </Modal>

      <Modal
        title="Edit Note"
        open={!!editingNote}
        onCancel={() => setEditingNote(null)}
        footer={null}
      >
        <NoteEditor
          initialValues={editingNote || undefined}
          onSubmit={handleUpdate}
          onCancel={() => setEditingNote(null)}
          loading={updateMutation.isPending}
        />
      </Modal>
    </div>
  )
}
