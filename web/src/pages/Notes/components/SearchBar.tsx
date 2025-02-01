import { Input, Select, DatePicker, Popover } from "antd";
import { SearchOutlined, MacCommandOutlined } from "@ant-design/icons";
import { useState, useCallback } from "react";
import type { Dayjs } from "dayjs";
const { RangePicker } = DatePicker;

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  searchMode: "similarity" | "fulltext";
  onSearchModeChange: (mode: "similarity" | "fulltext") => void;
  dateRange: [Dayjs | null, Dayjs | null];
  onDateRangeChange: (dates: [Dayjs | null, Dayjs | null]) => void;
}

export const SearchBar = ({
  value,
  onChange,
  searchMode,
  onSearchModeChange,
  dateRange,
  onDateRangeChange,
}: SearchBarProps) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  const handleSearch = useCallback(() => {
    onChange(inputValue);
    setOpen(false);
  }, [inputValue, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const content = (
    <div className="search-popover">
      <div className="search-option">
        <div className="option-label">搜索方式</div>
        <Select
          value={searchMode}
          onChange={onSearchModeChange}
          style={{ width: "100%" }}
        >
          <Select.Option value="similarity">相似度搜索</Select.Option>
          <Select.Option value="fulltext">全文检索</Select.Option>
        </Select>
      </div>
      <div className="search-option">
        <div className="option-label">时间范围</div>
        <RangePicker
          value={dateRange}
          onChange={(dates) =>
            onDateRangeChange([dates?.[0] || null, dates?.[1] || null])
          }
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
      overlayClassName="search-popover-overlay"
    >
      <div className="search-wrapper">
        <SearchOutlined
          className="search-icon"
          onClick={(e) => {
            e.stopPropagation();
            handleSearch();
          }}
        />
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="搜索笔记..."
          bordered={false}
          className="search-input"
        />
        <div className="search-shortcut">
          <MacCommandOutlined />
          <span>K</span>
        </div>
      </div>
    </Popover>
  );
}; 