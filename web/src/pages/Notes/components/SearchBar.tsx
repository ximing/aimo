import { Input, Popover, Radio, DatePicker } from "antd";
import { SearchOutlined, SettingOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import type { RangePickerProps } from "antd/es/date-picker";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  searchMode: "similarity" | "fulltext";
  onSearchModeChange: (mode: "similarity" | "fulltext") => void;
  dateRange: RangePickerProps<Dayjs>["value"];
  onDateRangeChange: RangePickerProps<Dayjs>["onChange"];
}

export const SearchBar = ({
  value,
  onChange,
  searchMode,
  onSearchModeChange,
  dateRange,
  onDateRangeChange,
}: SearchBarProps) => {
  const searchOptions = (
    <div className="search-popover">
      <div className="search-option">
        <div className="option-label">搜索模式</div>
        <Radio.Group
          value={searchMode}
          onChange={(e) => onSearchModeChange(e.target.value)}
        >
          <Radio value="fulltext">全文搜索</Radio>
          <Radio value="similarity">相似度搜索</Radio>
        </Radio.Group>
      </div>
      <div className="search-option">
        <div className="option-label">时间范围</div>
        <DatePicker.RangePicker
          value={dateRange}
          onChange={onDateRangeChange}
        />
      </div>
    </div>
  );

  return (
    <div className="search-bar">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="搜索笔记..."
        prefix={<SearchOutlined />}
        suffix={
          <Popover
            content={searchOptions}
            trigger="click"
            placement="bottomRight"
            overlayClassName="search-popover-overlay"
          >
            <SettingOutlined />
          </Popover>
        }
      />
    </div>
  );
};
