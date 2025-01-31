import { useMemo } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import "./style.css";
import type { Note } from "@/api/types";

// 注册插件
dayjs.extend(isBetween);

interface ContributionHeatmapProps {
  notes: Note[];
}

export default function ContributionHeatmap({ notes }: ContributionHeatmapProps) {
  const { weeks, maxCount } = useMemo(() => {
    // 获取最近12周的数据
    const end = dayjs().endOf('day');
    const start = end.subtract(83, 'day').startOf('day'); // 12周 = 84天

    // 统计每天的笔记数量
    const dailyCount = notes.reduce((acc, note) => {
      const date = dayjs(note.createdAt).format('YYYY-MM-DD');
      if (dayjs(date).isBetween(start, end, 'day', '[]')) {
        acc[date] = (acc[date] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // 按周分组数据
    const weeks = [];
    let currentDate = start;
    let currentWeek = [];

    while (currentDate.isBefore(end) || currentDate.isSame(end, 'day')) {
      const date = currentDate.format('YYYY-MM-DD');
      currentWeek.push({
        date,
        count: dailyCount[date] || 0
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      currentDate = currentDate.add(1, 'day');
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    // 计算最大值用于颜色等级
    const maxCount = Math.max(...Object.values(dailyCount), 1);

    return { weeks, maxCount };
  }, [notes]);

  // 获取贡献等级 (0-4)
  const getContributionLevel = (count: number) => {
    if (count === 0) return 0;
    const level = Math.ceil((count / maxCount) * 4);
    return Math.min(level, 4);
  };

  return (
    <div className="contribution-graph">
      <div className="contribution-grid">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="contribution-week">
            {week.map(({ date, count }) => (
              <div
                key={date}
                className={`contribution-day level-${getContributionLevel(count)}`}
                title={`${count} 条笔记于 ${date}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
} 