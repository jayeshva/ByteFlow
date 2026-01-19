import Header from "./Header";
import { NewAutomationModal } from "../automation";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { TabType } from "../../App";
import type { AutomationRule, InstagramPost } from "../../types";

import SettingsView from "./SettingsView";
import AnalyticsView from "./AnalyticsView";
import { AutomationDashboard } from "../automation";
import { PostSelector } from "../automation";
import type { RootState } from "../../store/store";
import Sidebar from "./Sidebar";
import { OnboardingScreen } from "../auth";
import { PostDetailModal } from "../automation";
import { 
  useInstagramPosts, 
  useAutomations, 
  useActivityLogs, 
  useToggleAutomation, 
  useDeleteAutomation 
} from "../../hooks";



const Dashboard: React.FC = () => {
  const user = useSelector((state: RootState) => state.user.profile);
  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<InstagramPost | null>(null);
  
  // React Query Hooks
  const { data: posts = [], isLoading: postsLoading, refetch: syncPosts } = useInstagramPosts();
  const { data: automations = [], refetch: refetchAutomations } = useAutomations();
  const { data: logsData, isLoading: logsLoading } = useActivityLogs(10);

  
  const toggleMutation = useToggleAutomation();
  const deleteMutation = useDeleteAutomation();

  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);


  const activityLogs = logsData?.logs || [];
  const hasMoreLogs = logsData?.hasMore || false;
  // Note: Pagination for logs will need slightly different handling if we want infinite scroll
  // but for now we follow the existing structure.
  const loadMoreLogs = () => {
    // React Query handleMore would go here
  };


  const handleEditRule = (rule: AutomationRule) => {
    const post = posts.find(p => p.id === rule.postId);
    if (post) {
      setSelectedPost(post);
      setEditingRule(rule);
      setIsModalOpen(true);
    }
  };

  const handleToggleAutomation = useCallback(async (automationId: string) => {
    const target = automations.find((rule) => rule.id === automationId);
    if (!target) return;
    toggleMutation.mutate({ id: automationId, isEnabled: !target.active });
  }, [automations, toggleMutation]);

  const handleDeleteRule = useCallback(async (automationId: string) => {
    deleteMutation.mutate(automationId);
  }, [deleteMutation]);


  const handleSaveRule = useCallback(() => {
    setIsModalOpen(false);
    setSelectedPost(null);
    setEditingRule(null);
    refetchAutomations();
  }, [refetchAutomations]);


  const renderContent = () => {
    switch (activeTab) {
      case "posts":
        // Get list of post IDs that have active automations
        const automatedPostIds = automations
          .filter(a => a.postId && a.active)
          .map(a => a.postId!);
        
        return (
          <PostSelector
            onSyncPosts={syncPosts as any}
            posts={posts as any}
            isSyncing={postsLoading}
            automatedPostIds={automatedPostIds}
            onViewPost={(post) => {
              setSelectedPost(post as any);
              setIsViewModalOpen(true);
            }}
            onSelectPost={(post) => {
              setSelectedPost(post as any);
              // Find existing automation for this post to open in edit mode
              const existingRule = automations.find(a => a.postId === post.id);
              if (existingRule) {
                setEditingRule(existingRule as any);
              } else {
                setEditingRule(null);
              }
              setIsModalOpen(true);
            }}
          />
        );

      case "automations":
        return (
          <AutomationDashboard
            rules={automations as any}
            posts={posts as any}
            onToggle={handleToggleAutomation}
            onDelete={handleDeleteRule}
            onEdit={handleEditRule}
            logs={activityLogs as any}
            hasMoreLogs={hasMoreLogs}
            isLoadingMore={logsLoading}
            onLoadMore={loadMoreLogs}
            onNavigateToPosts={() => setActiveTab("posts")}
          />

        );
      case "analytics":
        return <AnalyticsView rules={automations as any} />;


      case "settings":
        return <SettingsView user={user} />;
      default:
        return null;
    }
  };

  useEffect(() => {
    if (user.isIGConnected && posts.length === 0 && !postsLoading) {
      console.log("Syncing posts as IG is connected and no posts are loaded.");
      syncPosts();
    }
  }, [posts.length, postsLoading, syncPosts, user.isIGConnected]);

  // Automations and logs are now managed by React Query, so we don't need the manual refresh effect

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden font-sans">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          user={user} 
          onProfileClick={() => setActiveTab("settings")} 
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />

        <div className="bg-indigo-600 px-4 md:px-8 py-2 flex items-center justify-between text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest">
          <div className="flex items-center space-x-2 md:space-x-4">
            <span className="flex items-center">
              <div className={`w-1.5 h-1.5 ${user.isIGConnected ? "bg-green-400" : "bg-red-400"} rounded-full mr-2`}></div>{" "}
              IG: {user.isIGConnected ? "Connected" : "Disconnected"}
            </span>
            <span className="hidden sm:flex items-center opacity-70">
              {user.isIGConnected ? `@${user.username}` : ""}
            </span>
          </div>
        </div>

        {user.isIGConnected ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
            <div
              key={activeTab}
              className="max-w-7xl mx-auto animate-page-entry"
            >
              {renderContent()}
            </div>
          </div>
        ) : (
          <OnboardingScreen onConnected={() => syncPosts()} />
        )}

      </main>

      {isModalOpen && selectedPost && (
        <NewAutomationModal
          post={selectedPost}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedPost(null);
            setEditingRule(null);
          }}
          initialRule={editingRule}
          onSave={handleSaveRule}
        />
      )}
      {isViewModalOpen && selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedPost(null);
          }}
        />
      )}
    </div>
  );
};
export default Dashboard;
