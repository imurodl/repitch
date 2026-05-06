import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MobileHeader } from "../components/MobileHeader";
import { StickyAction } from "../components/StickyAction";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { useApp } from "../state/AppContext";
import { inbox as inboxApi } from "../lib/api";
import type { SubmittedProposal } from "../data/types";

type Decision = "accept" | "negotiate" | "reject";

const ProposalBody = ({ proposal }: { proposal: SubmittedProposal }) => {
  const lines = proposal.body.split("\n");
  const sections: { heading: string; body: string }[] = [];
  let title = "";
  let current: { heading: string; body: string } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 && line.startsWith("Re:Pitch")) {
      title = lines[1] ?? "";
      i = 1;
      continue;
    }
    if (/^\d+\./.test(line.trim())) {
      if (current) sections.push(current);
      current = { heading: line.trim(), body: "" };
    } else if (current) {
      current.body += (current.body ? "\n" : "") + line;
    }
  }
  if (current) sections.push(current);

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
      <div className="border-b-2 border-on-surface pb-4 mb-5 text-center">
        <h1 className="font-headline-md text-headline-md text-on-surface mb-1">
          Re:Pitch 역제안서
        </h1>
        <p className="text-caption text-on-surface-variant">{title}</p>
      </div>
      <div className="space-y-5">
        {sections.map((s) => (
          <section key={s.heading}>
            <h3 className="font-label-sm text-label-sm text-primary mb-2 border-b border-surface-variant pb-1">
              {s.heading}
            </h3>
            <div className="font-body-md text-body-md text-on-surface leading-relaxed whitespace-pre-line">
              {s.body}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

const SuccessModal = ({
  proposal,
  onClose,
  onCampaign,
}: {
  proposal: SubmittedProposal;
  onClose: () => void;
  onCampaign: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] bg-on-surface/30 backdrop-blur-sm flex items-center justify-center p-4"
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: 16 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl max-w-[28rem] w-full p-lg text-center"
    >
      <div className="w-16 h-16 mx-auto rounded-full bg-secondary-container/40 border-2 border-secondary flex items-center justify-center mb-md">
        <Icon name="celebration" filled className="!text-secondary" size={32} />
      </div>
      <h2 className="font-headline-md text-headline-md text-on-surface mb-2">
        캠페인이 매칭되었습니다!
      </h2>
      <p className="font-body-md text-body-md text-on-surface-variant mb-md">
        {proposal.brand.name}이 @{proposal.influencer.handle}님의 제안을 수락했습니다.
      </p>
      <div className="bg-surface-container-low rounded-lg p-4 mb-md text-left space-y-2">
        <div className="flex justify-between text-caption">
          <span className="text-on-surface-variant">예상 도달</span>
          <span className="text-on-surface font-medium">
            {proposal.estimatedReach.toLocaleString("ko-KR")}명
          </span>
        </div>
        <div className="flex justify-between text-caption">
          <span className="text-on-surface-variant">예상 CTR</span>
          <span className="text-on-surface font-medium">{proposal.estimatedCtr}%</span>
        </div>
        <div className="flex justify-between text-caption">
          <span className="text-on-surface-variant">계약 보수</span>
          <span className="text-on-surface font-medium">{proposal.input.보수}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="ghost" fullWidth onClick={onClose}>
          닫기
        </Button>
        <Button variant="primary" fullWidth icon="analytics" onClick={onCampaign}>
          캠페인 보기
        </Button>
      </div>
    </motion.div>
  </motion.div>
);

interface SectionProps {
  title: string;
  icon: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const CollapsibleSection = ({ title, icon, defaultOpen = false, children }: SectionProps) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-surface-container-low"
      >
        <Icon name={icon} className="!text-primary" />
        <span className="font-label-sm text-label-sm text-on-surface flex-1">{title}</span>
        <Icon
          name="expand_more"
          className={`!text-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-4 pb-4 border-t border-outline-variant pt-4">{children}</div>}
    </Card>
  );
};

const BrandInbox = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProposal } = useApp();
  const [decision, setDecision] = useState<Decision | null>(null);
  // Source of truth: API. Cache fallback: AppContext (filled by ProposalGenerator).
  const [proposal, setProposal] = useState<SubmittedProposal | null>(
    id ? getProposal(id) : null,
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    inboxApi.getProposal(id).then((p) => {
      if (!cancelled && p) setProposal(p);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!proposal) {
    return (
      <div className="flex flex-col min-h-full">
        <MobileHeader title="받은 제안" back view="brand" />
        <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
          <Icon name="inbox" size={48} className="!text-on-surface-variant" />
          <h1 className="font-headline-md text-headline-md text-on-surface mt-4">
            제안서를 찾을 수 없습니다
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 mb-6">
            세션이 만료되었거나 직접 URL에 접근하셨습니다.
          </p>
          <Button variant="primary" icon="restart_alt" onClick={() => navigate("/brand/matching")}>
            매칭 화면으로 돌아가기
          </Button>
        </main>
      </div>
    );
  }

  const inf = proposal.influencer;

  return (
    <div className="flex flex-col min-h-full bg-surface-container-low">
      <MobileHeader
        title="받은 제안"
        back={() => navigate("/brand/matching")}
        view="brand"
        subtitle={`${proposal.brand.name} · ${new Date(proposal.createdAt).toLocaleDateString("ko-KR")}`}
      />

      <main className="flex-1 px-4 py-4 pb-24 space-y-3">
        {/* Influencer profile snippet (always visible) */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-surface-container-high bg-surface-container shrink-0">
              <img
                src={inf.avatarUrl}
                alt={inf.handle}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-label-sm text-label-sm text-on-surface flex items-center gap-1">
                @{inf.handle}
                {inf.verified && (
                  <Icon name="verified" filled className="!text-secondary" size={14} />
                )}
              </h3>
              <p className="text-caption text-on-surface-variant truncate">{inf.bio}</p>
            </div>
          </div>
          <Badge variant="certified-real-user" className="mb-3">
            Re:Pitch Certified Real User
          </Badge>
          <div className="grid grid-cols-2 gap-2 text-caption">
            <div className="bg-surface-container-low rounded-lg p-2">
              <div className="text-on-surface-variant">팔로워</div>
              <div className="text-on-surface font-semibold">
                {inf.followers.toLocaleString("ko-KR")}
              </div>
            </div>
            <div className="bg-surface-container-low rounded-lg p-2">
              <div className="text-on-surface-variant">참여율</div>
              <div className="text-on-surface font-semibold">{inf.engagementRate}%</div>
            </div>
            <div className="bg-surface-container-low rounded-lg p-2">
              <div className="text-on-surface-variant">예상 도달</div>
              <div className="text-on-surface font-semibold">
                {proposal.estimatedReach.toLocaleString("ko-KR")}
              </div>
            </div>
            <div className="bg-surface-container-low rounded-lg p-2">
              <div className="text-on-surface-variant">예상 CTR</div>
              <div className="text-on-surface font-semibold">{proposal.estimatedCtr}%</div>
            </div>
          </div>
        </Card>

        {/* Collapsible sections */}
        <CollapsibleSection title="제안 조건" icon="local_offer" defaultOpen>
          <div className="space-y-2 text-caption">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">콘텐츠 포맷</span>
              <span className="text-on-surface font-medium">{proposal.input.콘텐츠_포맷}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">플랫폼</span>
              <span className="text-on-surface font-medium">{proposal.input.플랫폼}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">강조 타겟</span>
              <span className="text-on-surface font-medium text-right max-w-[60%]">
                {proposal.input.타겟_소구점}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">희망 보수</span>
              <span className="text-on-surface font-medium">{proposal.input.보수}</span>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="제안서 본문" icon="description" defaultOpen>
          <ProposalBody proposal={proposal} />
        </CollapsibleSection>
      </main>

      <StickyAction>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="ghost"
            fullWidth
            onClick={() => {
              setDecision("reject");
              if (proposal) inboxApi.updateProposalStatus(proposal.id, "rejected").catch(console.error);
            }}
          >
            거절
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              setDecision("negotiate");
              if (proposal) inboxApi.updateProposalStatus(proposal.id, "negotiating").catch(console.error);
            }}
          >
            협의
          </Button>
          <Button
            variant="primary"
            fullWidth
            icon="check_circle"
            onClick={() => {
              setDecision("accept");
              if (proposal) inboxApi.updateProposalStatus(proposal.id, "accepted").catch(console.error);
            }}
          >
            수락
          </Button>
        </div>
      </StickyAction>

      <AnimatePresence>
        {decision === "accept" && (
          <SuccessModal
            proposal={proposal}
            onClose={() => setDecision(null)}
            onCampaign={() => navigate(`/brand/campaign/${proposal.id}`)}
          />
        )}
        {decision === "negotiate" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-on-surface/30 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDecision(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-surface-container-lowest rounded-xl border border-outline-variant max-w-[28rem] w-full p-lg text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <Icon name="forum" filled className="!text-primary mb-3" size={32} />
              <h2 className="font-headline-md text-headline-md text-on-surface mb-2">
                협의 요청을 보냈습니다
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant mb-md">
                인플루언서에게 변경 사항 협의 메시지가 전송됩니다.
              </p>
              <Button variant="primary" fullWidth onClick={() => setDecision(null)}>
                확인
              </Button>
            </motion.div>
          </motion.div>
        )}
        {decision === "reject" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-on-surface/30 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDecision(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-surface-container-lowest rounded-xl border border-outline-variant max-w-[28rem] w-full p-lg text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <Icon name="block" className="!text-error mb-3" size={32} />
              <h2 className="font-headline-md text-headline-md text-on-surface mb-2">
                제안을 거절합니다
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant mb-md">
                인플루언서에게 정중하게 거절 메시지가 전달됩니다.
              </p>
              <Button variant="ghost" fullWidth onClick={() => setDecision(null)}>
                확인
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BrandInbox;
