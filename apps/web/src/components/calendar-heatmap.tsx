import { useState, useMemo, useCallback } from 'react';

export interface HeatmapData {
  date: string;
  count: number;
}

interface CalendarHeatmapProps {
  data: HeatmapData[];
  selectedDate?: string | null;
  onDateSelect?: (date: string, count: number) => void;
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

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Format date for display
const formatDate = (dateStr: string): string => {
  const date = parseDateKey(dateStr);
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
  selectedDate,
  onDateSelect,
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

  // Generate the grid data (last 3 months, aligned to Monday-Sunday weeks)
  const gridData = useMemo(() => {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    const endDate = new Date(today);
    const days: Array<{
      date: string;
      count: number;
      level: number;
      dayOfWeek: number;
      weekIndex: number;
    }> = [];

    const startOffset = (startDate.getDay() + 6) % 7; // 0 = Monday
    startDate.setDate(startDate.getDate() - startOffset);

    const endOffset = 6 - ((endDate.getDay() + 6) % 7); // 6 = Sunday
    endDate.setDate(endDate.getDate() + endOffset);

    for (let date = new Date(startDate), dayIndex = 0; date <= endDate; ) {
      const dateStr = formatDateKey(date);
      const count = dataMap.get(dateStr) || 0;
      const dayOfWeek = (date.getDay() + 6) % 7; // 0 = Monday, 6 = Sunday
      const weekIndex = Math.floor(dayIndex / 7);

      days.push({
        date: dateStr,
        count,
        level: getColorLevel(count),
        dayOfWeek,
        weekIndex,
      });

      date.setDate(date.getDate() + 1);
      dayIndex += 1;
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
      const date = parseDateKey(day.date);
      const month = date.getMonth();
      const weekIndex = day.weekIndex;

      if (month !== currentMonth && (day.dayOfWeek === 0 || labels.length === 0)) {
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

  const handleMouseEnter = useCallback((e: React.MouseEvent, date: string, count: number) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setHoveredCell({
      date,
      count,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  const weekCount = Math.max(weeks.size, 1);

  return (
    <div className={`select-none ${className}`}>
      {/* Month labels */}
      <div className="flex mb-1">
        <div className="flex-1 flex relative h-4">
          {monthLabels.map((label, index) => (
            <span
              key={index}
              className="absolute text-[10px] text-gray-500 dark:text-gray-400"
              style={{
                left: `${(label.weekIndex / weekCount) * 100}%`,
              }}
            >
              {label.month}
            </span>
          ))}
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="flex">
        {/* Grid */}
        <div className="flex flex-1 min-w-0 gap-[2px]">
          {Array.from(weeks.entries()).map(([weekIndex, weekDays]) => (
            <div key={weekIndex} className="flex flex-col gap-[2px] flex-1">
              {Array.from({ length: 7 }).map((_, dayIndex) => {
                const day = weekDays.find((d) => d.dayOfWeek === dayIndex);
                if (!day) {
                  // Empty cell for days that don't exist in this week
                  return <div key={dayIndex} className="w-full aspect-square" />;
                }

                return (
                  <button
                    key={dayIndex}
                    onClick={() => handleCellClick(day.date, day.count)}
                    onMouseEnter={(e) => handleMouseEnter(e, day.date, day.count)}
                    onMouseLeave={handleMouseLeave}
                    className={`
                      w-full aspect-square rounded-sm
                      ${COLOR_LEVELS[day.level as keyof typeof COLOR_LEVELS]}
                      ${selectedDate === day.date ? 'ring-2 ring-primary-500 dark:ring-primary-400 ring-offset-1 dark:ring-offset-dark-900' : ''}
                      hover:ring-2 hover:ring-gray-400 dark:hover:ring-gray-500
                      transition-all duration-150
                      focus:outline-none focus:ring-2 focus:ring-primary-500
                    `}
                    aria-label={`${formatDate(day.date)}: ${day.count} 条memo`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-2.5">
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
