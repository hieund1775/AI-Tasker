import { useState, useEffect } from "react";
import { useParams } from "react-router";
import {
  ArrowLeft,
  FileText,
  DollarSign,
  Calendar,
  User,
  Briefcase,
} from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { getProposalStatusConfig } from "../../lib/proposalStatusConfig.js";
import api from "../../../services/api.js";

function getStatusConfig(status) {
  return (
    getProposalStatusConfig(status) || {
      label: status,
      icon: FileText,
      className: "bg-gray-100 text-gray-700",
    }
  );
}

function DetailSection({ title, children, className = "" }) {
  return (
    <div
      className={`border-b border-gray-100 last:border-b-0 py-6 first:pt-0 ${className}`}
    >
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function ProposalDetail() {
  const { id } = useParams();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchProposalDetail() {
      try {
        const data = await api.proposals.getById(id);
        setProposal(data);
      } catch (err) {
        setError("Không thể tải chi tiết báo giá.");
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchProposalDetail();
  }, [id]);

  if (loading)
    return <div className="p-8 text-center text-gray-500">Đang tải...</div>;
  if (error || !proposal)
    return (
      <div className="p-8 text-center text-red-500">
        {error || "Không tìm thấy"}
      </div>
    );

  const statusCfg = getStatusConfig(proposal.status || "pending");
  const StatusIcon = statusCfg.icon;

  // SỬA: Đặt tên biến khớp với JSX bên dưới là projectInfo và clientInfo
  const projectInfo = proposal.project || {};
  const clientInfo = proposal.client || {};

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BackButton fallback="/expert/proposals" className="mb-6">
        Back to My Proposals
      </BackButton>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-3">
                <FileText className="w-4 h-4" /> Proposal Details
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                {proposal.proposalTitle || projectInfo.title || "Proposal"}
              </h1>

              {/* SỬA: Dùng projectInfo và clientInfo */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 text-sm text-gray-500">
                {projectInfo.title && (
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    Project:{" "}
                    <span className="font-medium text-gray-700">
                      {projectInfo.title}
                    </span>
                  </span>
                )}
                {clientInfo.name && (
                  <span className="inline-flex items-center gap-1.5">
                    <User className="w-4 h-4 text-gray-400" />
                    Client:{" "}
                    <span className="font-medium text-gray-700">
                      {clientInfo.name}
                    </span>
                  </span>
                )}
                {projectInfo.budget != null && (
                  <span className="inline-flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    Budget: <MoneyDisplay amount={projectInfo.budget} />
                  </span>
                )}
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusCfg.className}`}
              >
                <StatusIcon className="w-4 h-4" /> {statusCfg.label}
              </span>
            </div>
          </div>
        </div>

        <div className="p-8">
          <DetailSection title="Professional Introduction">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {proposal.professionalIntro || "No introduction provided."}
            </p>
          </DetailSection>
          {/* ... các DetailSection còn lại giữ nguyên ... */}
        </div>
      </div>
    </div>
  );
}
