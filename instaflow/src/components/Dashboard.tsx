import Header from "./Header";
import NewAutomationModal from "./NewAutomationModal";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { TabType } from "../App";
import type { AutomationRule, InstagramPost, ActivityLog } from "../types";
import SettingsView from "./SettingsView";
import AnalyticsView from "./AnalyticsView";
import AutomationDashboard from "./AutomationDashboard";
import PostSelector from "./PostSelector";
import type { RootState } from "../store/store";
import Sidebar from "./Sidebar";
import OnboardingScreen from "./OnboardingScreen";
import { MetaApiService } from "../services/api";
import PostDetailModal from "./PostDetailModal";

const Dashboard: React.FC = () => {
  const user = useSelector((state: RootState) => state.user.profile);
  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<InstagramPost | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityCursor, setActivityCursor] = useState<string | null>(null);
  const [hasMoreLogs, setHasMoreLogs] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const syncPosts = useCallback(async () => {
    setIsLoading(true);
    console.log("Syncing Instagram posts...");
    try {
      const fetchedPosts = await MetaApiService.fetchPosts();
      setPosts(fetchedPosts);
    } catch (error) {
      console.error("Failed to sync Instagram posts:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMyAutomations = useCallback(async () => {
    try {
      const rules = await MetaApiService.getAutomations();
      setAutomations(rules);
    } catch (error) {
      console.error("Failed to fetch automations:", error);
    }
  }, []);

  const fetchActivityLogs = useCallback(async () => {
    try {
      const result = await MetaApiService.getActivityLogs(10);
      setActivityLogs(result.logs);
      setHasMoreLogs(result.hasMore);
      setActivityCursor(result.nextCursor);
    } catch (error) {
      console.error("Failed to fetch activity logs:", error);
    }
  }, []);

  const loadMoreLogs = useCallback(async () => {
    if (!activityCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const result = await MetaApiService.getActivityLogs(10, activityCursor);
      setActivityLogs(prev => [...prev, ...result.logs]);
      setHasMoreLogs(result.hasMore);
      setActivityCursor(result.nextCursor);
    } catch (error) {
      console.error("Failed to load more logs:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activityCursor, isLoadingMore]);

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

    const nextActive = !target.active;
    setAutomations((prev) =>
      prev.map((rule) =>
        rule.id === automationId ? { ...rule, active: nextActive } : rule
      )
    );

    try {
      await MetaApiService.updateAutomation(automationId, { isEnabled: nextActive });
    } catch (error) {
      console.error("Failed to update automation:", error);
      setAutomations((prev) =>
        prev.map((rule) =>
          rule.id === automationId ? { ...rule, active: target.active } : rule
        )
      );
    }
  }, [automations]);

  const handleDeleteRule = useCallback(async (automationId: string) => {
    const previous = automations;
    setAutomations((prev) => prev.filter((rule) => rule.id !== automationId));

    try {
      await MetaApiService.deleteAutomation(automationId);
    } catch (error) {
      console.error("Failed to delete automation:", error);
      setAutomations(previous);
    }
  }, [automations]);

  const handleSaveRule = useCallback(() => {
    setIsModalOpen(false);
    setSelectedPost(null);
    setEditingRule(null);
    fetchMyAutomations();
  }, [fetchMyAutomations]);

  const renderContent = () => {
    switch (activeTab) {
      case "posts":
        // Get list of post IDs that have active automations
        const automatedPostIds = automations
          .filter(a => a.postId && a.active)
          .map(a => a.postId!);
        
        return (
          <PostSelector
            onSyncPosts={syncPosts}
            posts={posts}
            isSyncing={isLoading}
            automatedPostIds={automatedPostIds}
            onViewPost={(post) => {
              setSelectedPost(post);
              setIsViewModalOpen(true);
            }}
            onSelectPost={(post) => {
              setSelectedPost(post);
              // Find existing automation for this post to open in edit mode
              const existingRule = automations.find(a => a.postId === post.id);
              if (existingRule) {
                setEditingRule(existingRule);
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
            rules={automations}
            posts={posts}
            onToggle={handleToggleAutomation}
            onDelete={handleDeleteRule}
            onEdit={handleEditRule}
            logs={activityLogs}
            hasMoreLogs={hasMoreLogs}
            isLoadingMore={isLoadingMore}
            onLoadMore={loadMoreLogs}
            onNavigateToPosts={() => setActiveTab("posts")}
          />
        );
      case "analytics":
        return <AnalyticsView rules={automations} />;

      case "settings":
        return <SettingsView user={user} />;
      default:
        return null;
    }
  };

  useEffect(() => {
    if (user.isIGConnected && posts.length === 0) {
      console.log("Syncing posts as IG is connected and no posts are loaded.");
      syncPosts();
    }
  }, [posts.length, syncPosts, user.isIGConnected]);

  useEffect(() => {
    if (!user.isIGConnected) return;
    if (activeTab === "automations" || activeTab === "analytics" || activeTab === "posts") {
      fetchMyAutomations();
    }
    if (activeTab === "automations" || activeTab === "analytics") {
      fetchActivityLogs();
    }
  }, [activeTab, fetchMyAutomations, fetchActivityLogs, user.isIGConnected]);
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
          <OnboardingScreen onConnected={syncPosts} />
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
