import { useState, useMemo, useCallback } from 'react';

export interface HeatmapData {
  date: string;
  count: number;
}

interface CalendarHeatmapProps {
  data: HeatmapData[];
  onDateSelect?: (date: string, count: number) => void;
  selectedDate?: string | null;
  className?: string;
}

// Color levels for the heatmap (matching GitHub style)
const COLOR_LEVELS = {
  0: 'bg-gray-100 dark:bg-dark-800',
  1: 'bg-primary-200 dark:bg-primary-900/30',
  2: 'bg-primary-400 dark:bg-primary-700',
  3: 'bg-primary-600 dark:bg-primary-500',
  4: 'bg-primary-800 dark:bg-primary-400',
} as const;

// Get color level based on count
const getColorLevel = (count: number): number => {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
};

// Format date for display
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Get month name
const getMonthName = (date: Date): string => {
  return date.toLocaleDateString('zh-CN', { month: 'short' });
};

export const CalendarHeatmap = ({
  data,
  onDateSelect,
  selectedDate,
  className = '',
}: CalendarHeatmapProps) => {
  const [hoveredCell, setHoveredCell] = useState<{
    date: string;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  // Create a map of date -> count for quick lookup
  const dataMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((item) => {
      map.set(item.date, item.count);
    });
    return map;
  }, [data]);

  // Generate the grid data (last 91 days = 13 weeks)
  const gridData = useMemo(() => {
    const today = new Date();
    const days: Array<{
      date: string;
      count: number;
      level: number;
      dayOfWeek: number;
      weekIndex: number;
    }> = [];

    // Generate 91 days (13 weeks) ending with today
    for (let i = 90; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = dataMap.get(dateStr) || 0;
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const weekIndex = Math.floor((90 - i) / 7);

      days.push({
        date: dateStr,
        count,
        level: getColorLevel(count),
        dayOfWeek,
        weekIndex,
      });
    }

    return days;
  }, [dataMap]);

  // Group by week for rendering
  const weeks = useMemo(() => {
    const weekMap = new Map<number, typeof gridData>();
    gridData.forEach((day) => {
      if (!weekMap.has(day.weekIndex)) {
        weekMap.set(day.weekIndex, []);
      }
      weekMap.get(day.weekIndex)!.push(day);
    });
    return weekMap;
  }, [gridData]);

  // Get month labels
  const monthLabels = useMemo(() => {
    const labels: Array<{ month: string; weekIndex: number }> = [];
    let currentMonth = -1;

    gridData.forEach((day) => {
      const date = new Date(day.date);
      const month = date.getMonth();
      const weekIndex = day.weekIndex;

      if (month !== currentMonth && day.dayOfWeek === 0) {
        labels.push({
          month: getMonthName(date),
          weekIndex,
        });
        currentMonth = month;
      }
    });

    return labels;
  }, [gridData]);

  const handleCellClick = useCallback(
    (date: string, count: number) => {
      onDateSelect?.(date, count);
    },
    [onDateSelect]
  );

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent, date: string, count: number) => {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setHoveredCell({
        date,
        count,
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  // Day labels (Mon, Wed, Fri)
  const dayLabels = ['一', '三', '五'];

  return (
    <div className={`select-none ${className}`}>
      {/* Month labels */}
      <div className="flex mb-1">
        <div className="w-6" /> {/* Spacer for day labels */}
        <div className="flex-1 flex relative h-4">
          {monthLabels.map((label, index) => (
            <span
              key={index}
              className="absolute text-[10px] text-gray-500 dark:text-gray-400"
              style={{
                left: `${(label.weekIndex / 13) * 100}%`,
              }}
            >
              {label.month}
            </span>
          ))}
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="flex">
        {/* Day labels column */}
        <div className="flex flex-col justify-between w-6 pr-1 py-0">
          {dayLabels.map((label, index) => (
            <span
              key={index}
              className="text-[10px] text-gray-500 dark:text-gray-400 h-3 leading-3"
              style={{
                marginTop: index === 0 ? '0' : '6px',
              }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div className="flex gap-[2px]">
          {Array.from(weeks.entries()).map(([weekIndex, weekDays]) => (
            <div key={weekIndex} className="flex flex-col gap-[2px]">
              {Array.from({ length: 7 }).map((_, dayIndex) => {
                const day = weekDays.find((d) => d.dayOfWeek === dayIndex);
                if (!day) {
                  // Empty cell for days that don't exist in this week
                  return <div key={dayIndex} className="w-3 h-3" />;
                }

                const isSelected = selectedDate === day.date;

                return (
                  <button
                    key={dayIndex}
                    onClick={() => handleCellClick(day.date, day.count)}
                    onMouseEnter={(e) => handleMouseEnter(e, day.date, day.count)}
                    onMouseLeave={handleMouseLeave}
                    className={`
                      w-3 h-3 rounded-sm
                      ${COLOR_LEVELS[day.level as keyof typeof COLOR_LEVELS]}
                      hover:ring-2 hover:ring-gray-400 dark:hover:ring-gray-500
                      transition-all duration-150
                      focus:outline-none focus:ring-2 focus:ring-primary-500
                      ${isSelected ? 'ring-2 ring-offset-1 ring-primary-500 dark:ring-offset-dark-900' : ''}
                    `}
                    aria-label={`${formatDate(day.date)}: ${day.count} 条memo${isSelected ? ' (已选中)' : ''}`}
                    aria-pressed={isSelected}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-2">
        <span className="text-[10px] text-gray-500 dark:text-gray-400">少</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`w-3 h-3 rounded-sm ${COLOR_LEVELS[level as keyof typeof COLOR_LEVELS]}`}
          />
        ))}
        <span className="text-[10px] text-gray-500 dark:text-gray-400">多</span>
      </div>

      {/* Tooltip */}
      {hoveredCell && (
        <div
          className="fixed z-50 px-2 py-1 bg-gray-900 dark:bg-dark-800 text-white text-xs rounded shadow-lg pointer-events-none whitespace-nowrap"
          style={{
            left: hoveredCell.x,
            top: hoveredCell.y - 32,
            transform: 'translateX(-50%)',
          }}
        >
          {formatDate(hoveredCell.date)}
          <span className="mx-1">·</span>
          {hoveredCell.count} 条memo
        </div>
      )}
    </div>
  );
};
