import { Input, Popover, Radio, DatePicker } from 'antd';
import { SearchOutlined, SettingOutlined } from '@ant-design/icons';
import { useNoteStore } from '@/stores/noteStore';

interface SearchBarProps {}

const { Search } = Input;

export const SearchBar = ({}: SearchBarProps) => {
  const {
    searchText,
    searchMode,
    startDate,
    endDate,
    setDateRange,
    setSearchText,
    fetchSearchNotes,
    setSearchMode,
  } = useNoteStore();

  const searchOptions = (
    <div className="search-popover">
      <div className="search-option">
        <div className="option-label">搜索模式</div>
        <Radio.Group
          value={searchMode}
          onChange={(e) => setSearchMode(e.target.value)}
        >
          <Radio value="fulltext">全文搜索</Radio>
          <Radio value="similarity">相似度搜索</Radio>
        </Radio.Group>
      </div>
      <div className="search-option">
        <div className="option-label">时间范围</div>
        <DatePicker.RangePicker
          value={[startDate, endDate]}
          onChange={(dates) => setDateRange(dates[0], dates[1])}
        />
      </div>
    </div>
  );

  return (
    <div className="search-bar">
      <Input
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        onPressEnter={fetchSearchNotes}
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
