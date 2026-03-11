import { useState, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface SubTab {
  key: string;
  label: string;
  content: ReactNode;
  hidden?: boolean;
}

export interface SuperTab {
  key: string;
  icon: string;
  label: string;
  subTabs?: SubTab[];
  /** For standalone tabs (no sub-tabs), provide content directly */
  content?: ReactNode;
  /** Badge: "red" | "orange" | "yellow" or undefined */
  badge?: { color: "red" | "orange" | "yellow"; label?: string };
  hidden?: boolean;
}

interface Props {
  tabs: SuperTab[];
  defaultSuperTab?: string;
  defaultSubTab?: string;
}

const BADGE_COLORS: Record<string, string> = {
  red: "bg-[#FEE2E2] text-[#991B1B]",
  orange: "bg-[#FFEDD5] text-[#9A3412]",
  yellow: "bg-[#FEF9C3] text-[#854D0E]",
};

const ProjectTabs = ({ tabs, defaultSuperTab = "control", defaultSubTab = "sov" }: Props) => {
  const visibleTabs = tabs.filter((t) => !t.hidden);
  const [activeSuperTab, setActiveSuperTab] = useState(defaultSuperTab);
  const [activeSubTabs, setActiveSubTabs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (defaultSubTab) initial[defaultSuperTab] = defaultSubTab;
    // Set first sub-tab as default for each group
    for (const tab of visibleTabs) {
      if (tab.subTabs && !initial[tab.key]) {
        const firstVisible = tab.subTabs.find((s) => !s.hidden);
        if (firstVisible) initial[tab.key] = firstVisible.key;
      }
    }
    return initial;
  });

  const currentSuper = visibleTabs.find((t) => t.key === activeSuperTab) || visibleTabs[0];
  const visibleSubTabs = currentSuper?.subTabs?.filter((s) => !s.hidden);
  const currentSubKey = activeSubTabs[currentSuper?.key] || visibleSubTabs?.[0]?.key;
  const currentSub = visibleSubTabs?.find((s) => s.key === currentSubKey);

  const handleSuperClick = (key: string) => {
    setActiveSuperTab(key);
    const tab = visibleTabs.find((t) => t.key === key);
    if (tab?.subTabs && !activeSubTabs[key]) {
      const first = tab.subTabs.find((s) => !s.hidden);
      if (first) setActiveSubTabs((prev) => ({ ...prev, [key]: first.key }));
    }
  };

  const handleSubClick = (superKey: string, subKey: string) => {
    setActiveSubTabs((prev) => ({ ...prev, [superKey]: subKey }));
  };

  return (
    <div>
      {/* Super-tab bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm rounded-t-lg">
        <div className="flex items-center gap-0 overflow-x-auto">
          {visibleTabs.map((tab) => {
            const isActive = tab.key === activeSuperTab;
            return (
              <button
                key={tab.key}
                onClick={() => handleSuperClick(tab.key)}
                className={cn(
                  "relative flex items-center gap-1.5 px-5 h-[44px] font-medium text-[13px] whitespace-nowrap transition-colors border-b-[3px]",
                  isActive
                    ? "bg-[#0F1B2D] text-white border-[#0D7377]"
                    : "text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge && (
                  <Badge className={cn("ml-1 text-[10px] px-1.5 py-0 border-0 min-w-[18px] h-[18px] flex items-center justify-center", BADGE_COLORS[tab.badge.color])}>
                    {tab.badge.label || "•"}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-tab bar */}
      {visibleSubTabs && visibleSubTabs.length > 0 && (
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-0 overflow-x-auto">
            {visibleSubTabs.map((sub) => {
              const isActive = sub.key === currentSubKey;
              return (
                <button
                  key={sub.key}
                  onClick={() => handleSubClick(currentSuper.key, sub.key)}
                  className={cn(
                    "px-4 h-[36px] text-[13px] whitespace-nowrap transition-colors border-b-2",
                    isActive
                      ? "text-[#0D7377] border-[#0D7377] font-medium"
                      : "text-gray-500 border-transparent hover:text-gray-700"
                  )}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="mt-4">
        {currentSuper?.content && !currentSuper.subTabs
          ? currentSuper.content
          : currentSub?.content}
      </div>
    </div>
  );
};

export default ProjectTabs;
