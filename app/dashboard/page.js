'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import LogoutButton from '@/components/LogoutButton';
import UserProfileInitModal from '@/components/UserProfileInitModal';
import UserProfileModal from '@/components/UserProfileModal';

// Menu items configuration
const menuItems = [
  { id: 'confirmation', label: 'Collab Confirmation', icon: '✅' },
  { id: 'application', label: 'Collab Application', icon: '📝' },
  { id: 'draft', label: 'Draft Submission', icon: '📄' },
  { id: 'video', label: 'Video Submission', icon: '🎬' },
  { id: 'settlement', label: 'Brand Settlement', icon: '💰' },
];

// Status labels mapping
const statusLabels = {
  pending_application: 'Pending Application',
  influencer_applied: 'Applied',
  influencer_dislike: 'Not Interested',
  brand_accepted: 'Brand Accepted',
  brand_rejected: 'Brand Rejected',
  invited: 'Invited',
  influencer_accepted: 'Invitation Accepted',
  influencer_rejected: 'Invitation Rejected',
  draft_uploaded: 'Draft Submitted',
  video_approved: 'Video Approved',
  video_uploaded: 'Video Published',
  settled: 'Settled',
};

// 状态颜色映射
const statusColors = {
  pending_application: 'bg-gray-100 text-gray-800',
  influencer_applied: 'bg-blue-100 text-blue-800',
  influencer_dislike: 'bg-red-100 text-red-800',
  brand_accepted: 'bg-green-100 text-green-800',
  brand_rejected: 'bg-red-100 text-red-800',
  invited: 'bg-yellow-100 text-yellow-800',
  influencer_accepted: 'bg-green-100 text-green-800',
  influencer_rejected: 'bg-red-100 text-red-800',
  draft_uploaded: 'bg-purple-100 text-purple-800',
  video_approved: 'bg-indigo-100 text-indigo-800',
  video_uploaded: 'bg-orange-100 text-orange-800',
  settled: 'bg-green-100 text-green-800',
};

// 合作卡片组件
function CooperationCard({ cooperation: coop, activeTab, onUpdateStatus, updating, formData, onFormDataChange, onCheckProfile }) {
  const isUpdating = updating;
  const [showHistory, setShowHistory] = useState(false); // Control history display
  const [showCollabDetails, setShowCollabDetails] = useState(false); // Control collab details display
  const [showDeliverables, setShowDeliverables] = useState(false); // Control deliverables display

  // Handle collaboration application (requires profile check first)
  const handleApply = async () => {
    if (onCheckProfile) {
      const canProceed = await onCheckProfile();
      if (canProceed) {
        onUpdateStatus(coop.id, 'influencer_applied');
      }
    } else {
      onUpdateStatus(coop.id, 'influencer_applied');
    }
  };

  // Handle invitation acceptance (requires profile check first)
  const handleAccept = async () => {
    if (onCheckProfile) {
      const canProceed = await onCheckProfile();
      if (canProceed) {
        onUpdateStatus(coop.id, 'influencer_accepted');
      }
    } else {
      onUpdateStatus(coop.id, 'influencer_accepted');
    }
  };

  // Application section: show apply and dislike buttons
  const renderApplicationActions = () => {
    if (coop.status !== 'pending_application') return null;
    
    return (
      <div className="mt-4 flex gap-3">
        <button
          onClick={handleApply}
          disabled={isUpdating}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40"
        >
          {isUpdating ? 'Processing...' : 'Outreach'}
        </button>
        <button
          onClick={() => onUpdateStatus(coop.id, 'influencer_dislike')}
          disabled={isUpdating}
          className="flex-1 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isUpdating ? 'Processing...' : 'Dislike'}
        </button>
      </div>
    );
  };

  // Confirmation section: show accept and reject buttons
  const renderConfirmationActions = () => {
    if (coop.status !== 'invited') return null;
    
    return (
      <div className="mt-4 flex gap-3">
        <button
          onClick={handleAccept}
          disabled={isUpdating}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40"
        >
          {isUpdating ? 'Processing...' : 'Accept'}
        </button>
        <button
          onClick={() => onUpdateStatus(coop.id, 'influencer_rejected')}
          disabled={isUpdating}
          className="flex-1 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isUpdating ? 'Processing...' : 'Decline'}
        </button>
      </div>
    );
  };

  // Draft submission section: show form to upload draft link
  const renderDraftForm = () => {
    if (!['brand_accepted', 'influencer_accepted', 'draft_uploaded'].includes(coop.status)) return null;
    
    const handleSubmit = (e) => {
      e.preventDefault();
      if (!formData.draftLink) {
        alert('Please enter the draft link');
        return;
      }
      // If status is already draft_uploaded, keep status unchanged, only update link
      const targetStatus = coop.status === 'draft_uploaded' ? 'draft_uploaded' : 'draft_uploaded';
      onUpdateStatus(coop.id, targetStatus, {
        draftLink: formData.draftLink,
      });
    };

    // Build history items (currently only current record, can fetch full history from database in future)
    const historyItems = [];
    if (coop.draft_link || coop.brand_feedback) {
      historyItems.push({
        draftLink: coop.draft_link,
        brandFeedback: coop.brand_feedback,
      });
    }

    const hasHistory = historyItems.length > 0;

    return (
      <div className="mt-4 space-y-3">
        {/* History (collapsible) */}
        {hasHistory && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-sm font-medium text-gray-700 transition-colors"
            >
              <span>History</span>
              <svg
                className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showHistory && (
              <div className="p-4 bg-white space-y-4">
                {historyItems.map((item, index) => (
                  <div key={index} className="space-y-2 pb-4 border-b border-gray-100 last:border-b-0 last:pb-0">
                    {item.draftLink && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Video Draft {index + 1}:
                        </p>
                        <a
                          href={item.draftLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline break-all"
                        >
                          {item.draftLink}
                        </a>
                      </div>
                    )}
                    {item.brandFeedback && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Brand Feedback {index + 1}:
                        </p>
                        <p className="text-sm text-gray-600">{item.brandFeedback}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upload form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Video Draft Link *
            </label>
            <input
              type="url"
              value={formData.draftLink || ''}
              onChange={(e) => onFormDataChange({ ...formData, draftLink: e.target.value })}
              placeholder={coop.draft_link ? "Enter new draft link to update" : "https://example.com/draft"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isUpdating}
            className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40"
          >
            {isUpdating ? 'Updating...' : coop.status === 'draft_uploaded' ? 'Update Draft' : 'Submit Draft'}
          </button>
        </form>
      </div>
    );
  };

  // Published video submission section: show form to upload TikTok video link and spark code
  const renderVideoForm = () => {
    if (coop.status !== 'video_approved') return null;
    
    const handleSubmit = (e) => {
      e.preventDefault();
      if (!formData.videoLink) {
        alert('Please enter the TikTok video link');
        return;
      }
      if (!formData.sparkCode) {
        alert('Please enter the Spark code');
        return;
      }
      onUpdateStatus(coop.id, 'video_uploaded', {
        videoLink: formData.videoLink,
        sparkCode: formData.sparkCode,
      });
    };

    return (
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            TikTok Video Link *
          </label>
          <input
            type="url"
            value={formData.videoLink || coop.video_link || ''}
            onChange={(e) => onFormDataChange({ ...formData, videoLink: e.target.value })}
            placeholder="https://www.tiktok.com/@username/video/..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Spark Code *
          </label>
          <input
            type="text"
            value={formData.sparkCode || coop.spark_code || ''}
            onChange={(e) => onFormDataChange({ ...formData, sparkCode: e.target.value })}
            placeholder="Enter Spark code"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isUpdating}
          className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40"
        >
          {isUpdating ? 'Submitting...' : 'Submit Video'}
        </button>
      </form>
    );
  };

  // Brand settlement section: show settlement status
  const renderSettlementInfo = () => {
    if (!['video_uploaded', 'settled'].includes(coop.status)) return null;
    
    const hasDeliverables = coop.video_link || coop.spark_code;
    
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        {coop.status === 'video_uploaded' ? (
          <div className="flex items-center gap-2 text-orange-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Pending Brand Settlement</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-green-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Settlement Completed</span>
          </div>
        )}
        
        {/* Deliverables (collapsible) - Video link and Spark code */}
        {hasDeliverables && (
          <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDeliverables(!showDeliverables)}
              className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-sm font-medium text-gray-700 transition-colors"
            >
              <span>Deliverables</span>
              <svg
                className={`w-4 h-4 transition-transform ${showDeliverables ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showDeliverables && (
              <div className="p-4 bg-white space-y-3">
                {coop.video_link && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">Video Link: </span>
                    <div className="mt-1">
                      <a href={coop.video_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm break-all">
                        {coop.video_link}
                      </a>
                    </div>
                  </div>
                )}
                {coop.spark_code && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">Spark Code: </span>
                    <div className="mt-1">
                      <span className="text-sm text-gray-700">{coop.spark_code}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // 格式化日期显示
  const formatDateRange = () => {
    if (coop.windowStartDate && coop.windowDueDate) {
      // 如果日期是 Date 对象，格式化为 YYYY-MM-DD
      const formatDate = (date) => {
        if (date instanceof Date) {
          return date.toISOString().split('T')[0];
        }
        if (typeof date === 'string') {
          // 如果是字符串，尝试解析并格式化
          const d = new Date(date);
          if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
          }
          // 如果已经是 YYYY-MM-DD 格式，直接返回
          if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
            return date.split(' ')[0]; // 只取日期部分，忽略时间
          }
          return date;
        }
        return date;
      };
      return `${formatDate(coop.windowStartDate)} - ${formatDate(coop.windowDueDate)}`;
    }
    return null;
  };

  // 格式化核心卖点（从 JSON 数组格式解析）
  // 数据库中的 coreSellingPoints 字段是 JSON 数组格式，MySQL 会自动解析为数组
  const formatSellingPoints = () => {
    if (!coop.coreSellingPoints) return [];
    
    // 数据库返回的 JSON 字段已经是数组格式
    if (Array.isArray(coop.coreSellingPoints)) {
      return coop.coreSellingPoints.filter(point => point && point.trim());
    }
    
    // 如果不是数组（理论上不应该发生），返回空数组
    return [];
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-blue-100/50 p-4 sm:p-6 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {coop.businessName || coop.brand_name || 'Unnamed Brand'}
              </h3>
              {coop.productName && (
                <p className="text-sm text-gray-600 mb-2">
                  {coop.productName}
                </p>
              )}
              {coop.cooperation_title && (
                <p className="text-sm text-gray-600 mb-2">
                  {coop.cooperation_title}
                </p>
              )}
              
              {/* Fee, commission, and sample delivery - single line */}
              <div className="flex items-center gap-2 mt-3 mb-3 flex-wrap sm:flex-nowrap">
                {coop.flat_fee && (
                  <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 shadow-sm flex-shrink-0">
                    <span className="text-xs text-gray-600">Fee: </span>
                    <span className="text-sm font-bold text-green-700">
                      {typeof coop.flat_fee === 'number' ? `$${coop.flat_fee.toFixed(2)}` : `$${coop.flat_fee}`}
                    </span>
                  </div>
                )}
                {coop.commissionRate && (
                  <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm flex-shrink-0">
                    <span className="text-xs text-gray-600">Commission: </span>
                    <span className="text-sm font-bold text-blue-700">{coop.commissionRate}</span>
                  </div>
                )}
                {/* 寄样标识 */}
                {coop.sample_delivery !== undefined && coop.sample_delivery !== null && (
                  <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm flex-shrink-0">
                    <span className="text-xs text-gray-600">Sample Delivery:</span>
                    <span className="text-sm font-medium text-gray-800">
                      {coop.sample_delivery === 1 || coop.sample_delivery === '1' ? 'Yes' : 'No'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <span className={`
              px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap
              ${statusColors[coop.status] || 'bg-gray-100 text-gray-800'}
            `}>
              {statusLabels[coop.status] || coop.status}
            </span>
          </div>

          {/* Product link - moved outside, between fee/commission and expected publish date */}
          {coop.productUrl && (
            <div className="mb-3">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Product Link: </span>
                <a
                  href={coop.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline break-all"
                >
                  {coop.productUrl}
                </a>
              </p>
            </div>
          )}

          {/* Expected publish date range */}
          {formatDateRange() && (
            <div className="mb-3">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Expected Publish Date: </span>
                <span>{formatDateRange()}</span>
              </p>
            </div>
          )}

          {/* Collab Details (collapsible) - Core selling points, brief link, reference video link */}
          {(formatSellingPoints().length > 0 || coop.briefLink || coop.referenceVideoLinks) && (
            <div className="mb-3 border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowCollabDetails(!showCollabDetails)}
                className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-sm font-medium text-gray-700 transition-colors"
              >
                <span>Collab Details</span>
                <svg
                  className={`w-4 h-4 transition-transform ${showCollabDetails ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showCollabDetails && (
                <div className="p-4 bg-white space-y-3">
                  {/* Core selling points */}
                  {formatSellingPoints().length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-gray-600">Core Selling Points: </span>
                      <ul className="mt-1 space-y-1">
                        {formatSellingPoints().map((point, index) => (
                          <li key={index} className="text-sm text-gray-700 ml-4 list-disc">
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Brief link */}
                  {coop.briefLink && (
                    <div>
                      <span className="text-xs font-medium text-gray-600">Brief Link: </span>
                      <a
                        href={coop.briefLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline break-all ml-1"
                      >
                        {coop.briefLink}
                      </a>
                    </div>
                  )}
                  
                  {/* Reference Video link */}
                  {coop.referenceVideoLinks && (
                    <div>
                      <span className="text-xs font-medium text-gray-600">Reference Video Link: </span>
                      <a
                        href={coop.referenceVideoLinks}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline break-all ml-1"
                      >
                        {coop.referenceVideoLinks}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {coop.description && (
            <p className="text-sm text-gray-700 mb-3 line-clamp-2">
              {coop.description}
            </p>
          )}

          {/* Show different actions based on section */}
          {activeTab === 'application' && renderApplicationActions()}
          {activeTab === 'confirmation' && renderConfirmationActions()}
          {activeTab === 'draft' && renderDraftForm()}
          {activeTab === 'video' && renderVideoForm()}
          {activeTab === 'settlement' && renderSettlementInfo()}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('confirmation');
  const [cooperations, setCooperations] = useState({
    application: [],
    confirmation: [],
    draft: [],
    video: [],
    settlement: [],
  });
  const [loadingCooperations, setLoadingCooperations] = useState(false);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false); // 移动端菜单开关（已废弃，保留用于兼容）
  const [sidebarExpanded, setSidebarExpanded] = useState(false); // 移动端侧边栏展开状态（默认收起，显示窄侧边栏）
  const [updatingStatus, setUpdatingStatus] = useState({}); // 正在更新的合作ID
  const [formData, setFormData] = useState({}); // 表单数据
  const [lastRefreshTime, setLastRefreshTime] = useState(null); // 最后刷新时间
  const [showProfileModal, setShowProfileModal] = useState(false); // 显示个人信息初始化模态框
  const [showUserProfileModal, setShowUserProfileModal] = useState(false); // 显示个人信息设置模态框
  const [userProfile, setUserProfile] = useState(null); // 用户个人信息数据
  const [profileInitialized, setProfileInitialized] = useState(null); // 个人信息是否已初始化（null=未检查，true=已初始化，false=未初始化）
  const router = useRouter();

  useEffect(() => {
    // 获取当前会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        router.push('/login');
        return;
      }
      
      // 获取用户资料
      supabase
        .from('profiles')
        .select('full_name, email, email_setup_completed')
        .eq('id', session.user.id)
        .single()
        .then(({ data, error }) => {
          if (error && error.code !== 'PGRST116') {
            console.error('获取用户资料失败:', error);
          }
          
          // 如果未完成邮箱设置，跳转到设置页面
          if (data && !data.email_setup_completed) {
            router.push('/setup-email');
            return;
          }
          
          setProfile(data);
          setLoading(false);
          
          // 加载合作记录和用户信息
          if (session) {
            loadCooperations(session);
            // 预加载用户个人信息（避免首次点击时的延迟和重复API调用）
            // 确保session.access_token存在后再调用
            if (session.access_token) {
              loadUserProfile();
            }
          }
        });
    });

    // 监听认证状态变化
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
    if (!session) {
      router.push('/login');
    } else {
      loadCooperations(session);
      // 确保session.access_token存在后再加载用户信息
      if (session.access_token) {
        loadUserProfile();
      }
    }
  });

    return () => subscription.unsubscribe();
  }, [router]);

  // 刷新 token 并获取最新的 session
  const refreshSession = async (currentSession = null) => {
    try {
      // 使用传入的 session 或当前 state 中的 session
      const sessionToRefresh = currentSession || session;
      
      if (!sessionToRefresh || !sessionToRefresh.refresh_token) {
        console.error('无法刷新 session: 缺少 refresh_token');
        return null;
      }

      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession({
        refresh_token: sessionToRefresh.refresh_token
      });
      
      if (refreshError) {
        console.error('刷新 session 失败:', refreshError);
        return null;
      }
      
      if (refreshedSession) {
        setSession(refreshedSession);
        return refreshedSession;
      }
      
      return null;
    } catch (err) {
      console.error('刷新 session 异常:', err);
      return null;
    }
  };

  const loadCooperations = async (session, retryCount = 0) => {
    setLoadingCooperations(true);
    setError(null);

    try {
      if (!session || !session.access_token) {
        throw new Error('No valid session found');
      }
      
      const response = await fetch('/api/cooperations', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      // 如果遇到 401 错误且未重试过，尝试刷新 token 并重试
      if (!response.ok && response.status === 401 && retryCount === 0) {
        console.log('Token 可能已过期，尝试刷新...');
        const refreshedSession = await refreshSession(session);
        if (refreshedSession && refreshedSession.access_token) {
          // 使用刷新后的 token 重试一次
          return loadCooperations(refreshedSession, retryCount + 1);
        } else {
          throw new Error(result.error || 'Failed to load collaborations: Authentication failed');
        }
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load collaborations');
      }

      setCooperations(result.data || {
        application: [],
        confirmation: [],
        draft: [],
        video: [],
        settlement: [],
      });
      setLastRefreshTime(new Date());
    } catch (err) {
      console.error('加载合作记录失败:', err);
      setError(err.message);
    } finally {
      setLoadingCooperations(false);
    }
  };

  // 加载用户个人信息（页面加载时调用，避免重复API调用）
  const loadUserProfile = async (currentSession = null, retryCount = 0) => {
    // 使用传入的 session 或当前 state 中的 session
    const sessionToUse = currentSession || session;
    
    if (!sessionToUse || !sessionToUse.access_token) {
      return { data: null, isInitialized: false };
    }

    try {
      const response = await fetch('/api/user-profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionToUse.access_token}`,
        },
      });

      const result = await response.json();

      // 如果遇到 401 错误且未重试过，尝试刷新 token 并重试
      if (!response.ok && response.status === 401 && retryCount === 0) {
        console.log('Token 可能已过期，尝试刷新...');
        const refreshedSession = await refreshSession(sessionToUse);
        if (refreshedSession && refreshedSession.access_token) {
          // 使用刷新后的 token 重试一次
          return loadUserProfile(refreshedSession, retryCount + 1);
        } else {
          throw new Error(result.error || 'Failed to get user information: Authentication failed');
        }
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get user information');
      }

      // 保存用户信息数据
      setUserProfile(result.data);
      
      // 设置初始化状态
      const isInitialized = result.isInitialized || false;
      setProfileInitialized(isInitialized);
      
      return { data: result.data, isInitialized };
    } catch (err) {
      console.error('获取用户信息失败:', err);
      setUserProfile(null);
      setProfileInitialized(false);
      return { data: null, isInitialized: false };
    }
  };

  // 处理个人信息检查（在申请合作或接受邀请时调用）
  // 优化：直接使用已加载的用户信息数据，避免重复API调用
  const handleCheckProfile = async () => {
    // 如果已经检查过且已初始化，直接返回 true（最快路径）
    if (profileInitialized === true) {
      return true;
    }

    // 如果用户信息已加载但未初始化，直接显示模态框（无需API调用）
    if (userProfile !== null && profileInitialized === false) {
      setShowProfileModal(true);
      return false;
    }

    // 如果用户信息未加载（理论上不应该发生，因为页面加载时已加载），则加载一次
    if (userProfile === null && profileInitialized === null) {
      const result = await loadUserProfile();
      if (!result.isInitialized) {
        setShowProfileModal(true);
        return false;
      }
      return true;
    }

    return true;
  };

  // 个人信息初始化成功后的回调
  const handleProfileInitSuccess = async () => {
    // 重新加载用户信息以确保数据已保存
    await loadUserProfile();
    setShowProfileModal(false);
  };

  // 个人信息更新后的回调
  const handleUserProfileUpdate = async () => {
    // 重新加载用户信息
    await loadUserProfile();
  };

  // 打开个人信息设置模态框（在打开前确保数据已加载）
  const handleOpenProfileModal = async () => {
    // 如果userProfile是null，先加载数据
    if (!userProfile && session && session.access_token) {
      await loadUserProfile();
    }
    // 打开模态框
    setShowUserProfileModal(true);
  };

  const updateCooperationStatus = async (cooperationId, newStatus, additionalData = {}) => {
    if (!session || !session.access_token) {
      setError('No valid session found');
      return;
    }

    setUpdatingStatus(prev => ({ ...prev, [cooperationId]: true }));

    try {
      const response = await fetch('/api/cooperations/update-status', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cooperationId,
          newStatus,
          ...additionalData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update status');
      }

      // 重新加载合作记录
      await loadCooperations(session);
      
      // 清除表单数据
      setFormData(prev => {
        const newData = { ...prev };
        delete newData[cooperationId];
        return newData;
      });
    } catch (err) {
      console.error('更新状态失败:', err);
      setError(err.message);
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [cooperationId]: false }));
    }
  };

  const getCurrentCooperations = () => {
    switch (activeTab) {
      case 'application':
        return cooperations.application;
      case 'confirmation':
        return cooperations.confirmation;
      case 'draft':
        return cooperations.draft;
      case 'video':
        return cooperations.video;
      case 'settlement':
        return cooperations.settlement;
      default:
        return [];
    }
  };

  const getTotalCount = () => {
    return (
      cooperations.application.length +
      cooperations.confirmation.length +
      cooperations.draft.length +
      cooperations.video.length +
      cooperations.settlement.length
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const currentCooperations = getCurrentCooperations();
  const activeMenuItem = menuItems.find(item => item.id === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-50 flex flex-col">
      {/* 顶部导航栏 */}
      <nav className="bg-white/70 backdrop-blur-md shadow-sm border-b border-blue-100/50">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <h1 className="text-sm sm:text-lg md:text-xl font-semibold text-gray-900 whitespace-nowrap truncate">Influencer Dashboard</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <span className="text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                {profile?.full_name || session.user.email}
              </span>
              {/* User profile settings button */}
              <button
                onClick={handleOpenProfileModal}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Profile Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden relative">
        {/* 移动端窄侧边栏 - 始终固定在左侧 */}
        <aside
          className={`
            lg:hidden
            fixed
            left-0
            top-16
            bottom-0
            w-16
            bg-white/80 backdrop-blur-sm border-r border-blue-100/50
            flex flex-col
            z-30
          `}
        >
          {/* 移动端展开/收起按钮 */}
          <div className="flex items-center justify-center p-2 border-b border-blue-100/50">
            <button
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label={sidebarExpanded ? 'Collapse menu' : 'Expand menu'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 菜单项列表 - 窄模式 */}
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {menuItems.map((item) => {
              const count = cooperations[item.id]?.length || 0;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarExpanded(true); // 点击后展开菜单
                  }}
                  className={`
                    w-full flex items-center justify-center px-2 py-3
                    rounded-lg
                    transition-colors duration-200
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 font-medium' 
                      : 'text-gray-700 hover:bg-blue-50/50'
                    }
                    relative
                  `}
                  title={`${item.label}${count > 0 ? ` (${count})` : ''}`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                  </div>
                  {count > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-blue-500 rounded-full border-2 border-white flex items-center justify-center px-1">
                      <span className="text-[10px] text-white font-bold leading-none">{count > 9 ? '9+' : count}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Statistics - 窄模式 */}
          <div className="p-2 border-t border-blue-100/50 bg-blue-50/30">
            <div className="text-xs text-gray-600">
              <div className="flex flex-col items-center gap-1">
                <span className="font-medium text-center text-sm">{getTotalCount()}</span>
                <span className="text-[9px] text-center text-gray-500">Total</span>
              </div>
            </div>
          </div>
        </aside>

        {/* 移动端展开菜单 - 覆盖模式 */}
        <aside
          className={`
            lg:hidden
            fixed
            left-0
            top-16
            bottom-0
            w-64
            bg-white/95 backdrop-blur-md border-r border-blue-100/50
            transition-transform duration-300 ease-in-out
            flex flex-col
            z-40
            ${sidebarExpanded ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          {/* 移动端展开菜单头部 */}
          <div className="flex items-center justify-between p-4 border-b border-blue-100/50">
            <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
            <button
              onClick={() => setSidebarExpanded(false)}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 菜单项列表 - 展开模式 */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {menuItems.map((item) => {
              const count = cooperations[item.id]?.length || 0;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarExpanded(false); // 点击后收起菜单
                  }}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 rounded-lg
                    transition-colors duration-200
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 font-medium' 
                      : 'text-gray-700 hover:bg-blue-50/50'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <span className="text-sm whitespace-nowrap">{item.label}</span>
                  </div>
                  {count > 0 && (
                    <span className={`
                      px-2 py-1 rounded-full text-xs font-medium flex-shrink-0
                      ${isActive ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-700'}
                    `}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Statistics - 展开模式 */}
          <div className="p-4 border-t border-blue-100/50 bg-blue-50/30">
            <div className="text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Total: </span>
                <span className="font-medium">{getTotalCount()}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* 桌面端侧边栏 - 固定完整菜单 */}
        <aside
          className={`
            hidden lg:flex
            static
            flex-shrink-0
            w-64
            bg-white/80 backdrop-blur-sm border-r border-blue-100/50
            flex flex-col
          `}
        >
          {/* 桌面端菜单项列表 */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {menuItems.map((item) => {
              const count = cooperations[item.id]?.length || 0;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                  }}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 rounded-lg
                    transition-colors duration-200
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 font-medium' 
                      : 'text-gray-700 hover:bg-blue-50/50'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <span className="text-sm whitespace-nowrap">{item.label}</span>
                  </div>
                  {count > 0 && (
                    <span className={`
                      px-2 py-1 rounded-full text-xs font-medium flex-shrink-0
                      ${isActive ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-700'}
                    `}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* 桌面端统计信息 */}
          <div className="p-4 border-t border-blue-100/50 bg-blue-50/30">
            <div className="text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Total: </span>
                <span className="font-medium">{getTotalCount()}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* 移动端遮罩层 - 极浅色遮罩 + 模糊效果 */}
        {sidebarExpanded && (
          <div
            className="fixed inset-0 bg-blue-50/10 backdrop-blur-sm z-[35] lg:hidden"
            onClick={() => setSidebarExpanded(false)}
          />
        )}

      {/* 主内容区 */}
        <main className="flex-1 overflow-y-auto ml-16 lg:ml-0">
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Page title */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                    <span className="flex-shrink-0">{activeMenuItem?.icon}</span>
                    <span className="whitespace-nowrap">{activeMenuItem?.label}</span>
                  </h2>
                  <p className="mt-2 text-sm text-gray-600">
                    {currentCooperations.length} record{currentCooperations.length !== 1 ? 's' : ''}
                    {lastRefreshTime && (
                      <span className="ml-2">
                        · Last updated: {lastRefreshTime.toLocaleTimeString('en-US')}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => session && loadCooperations(session)}
                  disabled={loadingCooperations}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white/90 backdrop-blur-sm border border-blue-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-sm"
                  title="Refresh data"
                >
                  <svg 
                    className={`w-4 h-4 ${loadingCooperations ? 'animate-spin' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {loadingCooperations ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Failed to Load</h3>
                    <p className="mt-1 text-sm text-red-700">{error}</p>
                    <button
                      onClick={() => session && loadCooperations(session)}
                      className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Loading state */}
            {loadingCooperations && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="mt-4 text-gray-600">Loading collaborations...</p>
                </div>
              </div>
            )}

            {/* Collaboration records list */}
            {!loadingCooperations && !error && (
              <>
                {currentCooperations.length === 0 ? (
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-blue-100/50 p-12 text-center">
                    <div className="text-4xl mb-4">📭</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Records</h3>
                    <p className="text-sm text-gray-600">
                      No collaboration records in this section
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentCooperations.map((coop) => (
                      <CooperationCard
                        key={coop.id}
                        cooperation={coop}
                        activeTab={activeTab}
                        onUpdateStatus={updateCooperationStatus}
                        updating={updatingStatus[coop.id] || false}
                        formData={formData[coop.id] || {}}
                        onFormDataChange={(data) => setFormData(prev => ({ ...prev, [coop.id]: data }))}
                        onCheckProfile={handleCheckProfile}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
        </div>

        {/* 个人信息初始化模态框（强制初始化） */}
        <UserProfileInitModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onSuccess={handleProfileInitSuccess}
          session={session}
        />

        {/* 个人信息设置模态框（用户主动编辑） */}
        <UserProfileModal
          isOpen={showUserProfileModal}
          onClose={() => setShowUserProfileModal(false)}
          session={session}
          userProfile={userProfile}
          onUpdate={handleUserProfileUpdate}
        />
    </div>
  );
}
