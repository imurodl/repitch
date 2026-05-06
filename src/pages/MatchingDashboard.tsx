import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MobileHeader } from "../components/MobileHeader";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { matching as matchingApi } from "../lib/api";
import { useApp } from "../state/AppContext";
import type {
  AgeBucket,
  BudgetTier,
  Category,
  FollowerBand,
  MatchedInfluencer,
  MatchingFilters,
  Tone,
} from "../data/types";

const CATEGORIES: Array<Category | "전체"> = [
  "전체",
  "뷰티",
  "패션",
  "식품",
  "헬스·피트니스",
  "라이프스타일",
  "전자기기",
  "앱서비스",
];
const AGES: Array<AgeBucket | "전체"> = ["전체", "10대", "20대", "30대", "40대 이상"];
const TONES: Array<Tone | "전체"> = ["전체", "정보전달형", "유머형", "감성형"];
const BUDGETS: Array<BudgetTier | "전체"> = [
  "전체",
  "100만원 미만",
  "100~300만원",
  "300~500만원",
  "500~1000만원",
  "1000만원 이상",
];
const FOLLOWER_BANDS: FollowerBand[] = [
  "전체",
  "나노 (1만 미만)",
  "마이크로 (1~10만)",
  "미드 (10~50만)",
  "메가 (50만+)",
];

const initialFilters: MatchingFilters = {
  category: "전체",
  age: "전체",
  tone: "전체",
  budget: "전체",
  followers: "전체",
};

const FilterSelect = <T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (v: T) => void;
}) => (
  <div>
    <label className="block font-label-sm text-label-sm text-on-surface mb-2">{label}</label>
    <div className="relative">
      <select
        className="w-full h-12 appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg pl-4 pr-10 focus:border-primary focus:ring-1 focus:ring-primary outline-none font-body-md text-body-md text-on-surface cursor-pointer"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <Icon
        name="expand_more"
        className="!absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none"
      />
    </div>
  </div>
);

const InfluencerCard = ({
  inf,
  onRequest,
  onSave,
  saved,
}: {
  inf: MatchedInfluencer;
  onRequest: (inf: MatchedInfluencer) => void;
  onSave: () => void;
  saved: boolean;
}) => {
  const reachLabel = inf.estimatedReach.toLocaleString("ko-KR");
  const followerLabel = inf.followers.toLocaleString("ko-KR");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
    >
      <Card accent="secondary" className="p-4 flex flex-col">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-surface-container-high shrink-0 bg-surface-container">
            <img
              src={inf.avatarUrl}
              alt={inf.handle}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-label-sm text-label-sm text-on-surface flex items-center gap-1 truncate">
              @{inf.handle}
              {inf.verified && (
                <Icon name="verified" filled className="!text-secondary" size={14} />
              )}
            </h3>
            <p className="text-caption text-on-surface-variant truncate">{inf.bio}</p>
          </div>
          <Badge variant="match-score">{inf.matchScore}점</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-caption mb-3">
          <div className="bg-surface-container-low rounded-lg p-2">
            <div className="text-on-surface-variant">팔로워</div>
            <div className="text-on-surface font-semibold">{followerLabel}</div>
          </div>
          <div className="bg-surface-container-low rounded-lg p-2">
            <div className="text-on-surface-variant">참여율</div>
            <div className="text-on-surface font-semibold">{inf.engagementRate}%</div>
          </div>
          <div className="bg-surface-container-low rounded-lg p-2">
            <div className="text-on-surface-variant">예상 도달</div>
            <div className="text-on-surface font-semibold">{reachLabel}</div>
          </div>
          <div className="bg-surface-container-low rounded-lg p-2">
            <div className="text-on-surface-variant">예상 전환율</div>
            <div className="text-on-surface font-semibold">{inf.estimatedCtr}%</div>
          </div>
        </div>

        {inf.reasons.length > 0 && (
          <div className="mb-3 space-y-1">
            {inf.reasons.slice(0, 3).map((r) => (
              <div key={r} className="flex items-start gap-2 text-caption text-on-surface-variant">
                <Icon name="check_circle" filled className="!text-secondary mt-0.5 shrink-0" size={14} />
                <span>{r}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="primary" fullWidth icon="send" onClick={() => onRequest(inf)}>
            제안 받기
          </Button>
          <Button
            variant={saved ? "primary" : "secondary"}
            icon={saved ? "bookmark" : "bookmark_add"}
            onClick={onSave}
            aria-label="저장"
          />
        </div>
      </Card>
    </motion.div>
  );
};

interface FilterModalProps {
  open: boolean;
  filters: MatchingFilters;
  onChange: (next: MatchingFilters) => void;
  onClose: () => void;
  onReset: () => void;
}

const FilterModal = ({ open, filters, onChange, onClose, onReset }: FilterModalProps) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] bg-on-surface/30 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className="bg-surface-container-lowest w-full max-w-[440px] rounded-t-3xl sm:rounded-3xl border-t border-outline-variant max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
            <button
              type="button"
              onClick={onReset}
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary"
            >
              초기화
            </button>
            <h3 className="font-label-sm text-label-sm text-on-surface">필터</h3>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface"
              aria-label="닫기"
            >
              <Icon name="close" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <FilterSelect
              label="카테고리"
              value={filters.category}
              options={CATEGORIES}
              onChange={(v) => onChange({ ...filters, category: v })}
            />
            <FilterSelect
              label="타겟 연령"
              value={filters.age}
              options={AGES}
              onChange={(v) => onChange({ ...filters, age: v })}
            />
            <FilterSelect
              label="원하는 톤앤매너"
              value={filters.tone}
              options={TONES}
              onChange={(v) => onChange({ ...filters, tone: v })}
            />
            <FilterSelect
              label="예산 구간"
              value={filters.budget}
              options={BUDGETS}
              onChange={(v) => onChange({ ...filters, budget: v })}
            />
            <FilterSelect
              label="팔로워 규모"
              value={filters.followers}
              options={FOLLOWER_BANDS}
              onChange={(v) => onChange({ ...filters, followers: v })}
            />
          </div>
          <div className="border-t border-outline-variant p-4">
            <Button variant="primary" fullWidth size="lg" onClick={onClose}>
              결과 보기
            </Button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const MatchingDashboard = () => {
  const navigate = useNavigate();
  const { selectInfluencer, submittedProposals } = useApp();
  const [filters, setFilters] = useState<MatchingFilters>(initialFilters);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [ranked, setRanked] = useState<MatchedInfluencer[]>([]);
  const [relaxed, setRelaxed] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    matchingApi
      .searchInfluencers({ filters, signal: ctrl.signal })
      .then((res) => {
        setRanked(res.items);
        setRelaxed(res.relaxed);
      })
      .catch((err) => {
        if ((err as DOMException).name !== "AbortError") console.error(err);
      });
    return () => ctrl.abort();
  }, [filters]);

  const proposalEntries = useMemo(
    () =>
      Object.values(submittedProposals).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    [submittedProposals],
  );
  const latestProposal = proposalEntries[0];

  const handleRequest = (inf: MatchedInfluencer) => {
    selectInfluencer(inf);
    setToast(`@${inf.handle}님께 협업 요청을 보냈어요`);
    setTimeout(() => setToast(null), 2400);
  };

  const handleReset = () => setFilters(initialFilters);

  // Active filter chips (skip "전체" values)
  const activeChips = [
    { key: "category", label: filters.category, isAll: filters.category === "전체" },
    { key: "age", label: filters.age, isAll: filters.age === "전체" },
    { key: "tone", label: filters.tone, isAll: filters.tone === "전체" },
    { key: "budget", label: filters.budget, isAll: filters.budget === "전체" },
    { key: "followers", label: filters.followers, isAll: filters.followers === "전체" },
  ].filter((c) => !c.isAll);

  return (
    <div className="flex flex-col min-h-full bg-surface-container-low">
      <MobileHeader
        title="AI 매칭"
        view="brand"
        right={
          <>
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface"
              aria-label="필터"
            >
              <Icon name="tune" />
            </button>
            <Link
              to="/"
              aria-label="처음으로"
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface-variant"
            >
              <Icon name="home" />
            </Link>
          </>
        }
      />

      <main className="flex-1 px-4 py-3 pb-24 space-y-3">
        {latestProposal && (
          <button
            type="button"
            onClick={() => navigate(`/brand/inbox/${latestProposal.id}`)}
            className="w-full flex items-center gap-3 bg-primary-container hover:bg-primary-container/80 active:scale-[0.99] transition rounded-2xl p-3 border border-primary/20 text-left"
          >
            <div className="shrink-0 w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center">
              <Icon name="mark_email_unread" size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-label-sm text-label-sm text-on-primary-container">
                새 제안 {proposalEntries.length}건이 도착했어요
              </div>
              <div className="text-caption text-on-primary-container/80 truncate">
                @{latestProposal.influencer.handle} · {latestProposal.brand.name}
              </div>
            </div>
            <Icon name="arrow_forward" size={20} className="!text-on-primary-container shrink-0" />
          </button>
        )}

        {/* Active filter chips */}
        <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          <span className="text-caption text-on-surface-variant shrink-0">필터:</span>
          {activeChips.length === 0 ? (
            <span className="text-caption text-on-surface-variant">전체</span>
          ) : (
            activeChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-[11px] font-medium shrink-0"
              >
                {chip.label}
              </span>
            ))
          )}
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="ml-auto text-caption text-primary font-medium shrink-0"
          >
            변경
          </button>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-caption text-on-surface-variant">
            추천 {ranked.length}명
          </p>
          <span className="text-caption text-on-surface-variant">
            XGBoost 모델 · 매칭 정확도 99%
          </span>
        </div>
        {relaxed && (
          <p className="text-caption text-on-surface-variant -mt-1">
            필터 조건에 맞는 결과가 적어 전체 추천을 표시합니다
          </p>
        )}

        {ranked.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
            <Icon name="search_off" size={48} />
            <p className="mt-4 font-body-md text-body-md">조건에 맞는 인플루언서가 없습니다.</p>
            <Button variant="ghost" onClick={handleReset} className="mt-3">
              필터 초기화
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {ranked.map((inf) => (
                <InfluencerCard
                  key={inf.id}
                  inf={inf}
                  saved={savedIds.has(inf.id)}
                  onRequest={handleRequest}
                  onSave={() =>
                    setSavedIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(inf.id)) next.delete(inf.id);
                      else next.add(inf.id);
                      return next;
                    })
                  }
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {savedIds.size > 0 && (
          <p className="font-caption text-caption text-on-surface-variant text-center pt-2">
            관심 저장 {savedIds.size}명
          </p>
        )}
      </main>

      <FilterModal
        open={filterOpen}
        filters={filters}
        onChange={setFilters}
        onClose={() => setFilterOpen(false)}
        onReset={handleReset}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            className="absolute left-4 right-4 bottom-20 z-40 pointer-events-none"
          >
            <div className="mx-auto max-w-[28rem] bg-on-surface text-surface px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
              <Icon name="check_circle" size={20} className="!text-secondary shrink-0" />
              <span className="font-label-sm text-label-sm">{toast}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MatchingDashboard;
