'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import RGL from 'react-grid-layout';
import {
  Settings, Eye, Layout, RotateCcw, X, Check,
  GripVertical, Plus
} from 'lucide-react';

import RiskSignalsCard from './RiskSignalsCard';
import OpenLoopsCard from './OpenLoopsCard';
import RecentActionsCard from './RecentActionsCard';
import ProjectsCard from './ProjectsCard';
import GoalsChart from './GoalsChart';
import LearningStatsCard from './LearningStatsCard';
import FollowUpsCard from './FollowUpsCard';
import CalendarWidget from './CalendarWidget';
import IntegrationsCard from './IntegrationsCard';
import MemoryHealthCard from './MemoryHealthCard';
import InspirationCard from './InspirationCard';
import ContextCard from './ContextCard';
import TokenBudgetCard from './TokenBudgetCard';
import TokenChart from './TokenChart';
import OnboardingChecklist from './OnboardingChecklist';

// Robust import for Responsive grid
const Responsive = RGL.Responsive || RGL.default?.Responsive || RGL;

// Custom WidthProvider to avoid import issues
const withWidth = (ComposedComponent) => {
  const WithWidth = (props) => {
    const [width, setWidth] = useState(1200);
    const elementRef = useRef(null);

    useEffect(() => {
      const handleResize = () => {
        if (elementRef.current) {
          setWidth(elementRef.current.offsetWidth);
        }
      };

      // Initial measurement
      handleResize();

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
      <div ref={elementRef} style={{ width: '100%' }}>
        <ComposedComponent {...props} width={width} />
      </div>
    );
  };

  WithWidth.displayName = `WithWidth(${ComposedComponent.displayName || ComposedComponent.name || 'Component'})`;
  return WithWidth;
};

const ResponsiveGridLayout = withWidth(Responsive);

// --- Configuration ---

const WIDGETS = {
  risk_signals: { component: RiskSignalsCard, title: 'Risk Signals', default: { w: 2, h: 2, x: 0, y: 0 } },
  open_loops: { component: OpenLoopsCard, title: 'Open Loops', default: { w: 2, h: 2, x: 2, y: 0 } },
  recent_actions: { component: RecentActionsCard, title: 'Recent Actions', default: { w: 2, h: 2, x: 0, y: 2 } },
  projects: { component: ProjectsCard, title: 'Projects', default: { w: 2, h: 2, x: 2, y: 2 } },
  goals: { component: GoalsChart, title: 'Goals', default: { w: 1, h: 2, x: 0, y: 4 } },
  learning: { component: LearningStatsCard, title: 'Learning Stats', default: { w: 1, h: 2, x: 1, y: 4 } },
  follow_ups: { component: FollowUpsCard, title: 'Follow Ups', default: { w: 1, h: 2, x: 2, y: 4 } },
  calendar: { component: CalendarWidget, title: 'Calendar', default: { w: 1, h: 2, x: 3, y: 4 } },
  context: { component: ContextCard, title: 'Context', default: { w: 2, h: 2, x: 0, y: 6 } },
  token_budget: { component: TokenBudgetCard, title: 'Token Budget', default: { w: 1, h: 2, x: 2, y: 6 } },
  memory_health: { component: MemoryHealthCard, title: 'Memory Health', default: { w: 1, h: 2, x: 3, y: 6 } },
  token_chart: { component: TokenChart, title: 'Token Analytics', default: { w: 2, h: 2, x: 0, y: 8 } },
  integrations: { component: IntegrationsCard, title: 'Integrations', default: { w: 1, h: 2, x: 2, y: 8 } },
  inspiration: { component: InspirationCard, title: 'Inspiration', default: { w: 1, h: 2, x: 3, y: 8 } },
};

const DEFAULT_LAYOUTS = {
  lg: [
    // Row 1: Status (4 cols total)
    { i: 'risk_signals', x: 0, y: 0, w: 2, h: 2 },
    { i: 'open_loops', x: 2, y: 0, w: 2, h: 2 },
    
    // Row 2: Activity
    { i: 'recent_actions', x: 0, y: 2, w: 2, h: 2 },
    { i: 'projects', x: 2, y: 2, w: 2, h: 2 },
    
    // Row 3: Goals & Learning (1x1s)
    { i: 'goals', x: 0, y: 4, w: 1, h: 2 },
    { i: 'learning', x: 1, y: 4, w: 1, h: 2 },
    { i: 'follow_ups', x: 2, y: 4, w: 1, h: 2 },
    { i: 'calendar', x: 3, y: 4, w: 1, h: 2 },
    
    // Row 4: Context & System
    { i: 'context', x: 0, y: 6, w: 2, h: 2 },
    { i: 'token_budget', x: 2, y: 6, w: 1, h: 2 },
    { i: 'memory_health', x: 3, y: 6, w: 1, h: 2 },
    
    // Row 5: Analytics & Extras
    { i: 'token_chart', x: 0, y: 8, w: 2, h: 2 },
    { i: 'integrations', x: 2, y: 8, w: 1, h: 2 },
    { i: 'inspiration', x: 3, y: 8, w: 1, h: 2 },
  ],
  md: Object.keys(WIDGETS).map((key, i) => ({ i: key, w: 1, h: 2, x: i % 2, y: Math.floor(i / 2) * 2 })),
  sm: Object.keys(WIDGETS).map((key, i) => ({ i: key, w: 1, h: 2, x: 0, y: i * 2 })),
};

const BREAKPOINTS = { lg: 1200, md: 768, sm: 480 };
const COLS = { lg: 4, md: 2, sm: 1 };

// --- Storage Keys ---
const KEY_LAYOUT = 'dashclaw_dashboard_layout_v1';
const KEY_HIDDEN = 'dashclaw_dashboard_hidden_v1';

export default function DraggableDashboard() {
  const [mounted, setMounted] = useState(false);
  const [layouts, setLayouts] = useState(DEFAULT_LAYOUTS);
  const [hiddenWidgets, setHiddenWidgets] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  // Load from local storage
  useEffect(() => {
    setMounted(true);
    try {
      const savedLayout = localStorage.getItem(KEY_LAYOUT);
      const savedHidden = localStorage.getItem(KEY_HIDDEN);
      
      if (savedLayout && savedLayout !== 'undefined') {
        const parsed = JSON.parse(savedLayout);
        if (parsed) setLayouts(parsed);
      }
      
      if (savedHidden && savedHidden !== 'undefined') {
        const parsed = JSON.parse(savedHidden);
        if (parsed) setHiddenWidgets(parsed);
      }
    } catch (e) {
      console.error('Failed to load dashboard preferences', e);
      // If corrupt, clear it
      localStorage.removeItem(KEY_LAYOUT);
      localStorage.removeItem(KEY_HIDDEN);
    }
  }, []);

  const saveLayout = (currentLayout, allLayouts) => {
    setLayouts(allLayouts);
    localStorage.setItem(KEY_LAYOUT, JSON.stringify(allLayouts));
  };

  const toggleWidgetVisibility = (key) => {
    const newHidden = hiddenWidgets.includes(key)
      ? hiddenWidgets.filter(k => k !== key)
      : [...hiddenWidgets, key];
    
    setHiddenWidgets(newHidden);
    localStorage.setItem(KEY_HIDDEN, JSON.stringify(newHidden));
  };

  const resetDashboard = () => {
    if (confirm('Reset dashboard to default layout?')) {
      // Clear storage
      localStorage.removeItem(KEY_LAYOUT);
      localStorage.removeItem(KEY_HIDDEN);
      
      // Force reload to ensure fresh state
      window.location.reload();
    }
  };

  if (!mounted) return null; // Prevent hydration mismatch

  // Filter visible widgets
  const visibleKeys = Object.keys(WIDGETS).filter(k => !hiddenWidgets.includes(k));

  return (
    <div className="space-y-6">
      {/* Onboarding stays at top, outside grid */}
      <OnboardingChecklist />

      {/* Toolbar */}
      <div className="flex items-center justify-between bg-surface-secondary border border-border rounded-lg p-2 px-4">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Layout size={16} />
          <span>{visibleKeys.length} widgets visible</span>
        </div>
        
        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <button
                onClick={() => setShowManageModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-zinc-200 hover:bg-white/20 transition-colors"
              >
                <Eye size={14} /> Manage Widgets
              </button>
              <button
                onClick={resetDashboard}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-zinc-200 hover:text-red-400 hover:bg-white/20 transition-colors"
              >
                <RotateCcw size={14} /> Reset
              </button>
              <div className="w-px h-4 bg-white/10 mx-1" />
              <button
                onClick={() => setIsEditMode(false)}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md bg-brand text-white hover:bg-brand/90 transition-colors"
              >
                <Check size={14} /> Done
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-surface-secondary border border-border text-zinc-300 hover:text-white hover:border-brand/50 transition-colors"
            >
              <Settings size={14} /> Customize Dashboard
            </button>
          )}
        </div>
      </div>

      {/* Manage Widgets Modal/Dropdown Area */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowManageModal(false)}>
          <div className="w-full max-w-md bg-surface-secondary border border-border rounded-xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface-tertiary">
              <h3 className="font-medium text-white">Manage Widgets</h3>
              <button onClick={() => setShowManageModal(false)} className="text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto">
              {Object.entries(WIDGETS).map(([key, config]) => {
                const isHidden = hiddenWidgets.includes(key);
                return (
                  <label key={key} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                    <span className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${isHidden ? 'border-zinc-600 bg-transparent' : 'border-brand bg-brand text-white'}`}>
                        {!isHidden && <Check size={10} />}
                      </div>
                      <span className={isHidden ? 'text-zinc-400' : 'text-zinc-200'}>{config.title}</span>
                    </span>
                    {isHidden && <span className="text-xs text-zinc-500">Hidden</span>}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Grid Layout */}
      <div className={isEditMode ? 'edit-mode' : ''}>
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          rowHeight={100} // Base height for rows
          margin={[16, 16]}
          isDraggable={isEditMode}
          isResizable={isEditMode}
          draggableHandle=".grab-handle"
          onLayoutChange={saveLayout}
          compactType="vertical"
        >
          {visibleKeys.map(key => {
            const { component: Component, title } = WIDGETS[key];
            return (
              <div key={key} className="relative group h-full">
                {/* Edit Mode Overlay / Controls */}
                {isEditMode && (
                  <div className="absolute top-0 left-0 right-0 h-6 -mt-3 z-20 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <div className="grab-handle bg-surface-elevated border border-border rounded-full px-3 py-0.5 shadow-lg flex items-center gap-1.5 cursor-grab active:cursor-grabbing text-xs text-zinc-300">
                        <GripVertical size={12} />
                        Drag
                     </div>
                  </div>
                )}
                
                {/* Remove Button in Edit Mode */}
                {isEditMode && (
                  <button
                    onClick={() => toggleWidgetVisibility(key)}
                    className="absolute -top-2 -right-2 z-30 bg-surface-elevated border border-border rounded-full p-1 text-zinc-400 hover:text-red-400 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Hide Widget"
                  >
                    <X size={12} />
                  </button>
                )}

                {/* Actual Component */}
                <div className="h-full w-full overflow-hidden">
                   <Component />
                </div>
              </div>
            );
          })}
        </ResponsiveGridLayout>
      </div>

      {visibleKeys.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-xl">
          <p className="text-zinc-500 mb-4">All widgets hidden</p>
          <button
            onClick={() => { setHiddenWidgets([]); setIsEditMode(true); }}
            className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-md hover:bg-brand/90"
          >
            Show All Widgets
          </button>
        </div>
      )}
    </div>
  );
}
