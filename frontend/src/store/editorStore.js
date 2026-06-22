import { create } from 'zustand';

const useEditorStore = create((set, get) => ({
  ghostText: '',
  setGhostText: (text) => set({ ghostText: text }),
  
  aiStatsAccepted: 0,
  aiStatsRejected: 0,
  incrementAccepted: () => set((state) => ({ aiStatsAccepted: state.aiStatsAccepted + 1 })),
  incrementRejected: () => set((state) => ({ aiStatsRejected: state.aiStatsRejected + 1 })),
  
  slashMenuOpen: false,
  slashMenuPosition: null,
  setSlashMenuOpen: (open, position = null) => set({ slashMenuOpen: open, slashMenuPosition: position }),
  
  remoteCursors: {},
  setRemoteCursors: (cursors) => set({ remoteCursors: cursors }),
  
  contextIntent: 'continue_paragraph',
  contextChars: 0,
  setContext: (intent, chars) => set({ contextIntent: intent, contextChars: chars }),
  
  aiPresenceActive: false,
  aiPresencePosition: null,
  setAIPresence: (active, position = null) => set({ aiPresenceActive: active, aiPresencePosition: position })
}));

export default useEditorStore;
