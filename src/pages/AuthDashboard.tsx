import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MobileHeader } from "../components/MobileHeader";
import { StickyAction } from "../components/StickyAction";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Gauge } from "../components/Gauge";
import { Icon } from "../components/Icon";
import {
  computeAuthScore,
  RECEIPT_WEIGHT,
  PHOTO_WEIGHT,
  SNS_WEIGHT,
} from "../lib/scoring";
import type {
  EvidenceStatus,
  EvidenceType,
  PhotoResult,
  ReceiptResult,
  SnsResult,
} from "../data/types";
import { auth as authApi } from "../lib/api";
import { useApp } from "../state/AppContext";

interface EvidenceMeta {
  type: EvidenceType;
  title: string;
  description: string;
  icon: string;
  weight: number;
  durationMs: number;
}

const EVIDENCE_META: EvidenceMeta[] = [
  {
    type: "receipt",
    title: "구매 영수증",
    description: "OCR로 사업자번호·구매일·품목을 자동 추출합니다.",
    icon: "receipt_long",
    weight: RECEIPT_WEIGHT,
    durationMs: 1600,
  },
  {
    type: "photo",
    title: "실사용 사진",
    description: "Vision AI로 마모도·잔량·배경을 분석합니다.",
    icon: "photo_camera",
    weight: PHOTO_WEIGHT,
    durationMs: 2000,
  },
  {
    type: "sns",
    title: "SNS 후기 링크",
    description: "자발적 추천 어조의 감성 분석을 진행합니다.",
    icon: "link",
    weight: SNS_WEIGHT,
    durationMs: 1400,
  },
];

const ReceiptResultCard = ({ data }: { data: ReceiptResult }) => (
  <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 space-y-2">
    <div className="flex justify-between text-caption">
      <span className="text-on-surface-variant">매장</span>
      <span className="text-on-surface font-medium">{data.merchant}</span>
    </div>
    <div className="flex justify-between text-caption">
      <span className="text-on-surface-variant">사업자번호</span>
      <span className="text-on-surface font-medium">{data.businessNumber}</span>
    </div>
    <div className="flex justify-between text-caption">
      <span className="text-on-surface-variant">구매일</span>
      <span className="text-on-surface font-medium">{data.purchaseDate}</span>
    </div>
    <div className="flex justify-between text-caption">
      <span className="text-on-surface-variant">품목</span>
      <span className="text-on-surface font-medium text-right max-w-[60%]">
        {data.item}
      </span>
    </div>
    <div className="flex justify-between text-caption">
      <span className="text-on-surface-variant">결제</span>
      <span className="text-on-surface font-medium">{data.amount}</span>
    </div>
  </div>
);

const PhotoResultCard = ({ data }: { data: PhotoResult }) => (
  <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 space-y-3">
    <div className="relative h-32 rounded-md bg-gradient-to-br from-surface-container-high to-surface-dim flex items-center justify-center overflow-hidden">
      <svg width="80" height="100" viewBox="0 0 80 100" className="text-primary/40">
        <rect x="20" y="10" width="40" height="80" rx="4" fill="currentColor" />
        <rect x="28" y="20" width="24" height="40" rx="2" fill="white" opacity="0.4" />
      </svg>
      <div className="absolute inset-3 border-2 border-secondary rounded-md pointer-events-none" />
      <span className="absolute top-2 left-2 bg-secondary text-on-secondary text-[10px] font-medium px-2 py-0.5 rounded">
        {data.detectedProduct} · {(data.confidence * 100).toFixed(0)}%
      </span>
    </div>
    <div className="grid grid-cols-2 gap-2 text-caption">
      <div className="bg-surface-container-lowest border border-outline-variant rounded p-2">
        <div className="text-on-surface-variant">마모도</div>
        <div className="text-on-surface font-semibold">
          {(data.wearScore * 100).toFixed(0)}%
        </div>
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant rounded p-2">
        <div className="text-on-surface-variant">잔량</div>
        <div className="text-on-surface font-semibold">{data.remainingPct}%</div>
      </div>
    </div>
    <div className="text-caption text-on-surface-variant">
      <span className="text-on-surface font-medium">배경:</span> {data.background}
    </div>
  </div>
);

const SnsResultCard = ({ data }: { data: SnsResult }) => (
  <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-caption text-on-surface-variant">감성 점수</span>
      <span className="font-headline-md text-secondary">{data.sentimentScore}</span>
    </div>
    <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
      <div
        className="h-full bg-secondary"
        style={{ width: `${data.sentimentScore}%` }}
      />
    </div>
    <div className="flex flex-wrap gap-1.5">
      {data.keywords.map((k) => (
        <span
          key={k}
          className="px-2 py-0.5 rounded-full bg-secondary-container/30 text-on-secondary-container text-[11px] font-medium"
        >
          #{k}
        </span>
      ))}
    </div>
  </div>
);

interface EvidenceResults {
  receipt?: ReceiptResult;
  photo?: PhotoResult;
  sns?: SnsResult;
}

const renderResult = (type: EvidenceType, results: EvidenceResults) => {
  if (type === "receipt" && results.receipt) return <ReceiptResultCard data={results.receipt} />;
  if (type === "photo" && results.photo) return <PhotoResultCard data={results.photo} />;
  if (type === "sns" && results.sns) return <SnsResultCard data={results.sns} />;
  return null;
};

const AuthDashboard = () => {
  const navigate = useNavigate();
  const { setAuthScore } = useApp();
  const [status, setStatus] = useState<Record<EvidenceType, EvidenceStatus>>({
    receipt: "idle",
    photo: "idle",
    sns: "idle",
  });
  const [results, setResults] = useState<EvidenceResults>({});
  const [snsUrl, setSnsUrl] = useState("");

  const score = useMemo(() => computeAuthScore(status), [status]);

  useEffect(() => {
    setAuthScore(score);
  }, [score, setAuthScore]);

  // Demo placeholder file. Real backend uses multipart/form-data uploads.
  const placeholderFile = (name: string) => new File([], name, { type: "image/png" });

  const runScore = async (type: EvidenceType) => {
    if (status[type] === "loading") return;
    setStatus((prev) => ({ ...prev, [type]: "loading" }));
    try {
      if (type === "receipt") {
        const data = await authApi.scoreReceipt(placeholderFile("receipt.png"));
        setResults((prev) => ({ ...prev, receipt: data }));
      } else if (type === "photo") {
        const data = await authApi.scorePhoto(placeholderFile("photo.png"));
        setResults((prev) => ({ ...prev, photo: data }));
      } else {
        const data = await authApi.scoreSns(snsUrl || "https://www.instagram.com/demo/");
        setResults((prev) => ({ ...prev, sns: data }));
      }
      setStatus((prev) => ({ ...prev, [type]: "done" }));
    } catch (err) {
      console.error(err);
      setStatus((prev) => ({ ...prev, [type]: "idle" }));
    }
  };

  const anyDone =
    status.receipt === "done" || status.photo === "done" || status.sns === "done";

  return (
    <div className="flex flex-col min-h-full">
      <MobileHeader
        title="사용자 인증"
        view="influencer"
        subtitle="진짜 사용자 인증 스코어"
        right={
          <Link
            to="/"
            aria-label="처음으로"
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface-variant"
          >
            <Icon name="home" />
          </Link>
        }
      />

      <main className="flex-1 px-4 py-4 pb-24 space-y-4">
        {/* Score gauge card */}
        <Card className="p-lg flex flex-col items-center text-center">
          <span className="font-label-sm text-label-sm text-on-surface-variant mb-3">
            인증 스코어 (가중합)
          </span>
          <Gauge value={score.total} label="100점 만점" />
          <div className="mt-md flex flex-col items-center gap-2">
            {score.tier !== "None" ? (
              <Badge variant="tier" tier={score.tier} icon="workspace_premium">
                {score.tier} 등급
              </Badge>
            ) : (
              <Badge variant="neutral">미인증</Badge>
            )}
            {score.certified && (
              <Badge variant="certified-real-user">
                Re:Pitch Certified Real User
              </Badge>
            )}
          </div>
        </Card>

        {/* Score composition */}
        <Card className="p-lg">
          <h2 className="font-label-sm text-label-sm text-on-surface-variant mb-3">
            점수 구성
          </h2>
          <div className="space-y-3">
            {[
              {
                label: "구매 영수증",
                base: score.receiptScore,
                weight: RECEIPT_WEIGHT,
                done: status.receipt === "done",
              },
              {
                label: "실사용 사진",
                base: score.photoScore,
                weight: PHOTO_WEIGHT,
                done: status.photo === "done",
              },
              {
                label: "SNS 후기",
                base: score.snsScore,
                weight: SNS_WEIGHT,
                done: status.sns === "done",
              },
            ].map((item) => {
              const contribution = item.base * item.weight;
              const pct = (item.base / 100) * 100;
              return (
                <div key={item.label}>
                  <div className="flex justify-between font-label-sm text-label-sm mb-1">
                    <span className="text-on-surface flex items-center gap-2">
                      {item.label}
                      <span className="text-on-surface-variant text-caption">
                        {Math.round(item.weight * 100)}%
                      </span>
                    </span>
                    <span className="text-on-surface font-medium">
                      {item.done ? `${Math.round(contribution)}점` : "대기"}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                    <motion.div
                      className={`h-full ${item.done ? "bg-primary" : "bg-surface-container-highest"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.done ? pct : 0}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="font-caption text-caption text-on-surface-variant mt-3">
            교차검증: {anyDone ? "구매일과 SNS 게시일 일치 ✓" : "최소 1개 자료 업로드 시 검증 시작"}
          </p>
        </Card>

        {/* Evidence cards stacked */}
        {EVIDENCE_META.map((meta) => {
          const s = status[meta.type];
          return (
            <Card key={meta.type} className="p-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-on-primary-fixed-variant shrink-0">
                  <Icon name={meta.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-label-sm text-label-sm text-on-surface">
                    {meta.title}
                  </h3>
                  <p className="text-caption text-on-surface-variant truncate">
                    가중치 {Math.round(meta.weight * 100)}%
                  </p>
                </div>
                {s === "done" && (
                  <Icon name="check_circle" filled className="!text-secondary" />
                )}
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant mb-3">
                {meta.description}
              </p>

              {meta.type === "sns" && s === "idle" && (
                <input
                  value={snsUrl}
                  onChange={(e) => setSnsUrl(e.target.value)}
                  placeholder="https://instagram.com/p/..."
                  type="url"
                  className="w-full h-11 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none mb-3 font-body-md text-body-md"
                />
              )}

              {meta.type !== "sns" && s === "idle" && (
                <div className="border-2 border-dashed border-outline-variant rounded-lg h-24 flex flex-col items-center justify-center text-on-surface-variant text-caption mb-3 bg-surface-container-low">
                  <Icon name="upload_file" size={28} />
                  <span className="mt-1">파일을 끌어다 놓거나 탭</span>
                </div>
              )}

              {s === "done" && <div className="mb-3">{renderResult(meta.type, results)}</div>}

              <Button
                variant={s === "done" ? "ghost" : "secondary"}
                fullWidth
                disabled={s === "loading"}
                onClick={() => runScore(meta.type)}
                icon={
                  s === "loading"
                    ? "progress_activity"
                    : s === "done"
                      ? "check_circle"
                      : meta.type === "sns"
                        ? "psychology"
                        : "auto_fix_high"
                }
              >
                {s === "loading"
                  ? meta.type === "receipt"
                    ? "OCR 분석 중..."
                    : meta.type === "photo"
                      ? "Vision 분석 중..."
                      : "감성 분석 중..."
                  : s === "done"
                    ? "다시 분석"
                    : meta.type === "sns"
                      ? "분석 시작"
                      : "업로드 시뮬레이션"}
              </Button>
            </Card>
          );
        })}
      </main>

      <StickyAction>
        <Button
          variant="primary"
          fullWidth
          size="lg"
          iconRight="arrow_forward"
          disabled={!anyDone}
          onClick={() => navigate("/influencer/proposal")}
        >
          제안서 작성하기
        </Button>
      </StickyAction>
    </div>
  );
};

export default AuthDashboard;
