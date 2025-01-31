import { useMemo } from 'react';
import { Card, Badge } from 'antd';
import dayjs from 'dayjs';
import type { Note } from '@/api/types';

interface NoteCalendarProps {
  notes: Note[];
  onSelectDate: (date: Date) => void;
}

export default function NoteCalendar({ notes, onSelectDate }: NoteCalendarProps) {
  const calendar = useMemo(() => {
    const now = dayjs();
    const startOfMonth = now.startOf('month');
    const endOfMonth = now.endOf('month');
    const days = [];
    
    let date = startOfMonth;
    while (date.isBefore(endOfMonth)) {
      days.push({
        date: date.toDate(),
        notes: notes.filter(note => 
          dayjs(note.createdAt).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
        )
      });
      date = date.add(1, 'day');
    }
    
    return days;
  }, [notes]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
      {calendar.map(({ date, notes: dayNotes }) => (
        <Card 
          key={date.toISOString()}
          size="small"
          hoverable
          onClick={() => onSelectDate(date)}
          style={{ 
            cursor: 'pointer',
            background: dayNotes.length ? '#f6ffed' : undefined 
          }}
        >
          <div style={{ textAlign: 'center' }}>
            {dayjs(date).format('D')}
            {dayNotes.length > 0 && (
              <Badge 
                count={dayNotes.length} 
                style={{ backgroundColor: '#52c41a' }} 
              />
            )}
          </div>
        </Card>
      ))}
    </div>
  );
} 