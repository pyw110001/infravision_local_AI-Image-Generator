import React from 'react';

interface HeaderProps {
  title: string;
  onExport: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onExport, isDarkMode, toggleTheme }) => (
  <header className="h-14 bg-white dark:bg-panel border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 transition-colors duration-200">
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 bg-municipal-600 rounded-sm shadow-sm"></div>
      <h1 className="font-bold text-lg tracking-tight text-gray-900 dark:text-white">市政 <span className="text-municipal-600 dark:text-municipal-500 font-light">AI生图</span></h1>
      <span className="mx-2 text-gray-400 dark:text-gray-600">/</span>
      <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">{title}</span>
    </div>
    <div className="flex items-center gap-4">
      <button
        onClick={toggleTheme}
        className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
        title={isDarkMode ? "切换亮色模式" : "切换暗色模式"}
      >
        {isDarkMode ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
        )}
      </button>
      <button 
        onClick={onExport}
        className="bg-municipal-600 hover:bg-municipal-500 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        导出资产
      </button>
      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full border border-gray-300 dark:border-gray-600"></div>
    </div>
  </header>
);

export const Sidebar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <aside className="w-72 bg-white dark:bg-panel border-r border-gray-200 dark:border-gray-800 flex flex-col h-[calc(100vh-3.5rem)] overflow-y-auto transition-colors duration-200">
    {children}
  </aside>
);

export const PropertiesPanel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <aside className="w-80 bg-white dark:bg-panel border-l border-gray-200 dark:border-gray-800 flex flex-col h-[calc(100vh-3.5rem)] overflow-y-auto transition-colors duration-200">
    {children}
  </aside>
);