import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MobileHeader } from "../components/MobileHeader";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { useApp } from "../state/AppContext";
import { campaign as campaignApi, inbox as inboxApi } from "../lib/api";
import {
  binMetrics,
  type ContentPost,
  type DailyMetric,
  type Granularity,
} from "../data/campaignMetrics";
import type { SubmittedProposal } from "../data/types";

const formatNumber = (n: number) => n.toLocaleString("ko-KR");

const formatDelta = (n: number) => {
  if (n === 0) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString("ko-KR")}`;
};

const GRANULARITIES: Granularity[] = ["일간", "주간", "월간"];

const CampaignDashboard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { submittedProposals } = useApp();
  const [gran, setGran] = useState<Granularity>("일간");

  const [proposal, setProposal] = useState<SubmittedProposal | undefined>(
    id ? submittedProposals[id] : undefined,
  );
  const [dailyData, setDailyData] = useState<DailyMetric[]>([]);
  const [posts, setPosts] = useState<ContentPost[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([
      inboxApi.getProposal(id),
      campaignApi.getCampaignMetrics(id),
      campaignApi.getCampaignPosts(id),
    ]).then(([p, metrics, postList]) => {
      if (cancelled) return;
      if (p) setProposal(p);
      setDailyData(metrics);
      setPosts(postList);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const chartData = useMemo(() => binMetrics(dailyData, gran), [dailyData, gran]);
  const totals = useMemo(() => {
    const last = dailyData[dailyData.length - 1];
    return {
      views: last?.views ?? 0,
      likes: last?.likes ?? 0,
      comments: last?.comments ?? 0,
    };
  }, [dailyData]);

  if (!proposal) {
    return (
      <div className="flex flex-col min-h-full">
        <MobileHeader title="캠페인 성과" back view="brand" />
        <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
          <Icon name="analytics" size={48} className="!text-on-surface-variant" />
          <h1 className="font-headline-md text-headline-md text-on-surface mt-4">
            캠페인을 찾을 수 없습니다
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 mb-6">
            먼저 받은 제안서를 수락해야 캠페인 성과를 확인할 수 있습니다.
          </p>
          <Button variant="primary" icon="arrow_back" onClick={() => navigate("/brand/matching")}>
            매칭 화면으로 이동
          </Button>
        </main>
      </div>
    );
  }

  const inf = proposal.influencer;
  const acceptedAt = new Date(proposal.createdAt).toLocaleDateString("ko-KR");

  return (
    <div className="flex flex-col min-h-full bg-surface-container-low">
      <MobileHeader
        title="캠페인 성과"
        back={() => navigate(`/brand/inbox/${proposal.id}`)}
        view="brand"
        subtitle={`${proposal.brand.name} × @${inf.handle}`}
      />

      <main className="flex-1 px-4 py-4 space-y-4">
        {/* Header card */}
        <Card className="p-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-surface-container-high bg-surface-container shrink-0">
              <img
                src={inf.avatarUrl}
                alt={inf.handle}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-caption text-on-surface-variant mb-0.5">
                <Icon name="campaign" size={14} />
                <span>진행 중 · 수락 {acceptedAt}</span>
              </div>
              <h1 className="font-label-sm text-label-sm text-on-surface truncate">
                {proposal.brand.name} × @{inf.handle}
              </h1>
              <p className="text-caption text-on-surface-variant mt-0.5 truncate">
                {proposal.input.콘텐츠_포맷} · {proposal.input.플랫폼}
              </p>
            </div>
            <Badge variant="secondary" icon="trending_up">
              라이브
            </Badge>
          </div>
        </Card>

        {/* KPI summary — 2x2 on phone */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3">
            <div className="text-caption text-on-surface-variant">누적 조회수</div>
            <div className="font-headline-md text-headline-md text-on-surface mt-1">
              {formatNumber(totals.views)}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-caption text-on-surface-variant">누적 좋아요</div>
            <div className="font-headline-md text-headline-md text-on-surface mt-1">
              {formatNumber(totals.likes)}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-caption text-on-surface-variant">누적 댓글</div>
            <div className="font-headline-md text-headline-md text-on-surface mt-1">
              {formatNumber(totals.comments)}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-caption text-on-surface-variant">콘텐츠</div>
            <div className="font-headline-md text-headline-md text-on-surface mt-1">
              {posts.length}건
            </div>
          </Card>
        </div>

        {/* Section 1 — chart */}
        <Card className="p-4">
          <div className="mb-3">
            <h2 className="font-label-sm text-label-sm text-on-surface">
              한눈에 보는 현황 그래프
            </h2>
            <p className="text-caption text-on-surface-variant mt-0.5">
              일·주·월 단위 누적 추이
            </p>
          </div>
          <div className="inline-flex bg-surface-container-low rounded-full p-1 mb-3 w-full">
            {GRANULARITIES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGran(g)}
                className={`flex-1 px-3 py-1.5 rounded-full font-label-sm text-label-sm transition-colors ${
                  gran === g
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="h-[260px] w-full -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#525252" }}
                  tickFormatter={(v: string) => v.slice(5)}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#525252" }}
                  width={40}
                  tickFormatter={(v: number) =>
                    v >= 1000000
                      ? `${(v / 1000000).toFixed(1)}M`
                      : v >= 1000
                        ? `${(v / 1000).toFixed(0)}K`
                        : `${v}`
                  }
                />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e5e5e5",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(v) => formatNumber(Number(v))}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="views"
                  name="조회수"
                  stroke="#000000"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="likes"
                  name="좋아요"
                  stroke="#525252"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="comments"
                  name="댓글"
                  stroke="#a3a3a3"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Section 2 — content posts as cards */}
        <Card className="p-4">
          <div className="mb-3">
            <h2 className="font-label-sm text-label-sm text-on-surface">
              콘텐츠 상태 추적
            </h2>
            <p className="text-caption text-on-surface-variant mt-0.5">
              개별 콘텐츠의 누적 지표와 일일 증감
            </p>
          </div>
          <div className="space-y-3">
            {posts.map((p) => (
              <div
                key={p.id}
                className="border border-outline-variant rounded-lg p-3 bg-surface-container-lowest"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-md overflow-hidden bg-surface-container shrink-0">
                    <img src={p.thumbnail} alt={p.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-label-sm text-label-sm text-on-surface truncate">
                      {p.title}
                    </div>
                    <div className="text-caption text-on-surface-variant">
                      {p.platform} · {p.publishedAt}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-caption">
                  <div className="bg-surface-container-low rounded p-2">
                    <div className="text-on-surface-variant">조회수</div>
                    <div className="font-label-sm text-on-surface">
                      {formatNumber(p.totalViews)}
                    </div>
                    <div className="text-secondary mt-0.5">
                      {formatDelta(p.todayViewsDelta)}
                    </div>
                  </div>
                  <div className="bg-surface-container-low rounded p-2">
                    <div className="text-on-surface-variant">좋아요</div>
                    <div className="font-label-sm text-on-surface">
                      {formatNumber(p.totalLikes)}
                    </div>
                    <div className="text-secondary mt-0.5">
                      {formatDelta(p.todayLikesDelta)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default CampaignDashboard;
