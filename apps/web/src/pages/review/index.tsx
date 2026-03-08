import { useState, useEffect } from 'react';
import { view } from '@rabjs/react';
import { Layout } from '../../components/layout';
import * as reviewApi from '../../api/review';
import * as srApi from '../../api/spaced-repetition';
import * as categoryApi from '../../api/category';
import * as tagApi from '../../api/tag';
import type { ReviewSessionDto, SubmitAnswerResponseDto, CompleteSessionResponseDto, ReviewHistoryItemDto, ReviewItemDto, ReviewProfileDto, ProfileFilterRule } from '@aimo/dto';
import type { SRCard } from '../../api/spaced-repetition';
import { Clock, Loader2, ChevronLeft, ChevronRight, CheckCircle, Circle, XCircle, Plus, BrainCircuit, Trash2, Play, Save, X, Calendar, Tag, FolderOpen, CalendarDays } from 'lucide-react';

type Step = 'setup' | 'quiz' | 'summary';
type Scope = 'all' | 'category' | 'tag' | 'recent';
type ReviewType = 'ai' | 'sr';

/**
 * Format relative time (e.g., "2 hours ago")
 */
const formatRelativeTime = (timestamp: string): string => {
  const now = Date.now();
  const date = new Date(timestamp);
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
};

/**
 * Scope labels
 */
const scopeLabels: Record<Scope, string> = {
  all: '全部笔记',
  category: '按分类',
  tag: '按标签',
  recent: '最近 N 天',
};

/**
 * Get item status icon
 */
const getItemStatus = (item: ReviewItemDto): 'remembered' | 'fuzzy' | 'forgot' | 'pending' => {
  if (item.mastery === 'remembered') return 'remembered';
  if (item.mastery === 'fuzzy') return 'fuzzy';
  if (item.mastery === 'forgot') return 'forgot';
  return 'pending';
};

// ─── ProfileDetailPanel ────────────────────────────────────────────────────

type RuleType = ProfileFilterRule['type'];
type RuleOperator = ProfileFilterRule['operator'];

const RULE_TYPE_LABELS: Record<RuleType, string> = {
  category: '分类',
  tag: '标签',
  recent_days: '最近 N 天',
  date_range: '日期范围',
};

const RULE_TYPE_ICONS: Record<RuleType, React.ReactNode> = {
  category: <FolderOpen className="w-3.5 h-3.5" />,
  tag: <Tag className="w-3.5 h-3.5" />,
  recent_days: <CalendarDays className="w-3.5 h-3.5" />,
  date_range: <Calendar className="w-3.5 h-3.5" />,
};

interface ProfileDetailPanelProps {
  mode: string; // 'none' | 'new' | profileId
  name: string;
  rules: ProfileFilterRule[];
  questionCount: number;
  dirty: boolean;
  saving: boolean;
  loading: boolean;
  categories: { id: string; name: string }[];
  tags: { id: string; name: string }[];
  onNameChange: (v: string) => void;
  onRulesChange: (rules: ProfileFilterRule[]) => void;
  onQuestionCountChange: (v: number) => void;
  onSave: () => Promise<string | null>;
  onStartWithSave: () => void;
  onDelete?: () => void;
}

const ProfileDetailPanel = ({
  mode, name, rules, questionCount, dirty, saving, loading,
  categories, tags,
  onNameChange, onRulesChange, onQuestionCountChange,
  onSave, onStartWithSave, onDelete,
}: ProfileDetailPanelProps) => {
  // State for the "add rule" form
  const [addingType, setAddingType] = useState<RuleType>('category');
  const [addingOperator, setAddingOperator] = useState<RuleOperator>('include');
  const [addingValue, setAddingValue] = useState('');
  const [addingDateStart, setAddingDateStart] = useState('');
  const [addingDateEnd, setAddingDateEnd] = useState('');
  const [addingRecentDays, setAddingRecentDays] = useState('7');

  if (mode === 'none') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-24">
        <BrainCircuit className="w-16 h-16 text-gray-200 dark:text-gray-700 mb-4" />
        <p className="text-gray-400 dark:text-gray-500 text-sm">从左侧选择一个回顾模式</p>
        <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">或点击「新建模式」创建一个</p>
      </div>
    );
  }

  const isNew = mode === 'new';

  const handleAddRule = () => {
    let value = '';
    let label = '';
    if (addingType === 'category') {
      value = addingValue;
      label = categories.find(c => c.id === addingValue)?.name ?? addingValue;
    } else if (addingType === 'tag') {
      value = addingValue;
      label = tags.find(t => t.id === addingValue)?.name ?? addingValue;
    } else if (addingType === 'recent_days') {
      value = addingRecentDays;
      label = `${addingRecentDays}天内`;
    } else if (addingType === 'date_range') {
      value = `${addingDateStart},${addingDateEnd}`;
      label = `${addingDateStart} ~ ${addingDateEnd}`;
    }
    if (!value) return;
    onRulesChange([...rules, { type: addingType, operator: addingOperator, value, label }]);
    setAddingValue('');
    setAddingDateStart('');
    setAddingDateEnd('');
    setAddingRecentDays('7');
  };

  const handleRemoveRule = (idx: number) => {
    onRulesChange(rules.filter((_, i) => i !== idx));
  };

  const operatorLabel = (op: RuleOperator) => op === 'include' ? '包含' : '排除';
  const operatorColor = (op: RuleOperator) =>
    op === 'include'
      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';

  return (
    <div className="max-w-xl mx-auto px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
          {isNew ? '新建回顾模式' : '编辑回顾模式'}
        </h2>
        {!isNew && onDelete && (
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="删除模式"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">模式名称</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="例如：工作笔记每日复习"
          className="w-full bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          autoFocus={isNew}
        />
      </div>

      {/* Filter Rules */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">过滤规则</label>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">多条规则为 AND 关系，笔记需同时满足所有规则</p>

        {/* Existing rules */}
        {rules.length > 0 && (
          <div className="space-y-2 mb-3">
            {rules.map((rule, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-gray-50 dark:bg-dark-700 rounded-lg px-3 py-2">
                <span className="text-gray-400">{RULE_TYPE_ICONS[rule.type]}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{RULE_TYPE_LABELS[rule.type]}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${operatorColor(rule.operator)}`}>
                  {operatorLabel(rule.operator)}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">
                  {rule.label ?? rule.value}
                </span>
                <button
                  onClick={() => handleRemoveRule(idx)}
                  className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add rule form */}
        <div className="border border-dashed border-gray-300 dark:border-dark-600 rounded-lg p-3 space-y-3">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">添加规则</p>

          {/* Row 1: type + operator */}
          <div className="flex gap-2">
            <select
              value={addingType}
              onChange={(e) => { setAddingType(e.target.value as RuleType); setAddingValue(''); }}
              className="flex-1 bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {(Object.keys(RULE_TYPE_LABELS) as RuleType[]).map(t => (
                <option key={t} value={t}>{RULE_TYPE_LABELS[t]}</option>
              ))}
            </select>
            {(addingType === 'category' || addingType === 'tag') && (
              <select
                value={addingOperator}
                onChange={(e) => setAddingOperator(e.target.value as RuleOperator)}
                className="w-20 bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="include">包含</option>
                <option value="exclude">排除</option>
              </select>
            )}
          </div>

          {/* Row 2: value input */}
          {addingType === 'category' && (
            <select
              value={addingValue}
              onChange={(e) => setAddingValue(e.target.value)}
              className="w-full bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">选择分类...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {addingType === 'tag' && (
            <select
              value={addingValue}
              onChange={(e) => setAddingValue(e.target.value)}
              className="w-full bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">选择标签...</option>
              {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          {addingType === 'recent_days' && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={365}
                value={addingRecentDays}
                onChange={(e) => setAddingRecentDays(e.target.value)}
                className="w-24 bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">天内创建的笔记</span>
            </div>
          )}
          {addingType === 'date_range' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={addingDateStart}
                onChange={(e) => setAddingDateStart(e.target.value)}
                className="flex-1 bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <span className="text-xs text-gray-400">至</span>
              <input
                type="date"
                value={addingDateEnd}
                onChange={(e) => setAddingDateEnd(e.target.value)}
                className="flex-1 bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          )}

          <button
            onClick={handleAddRule}
            disabled={
              (addingType === 'category' && !addingValue) ||
              (addingType === 'tag' && !addingValue) ||
              (addingType === 'date_range' && (!addingDateStart || !addingDateEnd))
            }
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-sm text-primary-600 dark:text-primary-400 border border-primary-300 dark:border-primary-700 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            添加此规则
          </button>
        </div>
      </div>

      {/* Question Count */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          题目数量：<span className="text-primary-600 dark:text-primary-400 font-semibold">{questionCount}</span>
        </label>
        <input
          type="range"
          min={5}
          max={20}
          value={questionCount}
          onChange={(e) => onQuestionCountChange(parseInt(e.target.value, 10))}
          className="w-full accent-primary-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>5</span><span>20</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onSave}
          disabled={saving || !name.trim()}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {dirty ? '保存修改' : '已保存'}
        </button>
        <button
          onClick={onStartWithSave}
          disabled={loading || saving || !name.trim()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {loading ? '准备中...' : '开始回顾'}
        </button>
      </div>
    </div>
  );
};

// ─── ReviewPage ────────────────────────────────────────────────────────────

export const ReviewPage = view(() => {
  const [step, setStep] = useState<Step>('setup');
  const [reviewType, setReviewType] = useState<ReviewType>('ai');
  const [session, setSession] = useState<ReviewSessionDto | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<SubmitAnswerResponseDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [finalSession, setFinalSession] = useState<CompleteSessionResponseDto | null>(null);

  // Spaced Repetition state
  const [srCards, setSrCards] = useState<SRCard[]>([]);
  const [srCurrentIndex, setSrCurrentIndex] = useState(0);
  const [srCardFlipped, setSrCardFlipped] = useState(false);
  const [skippedCards, setSkippedCards] = useState<SRCard[]>([]);
  const [srLoading, setSrLoading] = useState(false);
  const [srStats, setSrStats] = useState<{ mastered: number; remembered: number; fuzzy: number; forgot: number }>({
    mastered: 0,
    remembered: 0,
    fuzzy: 0,
    forgot: 0,
  });
  const [srTotalCards, setSrTotalCards] = useState(0);
  const [srTotalDue, setSrTotalDue] = useState(0);
  const [srDailyLimit, setSrDailyLimit] = useState(0);
  const [srImporting, setSrImporting] = useState(false);

  // History sidebar state
  const [history, setHistory] = useState<ReviewHistoryItemDto[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistorySession, setSelectedHistorySession] = useState<string | null>(null);

  // Review Profile state
  const [profiles, setProfiles] = useState<ReviewProfileDto[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);

  // Profile detail panel state
  // 'none' = empty placeholder, 'new' = creating new, profileId = editing existing
  type DetailMode = 'none' | 'new' | string;
  const [detailMode, setDetailMode] = useState<DetailMode>('none');
  const [detailName, setDetailName] = useState('');
  const [detailRules, setDetailRules] = useState<ProfileFilterRule[]>([]);
  const [detailQuestionCount, setDetailQuestionCount] = useState(10);
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailDirty, setDetailDirty] = useState(false);

  // Legacy state kept for SR mode / other uses
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Handle tab switch - reset states to prevent pollution
  const handleReviewTypeChange = (type: ReviewType) => {
    if (type === reviewType) return;
    // Reset AI Review states
    setStep('setup');
    setSession(null);
    setCurrentIndex(0);
    setAnswer('');
    setFeedback(null);
    setFinalScore(null);
    setFinalSession(null);
    setSelectedHistorySession(null);
    // Reset SR states
    setSrCards([]);
    setSrCurrentIndex(0);
    setSrCardFlipped(false);
    setSkippedCards([]);
    setSrStats({ mastered: 0, remembered: 0, fuzzy: 0, forgot: 0 });
    // Set new type
    setReviewType(type);
  };

  const STORAGE_KEY = 'aimo-review-session';

  // Load history, profiles, categories, tags and restore selected session on mount
  useEffect(() => {
    loadHistory();
    loadProfiles();
    loadCategoriesAndTags();
    // Restore last selected session from localStorage
    const savedSessionId = localStorage.getItem(STORAGE_KEY);
    if (savedSessionId) {
      // Restore session directly without triggering localStorage save again
      const restoreSession = async () => {
        setLoading(true);
        setSelectedHistorySession(savedSessionId);
        try {
          const res = await reviewApi.getReviewSession(savedSessionId);
          if (res.code === 0 && res.data) {
            const firstUnanswered = res.data.items.findIndex(item => item.mastery === undefined);
            if (res.data.status === 'completed') {
              setSession(res.data);
              setStep('summary');
              setFinalScore(res.data.score ?? 0);
              setFinalSession({
                sessionId: res.data.sessionId,
                score: res.data.score ?? 0,
                items: res.data.items,
              });
            } else if (firstUnanswered !== -1) {
              setSession(res.data);
              setStep('quiz');
              setCurrentIndex(firstUnanswered);
              setAnswer('');
              setFeedback(null);
            } else {
              setSession(res.data);
              setStep('quiz');
              setCurrentIndex(0);
              setAnswer('');
              setFeedback(null);
            }
          }
        } finally {
          setLoading(false);
        }
      };
      restoreSession();
    }
  }, []);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await reviewApi.getReviewHistory();
      if (res.code === 0) {
        setHistory(res.data.items);
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadProfiles = async () => {
    try {
      const res = await reviewApi.getReviewProfiles();
      if (res.code === 0) {
        setProfiles(res.data.profiles);
      }
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  };

  const loadCategoriesAndTags = async () => {
    try {
      const [catRes, tagRes] = await Promise.all([
        categoryApi.getCategories(),
        tagApi.getTags(),
      ]);
      if (catRes.code === 0) {
        setCategories((catRes.data?.categories || []).map((c: any) => ({ id: c.categoryId, name: c.name })));
      }
      if (tagRes.code === 0) {
        setTags((tagRes.data?.tags || []).map((t: any) => ({ id: t.tagId, name: t.name })));
      }
    } catch (error) {
      console.error('Failed to load categories/tags:', error);
    }
  };

  const handleStartWithProfile = async (profileId: string) => {
    setLoading(true);
    try {
      const res = await reviewApi.createReviewSession({ profileId });
      if (res.code === 0) {
        setSession(res.data);
        setStep('quiz');
        setCurrentIndex(0);
        setAnswer('');
        setFeedback(null);
        const newSessionId = res.data.sessionId;
        setSelectedHistorySession(newSessionId);
        localStorage.setItem(STORAGE_KEY, newSessionId);
        loadHistory();
      }
    } finally {
      setLoading(false);
    }
  };

  // Open detail panel for new profile
  const handleNewProfile = () => {
    setStep('setup');
    setDetailMode('new');
    setDetailName('');
    setDetailRules([]);
    setDetailQuestionCount(10);
    setDetailDirty(false);
    setSelectedProfileId(null);
  };

  // Open detail panel for existing profile
  const handleSelectProfile = (profile: ReviewProfileDto) => {
    setStep('setup');
    setDetailMode(profile.profileId);
    setDetailName(profile.name);
    setDetailRules(profile.filterRules ?? []);
    setDetailQuestionCount(profile.questionCount);
    setDetailDirty(false);
    setSelectedProfileId(profile.profileId);
  };

  const handleDetailRuleChange = (rules: ProfileFilterRule[]) => {
    setDetailRules(rules);
    setDetailDirty(true);
  };

  const handleSaveDetail = async (): Promise<string | null> => {
    if (!detailName.trim()) return null;
    setDetailSaving(true);
    try {
      if (detailMode === 'new') {
        const res = await reviewApi.createReviewProfile({
          name: detailName.trim(),
          filterRules: detailRules,
          questionCount: detailQuestionCount,
        });
        if (res.code === 0) {
          setProfiles([res.data, ...profiles]);
          setDetailMode(res.data.profileId);
          setSelectedProfileId(res.data.profileId);
          setDetailDirty(false);
          return res.data.profileId;
        }
      } else {
        const res = await reviewApi.updateReviewProfile(detailMode, {
          name: detailName.trim(),
          filterRules: detailRules,
          questionCount: detailQuestionCount,
        });
        if (res.code === 0) {
          setProfiles(profiles.map(p => p.profileId === detailMode ? res.data : p));
          setDetailDirty(false);
          return detailMode;
        }
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setDetailSaving(false);
    }
    return null;
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!window.confirm('确定要删除这个回顾模式吗？')) return;
    try {
      const res = await reviewApi.deleteReviewProfile(profileId);
      if (res.code === 0) {
        setProfiles(profiles.filter(p => p.profileId !== profileId));
        if (detailMode === profileId) {
          setDetailMode('none');
          setSelectedProfileId(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete profile:', error);
    }
  };

  const handleStartWithDetail = async () => {
    // Save first if dirty or new
    let profileId: string | null = detailMode === 'new' ? null : detailMode;
    if (detailMode === 'new' || detailDirty) {
      profileId = await handleSaveDetail();
    }
    if (!profileId) return;
    await handleStartWithProfile(profileId);
  };

  // Calculate progress - count items that have been answered
  const answeredCount = session?.items.filter(item => item.mastery !== undefined).length || 0;
  const totalCount = session?.items.length || 0;

  // SR progress


  const handleSelectHistorySession = async (sessionId: string) => {
    setLoading(true);
    setSelectedHistorySession(sessionId);
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, sessionId);
    try {
      const res = await reviewApi.getReviewSession(sessionId);
      if (res.code === 0 && res.data) {
        // Find first unanswered item
        const firstUnanswered = res.data.items.findIndex(item => item.mastery === undefined);
        if (res.data.status === 'completed') {
          setSession(res.data);
          setStep('summary');
          setFinalScore(res.data.score ?? 0);
          setFinalSession({
            sessionId: res.data.sessionId,
            score: res.data.score ?? 0,
            items: res.data.items,
          });
        } else if (firstUnanswered !== -1) {
          // Active session - continue from first unanswered
          setSession(res.data);
          setStep('quiz');
          setCurrentIndex(firstUnanswered);
          setAnswer('');
          setFeedback(null);
        } else {
          // All answered, go to summary
          setSession(res.data);
          setStep('quiz');
          setCurrentIndex(0);
          setAnswer('');
          setFeedback(null);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async (skipAnswer = false) => {
    if (!session) return;
    setLoading(true);
    try {
      const item = session.items[currentIndex];
      const answerText = skipAnswer ? '我忘记了' : answer;
      const res = await reviewApi.submitAnswer(session.sessionId, { itemId: item.itemId, answer: answerText });
      if (res.code === 0) {
        setFeedback(res.data);
        // Update session with the new answer/mastery
        const updatedItems = [...session.items];
        updatedItems[currentIndex] = {
          ...updatedItems[currentIndex],
          userAnswer: answerText,
          aiFeedback: res.data.aiFeedback,
          mastery: res.data.mastery,
        };
        setSession({ ...session, items: updatedItems });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = () => {
    handleSubmitAnswer(true);
  };

  const handleNext = () => {
    if (!session) return;
    if (currentIndex + 1 >= session.items.length) {
      handleComplete();
    } else {
      setCurrentIndex(currentIndex + 1);
      // Check if next item already has an answer
      const nextItem = session.items[currentIndex + 1];
      if (nextItem.mastery !== undefined) {
        setFeedback({ itemId: nextItem.itemId, aiFeedback: nextItem.aiFeedback || '', mastery: nextItem.mastery });
        setAnswer(nextItem.userAnswer || '');
      } else {
        setAnswer('');
        setFeedback(null);
      }
    }
  };

  const handlePrev = () => {
    if (!session || currentIndex === 0) return;
    setCurrentIndex(currentIndex - 1);
    // Check if previous item has an answer
    const prevItem = session.items[currentIndex - 1];
    if (prevItem.mastery !== undefined) {
      setFeedback({ itemId: prevItem.itemId, aiFeedback: prevItem.aiFeedback || '', mastery: prevItem.mastery });
      setAnswer(prevItem.userAnswer || '');
    } else {
      setAnswer('');
      setFeedback(null);
    }
  };

  const handleJumpToItem = (index: number) => {
    if (!session) return;
    setCurrentIndex(index);
    const item = session.items[index];
    if (item.mastery !== undefined) {
      setFeedback({ itemId: item.itemId, aiFeedback: item.aiFeedback || '', mastery: item.mastery });
      setAnswer(item.userAnswer || '');
    } else {
      setAnswer('');
      setFeedback(null);
    }
  };

  const handleComplete = async () => {
    if (!session) return;
    const res = await reviewApi.completeSession(session.sessionId);
    if (res.code === 0) {
      setFinalScore(res.data.score);
      setFinalSession(res.data);
      setStep('summary');
      loadHistory();
    }
  };

  // ========== Spaced Repetition Handlers ==========
  const handleStartSR = async () => {
    setSrLoading(true);
    setSkippedCards([]);
    setSrStats({ mastered: 0, remembered: 0, fuzzy: 0, forgot: 0 });
    try {
      // Fetch both due cards and total count in parallel
      const [dueRes, statsRes] = await Promise.all([
        srApi.getDueCards(),
        srApi.getSRStats(),
      ]);

      if (dueRes.code === 0 && dueRes.data?.cards) {
        // Update total cards count
        if (statsRes.code === 0 && statsRes.data) {
          setSrTotalCards(statsRes.data.totalCards);
        }

        // Store total due count and daily limit for display
        setSrTotalDue(dueRes.data.totalDue ?? dueRes.data.cards.length);
        setSrDailyLimit(dueRes.data.dailyLimit ?? 0);

        if (dueRes.data.cards.length === 0) {
          // No cards due - show summary directly
          setSrCards([]);
          setSrCurrentIndex(0);
          setFinalScore(null);
          setFinalSession(null);
          setStep('summary');
        } else {
          setSrCards(dueRes.data.cards);
          setSrCurrentIndex(0);
          setStep('quiz');
        }
      }
    } finally {
      setSrLoading(false);
    }
  };

  const handleImportExistingMemos = async () => {
    setSrImporting(true);
    try {
      const res = await srApi.importExistingMemos();
      if (res.code === 0 && res.data) {
        // Show success message and refresh
        const { imported, skipped } = res.data;
        alert(`已导入 ${imported} 条笔记，跳过 ${skipped} 条`);
        // Refresh the due cards
        await handleStartSR();
      }
    } finally {
      setSrImporting(false);
    }
  };

  const handleSRReview = async (quality: 'mastered' | 'remembered' | 'fuzzy' | 'forgot' | 'skip') => {
    if (srCurrentIndex >= srCards.length) return;

    const card = srCards[srCurrentIndex];

    if (quality === 'skip') {
      // Move skipped card to end of queue
      setSkippedCards([...skippedCards, card]);
      moveToNextSR();
      return;
    }

    setSrLoading(true);
    try {
      const res = await srApi.reviewCard(card.cardId, quality);
      if (res.code === 0) {
        // Update the card in place
        const updatedCards = [...srCards];
        updatedCards[srCurrentIndex] = res.data.card;
        setSrCards(updatedCards);

        // Update stats
        if (quality !== 'skip') {
          setSrStats(prev => ({
            ...prev,
            [quality]: prev[quality as keyof typeof prev] + 1,
          }));
        }

        moveToNextSR();
      }
    } finally {
      setSrLoading(false);
    }
  };

  const moveToNextSR = () => {
    setSrCardFlipped(false); // Reset flip state
    const remainingCards = srCards.length - srCurrentIndex - 1;
    const totalSkipped = skippedCards.length;

    if (remainingCards <= 0 && totalSkipped <= 0) {
      // All cards done
      setStep('summary');
      setFinalScore(null);
      setFinalSession(null);
    } else if (remainingCards <= 0 && totalSkipped > 0) {
      // Move skipped cards back to continue
      setSrCards([...skippedCards]);
      setSkippedCards([]);
      setSrCurrentIndex(0);
    } else {
      setSrCurrentIndex(srCurrentIndex + 1);
    }
  };

  const currentSRCard = srCards[srCurrentIndex];

  const masteryLabel = (m?: string) => ({ remembered: '记得', fuzzy: '模糊', forgot: '忘了' }[m ?? ''] ?? '未回答');
  const masteryColor = (m?: string) => ({
    remembered: 'text-green-600 dark:text-green-400',
    fuzzy: 'text-yellow-600 dark:text-yellow-400',
    forgot: 'text-red-600 dark:text-red-400',
  }[m ?? ''] ?? 'text-gray-400');

  const currentItem = session?.items[currentIndex];

  return (
    <Layout>
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Tab Bar - Full width, centered items */}
        <div className="flex-shrink-0 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700">
          <div className="flex justify-center gap-2 px-6 pt-3">
            <button
              onClick={() => handleReviewTypeChange('ai')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-t-lg border-b-2 transition-all ${
                reviewType === 'ai'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300'
              }`}
            >
              <BrainCircuit className={`w-5 h-5 ${reviewType === 'ai' ? 'text-primary-600 dark:text-primary-400' : ''}`} />
              <span className="font-medium">AI 回顾</span>
            </button>
            <button
              onClick={() => handleReviewTypeChange('sr')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-t-lg border-b-2 transition-all ${
                reviewType === 'sr'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300'
              }`}
            >
              <Clock className={`w-5 h-5 ${reviewType === 'sr' ? 'text-primary-600 dark:text-primary-400' : ''}`} />
              <span className="font-medium">间隔重复</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - only shown in AI review mode */}
        {reviewType === 'ai' && (
        <aside className="w-[280px] flex-shrink-0 border-r border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-800 flex flex-col overflow-hidden">
          {/* Sidebar Header - 回顾模式 */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-dark-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                  <BrainCircuit className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-base font-semibold text-gray-900 dark:text-gray-50">回顾模式</h1>
              </div>
              <button
                onClick={handleNewProfile}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                title="新建模式"
              >
                <Plus className="w-4 h-4" />
                <span>新建模式</span>
              </button>
            </div>
          </div>

          {/* Profile List in Left Sidebar - adaptive height */}
          <div className="overflow-y-auto border-b border-gray-200 dark:border-dark-700">
            {profiles.length === 0 ? (
              <div className="p-8 text-center">
                <BrainCircuit className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">暂无保存的模式</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  点击上方 + 创建回顾模式
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {profiles.map((profile) => (
                  <div
                    key={profile.profileId}
                    className={`relative group rounded-lg transition-colors cursor-pointer ${
                      detailMode === profile.profileId
                        ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                        : 'hover:bg-gray-100 dark:hover:bg-dark-700 border border-transparent'
                    }`}
                    onClick={() => handleSelectProfile(profile)}
                  >
                    <div className="p-3">
                      <p
                        className={`text-sm font-medium truncate ${
                          detailMode === profile.profileId
                            ? 'text-primary-700 dark:text-primary-400'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {profile.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {profile.filterRules?.length > 0 ? `${profile.filterRules.length}条规则` : '全部笔记'} · {profile.questionCount}题
                      </p>
                    </div>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartWithProfile(profile.profileId);
                        }}
                        className="p-1.5 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded"
                        title="开始"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProfile(profile.profileId);
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History Section Header */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-dark-700">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">历史记录</h2>
          </div>

          {/* History List - takes remaining space */}
          <div className="flex-1 overflow-y-auto">
            {historyLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 dark:bg-dark-700 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center">
                <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">暂无回顾历史</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  开始一次回顾来创建记录
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {history.map((item) => (
                  <div
                    key={item.sessionId}
                    className={`relative group rounded-lg transition-colors cursor-pointer ${
                      selectedHistorySession === item.sessionId
                        ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                        : 'hover:bg-gray-100 dark:hover:bg-dark-700 border border-transparent'
                    }`}
                    onClick={() => handleSelectHistorySession(item.sessionId)}
                  >
                    <div className="p-3">
                      <p
                        className={`text-sm font-medium truncate ${
                          selectedHistorySession === item.sessionId
                            ? 'text-primary-700 dark:text-primary-400'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {scopeLabels[item.scope]}{item.scopeValue ? ` - ${item.scopeValue}` : ''}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-400">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                        {item.score !== undefined && (
                          <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                            {item.score}分
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-dark-800 overflow-hidden">

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-8 py-6">
              {step === 'setup' && reviewType === 'ai' && (
                <ProfileDetailPanel
                  mode={detailMode}
                  name={detailName}
                  rules={detailRules}
                  questionCount={detailQuestionCount}
                  dirty={detailDirty}
                  saving={detailSaving}
                  loading={loading}
                  categories={categories}
                  tags={tags}
                  onNameChange={(v) => { setDetailName(v); setDetailDirty(true); }}
                  onRulesChange={handleDetailRuleChange}
                  onQuestionCountChange={(v) => { setDetailQuestionCount(v); setDetailDirty(true); }}
                  onSave={handleSaveDetail}
                  onStartWithSave={handleStartWithDetail}
                  onDelete={detailMode !== 'none' && detailMode !== 'new' ? () => handleDeleteProfile(detailMode) : undefined}
                />
              )}

              {step === 'setup' && reviewType === 'sr' && (
                <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-6">间隔重复复习</h1>
                  <button
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    onClick={handleStartSR}
                    disabled={srLoading}
                  >
                    {srLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {srLoading ? '加载中...' : '开始复习'}
                  </button>
                </div>
              )}

              {step === 'quiz' && reviewType === 'ai' && session && currentItem && (
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-4">
                    <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                      <span>进度: {answeredCount} / {totalCount}</span>
                      <span>{Math.round((answeredCount / totalCount) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${(answeredCount / totalCount) * 100}%` }}
                      />
                    </div>
                    {/* Question dots */}
                    <div className="flex justify-center gap-1 mt-3 flex-wrap">
                      {session.items.map((item, idx) => {
                        const status = getItemStatus(item);
                        return (
                          <button
                            key={item.itemId}
                            onClick={() => handleJumpToItem(idx)}
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                              idx === currentIndex
                                ? 'ring-2 ring-primary-500 ring-offset-1'
                                : ''
                            } ${
                              status === 'remembered' ? 'bg-green-100 dark:bg-green-900/30' :
                              status === 'fuzzy' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                              status === 'forgot' ? 'bg-red-100 dark:bg-red-900/30' :
                              'bg-gray-100 dark:bg-dark-700'
                            }`}
                            title={`第${idx + 1}题`}
                          >
                            {status === 'remembered' ? (
                              <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                            ) : status === 'fuzzy' ? (
                              <Circle className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                            ) : status === 'forgot' ? (
                              <XCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
                            ) : (
                              <span className="text-xs text-gray-500 dark:text-gray-400">{idx + 1}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={handlePrev}
                      disabled={currentIndex === 0}
                      className="flex items-center gap-1 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      上一题
                    </button>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      第 {currentIndex + 1} / {session.items.length} 题
                    </span>
                    <button
                      onClick={handleNext}
                      disabled={currentIndex + 1 >= session.items.length && !session.items[currentIndex]?.mastery}
                      className="flex items-center gap-1 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {currentIndex + 1 >= session.items.length ? '完成' : '下一题'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Question */}
                  <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6">
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      {currentItem.question}
                    </p>

                    {/* Original Memo Content - only show after answering */}
                    {feedback && (
                      <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                          原始笔记
                        </h3>
                        <p className="text-sm text-blue-700 dark:text-blue-400 whitespace-pre-wrap">
                          {currentItem.memoContent || '暂无内容'}
                        </p>
                      </div>
                    )}

                    {!feedback ? (
                      <>
                        <textarea
                          className="w-full bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg px-4 py-2 h-32 mb-4 text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none"
                          placeholder="输入你的回答..."
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                        />
                        <div className="flex gap-3">
                          <button
                            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            onClick={() => handleSubmitAnswer(false)}
                            disabled={loading || !answer.trim()}
                          >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            提交回答
                          </button>
                          <button
                            className="px-4 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                            onClick={handleForgot}
                            disabled={loading}
                          >
                            忘记了
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className={`font-semibold text-lg ${masteryColor(feedback.mastery)}`}>
                          {masteryLabel(feedback.mastery)}
                        </div>
                        <div className="text-sm bg-gray-50 dark:bg-dark-700 rounded-lg p-3 text-gray-700 dark:text-gray-300">
                          {feedback.aiFeedback}
                        </div>
                        {currentItem.userAnswer && currentItem.userAnswer !== '' && (
                          <div className="text-sm border-t border-gray-200 dark:border-dark-700 pt-3 mt-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">你的回答:</p>
                            <p className="text-gray-700 dark:text-gray-300">{currentItem.userAnswer}</p>
                          </div>
                        )}
                        <button
                          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors"
                          onClick={handleNext}
                        >
                          {currentIndex + 1 >= session.items.length ? '完成回顾' : '下一题'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Spaced Repetition Quiz */}
              {step === 'quiz' && reviewType === 'sr' && currentSRCard && (
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-4">
                    <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                      <span>进度: {srCurrentIndex + 1} / {srCards.length}</span>
                      <span>{Math.round(((srCurrentIndex + 1) / srCards.length) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${((srCurrentIndex + 1) / srCards.length) * 100}%` }}
                      />
                    </div>
                    {/* Card dots */}
                    <div className="flex justify-center gap-1 mt-3 flex-wrap">
                      {srCards.map((card, idx) => (
                        <button
                          key={card.cardId}
                          onClick={() => setSrCurrentIndex(idx)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                            idx === srCurrentIndex
                              ? 'ring-2 ring-primary-500 ring-offset-1'
                              : idx < srCurrentIndex
                              ? 'bg-green-100 dark:bg-green-900/30'
                              : 'bg-gray-100 dark:bg-dark-700'
                          }`}
                          title={`第${idx + 1}张`}
                        >
                          {idx < srCurrentIndex ? (
                            <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-gray-400">{idx + 1}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Daily Limit Info Message */}
                  {srTotalDue > srDailyLimit && srDailyLimit > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        今日已加载 <span className="font-medium">{srDailyLimit}</span> 张，还有{' '}
                        <span className="font-medium">{srTotalDue - srDailyLimit}</span> 张待复习
                      </p>
                    </div>
                  )}

                  {/* Memo Content - Flip Card */}
                  <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6">
                    <div className="perspective-1000">
                      <div
                        className={`transition-transform duration-400 ease-in-out transform-style-3d ${
                          srCardFlipped ? 'rotate-y-180' : ''
                        }`}
                        style={{
                          transformStyle: 'preserve-3d',
                          transform: srCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        }}
                      >
                        {/* Card Front */}
                        <div
                          className="backface-hidden"
                          style={{ backfaceVisibility: 'hidden' }}
                        >
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-3">
                            {currentSRCard.memo.title}
                          </h3>
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                              {currentSRCard.memo.content.slice(0, 200)}
                              {currentSRCard.memo.content.length > 200 ? '...' : ''}
                            </p>
                          </div>

                          {/* Show Answer Button */}
                          <div className="mt-6">
                            <button
                              onClick={() => setSrCardFlipped(true)}
                              className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                            >
                              显示答案
                            </button>
                          </div>
                        </div>

                        {/* Card Back (Answer) */}
                        <div
                          className="backface-hidden absolute inset-0"
                          style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                          }}
                        >
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-3">
                            {currentSRCard.memo.title}
                          </h3>
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                              {currentSRCard.memo.content}
                            </p>
                          </div>

                          {/* 4 Self-Rating Buttons */}
                          <div className="mt-6 grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleSRReview('mastered')}
                              disabled={srLoading}
                              className="px-3 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-50"
                            >
                              完全记住
                            </button>
                            <button
                              onClick={() => handleSRReview('remembered')}
                              disabled={srLoading}
                              className="px-3 py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-sm disabled:opacity-50"
                            >
                              记住了
                            </button>
                            <button
                              onClick={() => handleSRReview('fuzzy')}
                              disabled={srLoading}
                              className="px-3 py-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-medium rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors text-sm disabled:opacity-50"
                            >
                              模糊
                            </button>
                            <button
                              onClick={() => handleSRReview('forgot')}
                              disabled={srLoading}
                              className="px-3 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm disabled:opacity-50"
                            >
                              忘记了
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Review Summary */}
              {step === 'summary' && reviewType === 'ai' && finalSession && (
                <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">回顾完成</h2>
                  <p className="text-5xl font-bold text-primary-600 dark:text-primary-400 mb-6">
                    {finalScore} 分
                  </p>
                  <div className="space-y-2 mb-6">
                    {finalSession.items.map((item, i) => (
                      <div key={item.itemId} className="flex justify-between text-sm border-b border-gray-200 dark:border-dark-700 py-2">
                        <span className="text-gray-600 dark:text-gray-400">第 {i + 1} 题</span>
                        <span className={masteryColor(item.mastery)}>{masteryLabel(item.mastery)}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors"
                    onClick={() => {
                      setStep('setup');
                      setSession(null);
                      setFinalScore(null);
                      setFinalSession(null);
                      setSelectedHistorySession(null);
                      setReviewType('ai');
                    }}
                  >
                    再来一次
                  </button>
                </div>
              )}

              {/* Spaced Repetition Summary - Empty State */}
              {step === 'summary' && reviewType === 'sr' && srCards.length === 0 && (
                <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6 text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">今日无需复习，继续保持！</h2>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    全部笔记都已复习完毕，记得明天再来！
                  </p>

                  {/* Import button - only show if no cards have been imported yet */}
                  {srTotalCards === 0 && (
                    <button
                      onClick={handleImportExistingMemos}
                      disabled={srImporting}
                      className="mb-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors disabled:opacity-50"
                    >
                      {srImporting ? '导入中...' : '导入现有笔记'}
                    </button>
                  )}

                  <button
                    className="bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors"
                    onClick={() => {
                      setStep('setup');
                      setSrCards([]);
                      setSkippedCards([]);
                      setSrCurrentIndex(0);
                    }}
                  >
                    返回
                  </button>
                </div>
              )}

              {/* Spaced Repetition Summary - Completed */}
              {step === 'summary' && reviewType === 'sr' && srCards.length > 0 && (
                <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6 text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">今日复习完成</h2>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    已复习 {srCards.length} 张卡片
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-6 max-w-sm mx-auto">
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{srStats.mastered}</div>
                      <div className="text-sm text-purple-600 dark:text-purple-400">完全记住</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{srStats.remembered}</div>
                      <div className="text-sm text-green-600 dark:text-green-400">记住了</div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{srStats.fuzzy}</div>
                      <div className="text-sm text-yellow-600 dark:text-yellow-400">模糊</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">{srStats.forgot}</div>
                      <div className="text-sm text-red-600 dark:text-red-400">忘记了</div>
                    </div>
                  </div>
                  <button
                    className="bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors"
                    onClick={() => {
                      setStep('setup');
                      setSrCards([]);
                      setSkippedCards([]);
                      setSrCurrentIndex(0);
                    }}
                  >
                    返回
                  </button>
                </div>
              )}
            </div>
          </div>

        </main>
        </div>
      </div>
    </Layout>
  );
});

export default ReviewPage;
