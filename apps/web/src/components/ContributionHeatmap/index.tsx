import { useMemo, useState, useEffect } from 'react';
import { Tooltip } from 'antd';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import './style.css';
import { getHeatmapData } from '@/api/notes';
import { useNoteStore } from '@/stores/noteStore';

// 注册插件
dayjs.extend(isBetween);

interface ContributionHeatmapProps {
  onRefresh?: () => void;
}

export default function ContributionHeatmap({
  onRefresh,
}: ContributionHeatmapProps) {
  const { resetQuery, setDateRange } = useNoteStore();
  const [heatmapData, setHeatmapData] = useState<
    { date: string; count: number }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  // 获取最近12周的日期范围
  const dateRange = useMemo(() => {
    const end = dayjs().endOf('day');
    const start = end.subtract(83, 'day').startOf('day');
    return {
      startDate: start.format('YYYY-MM-DD'),
      endDate: end.format('YYYY-MM-DD'),
    };
  }, []);

  // 获取热力图数据
  const fetchHeatmapData = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const data = await getHeatmapData(dateRange.startDate, dateRange.endDate);
      setHeatmapData(data);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to fetch heatmap data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 初始加载和日期范围变化时获取数据
  useEffect(() => {
    fetchHeatmapData();
  }, [dateRange.startDate, dateRange.endDate]);

  const { weeks, maxCount } = useMemo(() => {
    if (!heatmapData.length) {
      return { weeks: [], maxCount: 0 };
    }

    // 创建日期到计数的映射
    const dailyCount = heatmapData.reduce(
      (acc, { date, count }) => {
        acc[date] = count;
        return acc;
      },
      {} as Record<string, number>
    );

    // 按周分组数据
    const weeks = [];
    let currentDate = dayjs(dateRange.startDate);
    let currentWeek = [];

    while (
      currentDate.isBefore(dateRange.endDate) ||
      currentDate.isSame(dateRange.endDate, 'day')
    ) {
      const date = currentDate.format('YYYY-MM-DD');
      currentWeek.push({
        date,
        dateDayjs: currentDate,
        count: dailyCount[date] || 0,
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
  }, [heatmapData, dateRange]);

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
            {week.map(({ date, dateDayjs, count }) => (
              <Tooltip title={`${count} 条笔记于 ${date}`}>
                <div
                  key={date}
                  className={`contribution-day level-${getContributionLevel(count)}`}
                  onClick={() => {
                    resetQuery();
                    setDateRange(dateDayjs, dateDayjs);
                  }}
                />
              </Tooltip>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
