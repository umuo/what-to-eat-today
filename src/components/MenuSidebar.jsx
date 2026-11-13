import React, { useEffect, useRef, useState } from 'react';
import { FOOD_ICON_CATALOG, matchFoodIconKey } from '../constants/foodCatalog.js';
import { FoodIcon } from './FoodIcon.jsx';

export function MenuSidebar({
  menus,
  activeMenu,
  items,
  excludedIds,
  isLoggedIn,
  isShareMode,
  collapsed,
  onToggleCollapse,
  onSelectMenu,
  onCreateMenu,
  onRenameMenu,
  onDeleteMenu,
  onUpdateItems,
  onResetDefault,
  onRestoreExcluded,
  onRequireLogin,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuDropdownOpen, setMenuDropdownOpen] = useState(false);
  const [creatingMenu, setCreatingMenu] = useState(false);
  const [newMenuName, setNewMenuName] = useState('');
  const [renamingMenu, setRenamingMenu] = useState(false);
  const [renameText, setRenameText] = useState('');

  // Quick-add state
  const [addingItem, setAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemIcon, setNewItemIcon] = useState('shop');
  const [manualIconChosen, setManualIconChosen] = useState(false);
  const addInputRef = useRef(null);

  // Inline item editor state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('shop');
  const [editWeight, setEditWeight] = useState(1);

  // Drag & drop reorder state
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const dropdownRef = useRef(null);

  useEffect(() => {
    const onOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuDropdownOpen(false);
        setCreatingMenu(false);
        setRenamingMenu(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  useEffect(() => {
    if (addingItem && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [addingItem]);

  const handleNewItemNameChange = (val) => {
    setNewItemName(val);
    if (!manualIconChosen) {
      setNewItemIcon(matchFoodIconKey(val));
    }
  };

  const handleQuickAddSubmit = (e) => {
    e.preventDefault();
    const clean = newItemName.trim();
    if (!clean) return;
    const nextItem = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: clean.slice(0, 30),
      iconKey: newItemIcon || matchFoodIconKey(clean),
      weight: 1,
    };
    onUpdateItems([...items, nextItem]);
    setNewItemName('');
    setManualIconChosen(false);
    setNewItemIcon('shop');
    addInputRef.current?.focus();
  };

  const startEditingItem = (item) => {
    if (isShareMode) return;
    if (editingId === item.id) {
      setEditingId(null);
      return;
    }
    setEditingId(item.id);
    setEditName(item.name);
    setEditIcon(item.iconKey);
    setEditWeight(Number(item.weight) || 1);
  };

  const saveEditingItem = () => {
    if (!editingId) return;
    const clean = editName.trim();
    if (!clean) return;
    const next = items.map((it) =>
      it.id === editingId
        ? { ...it, name: clean.slice(0, 30), iconKey: editIcon, weight: editWeight }
        : it
    );
    onUpdateItems(next);
    setEditingId(null);
  };

  const handleDeleteItem = (e, id) => {
    e.stopPropagation();
    if (items.length <= 1) return;
    onUpdateItems(items.filter((it) => it.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const handleDrop = (targetIdx) => {
    if (dragIndex === null || dragIndex === targetIdx || isShareMode) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const reordered = [...items];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIdx, 0, moved);
    onUpdateItems(reordered);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleCreateMenuSubmit = (e) => {
    e.preventDefault();
    const clean = newMenuName.trim();
    if (!clean) return;
    onCreateMenu(clean);
    setNewMenuName('');
    setCreatingMenu(false);
    setMenuDropdownOpen(false);
  };

  const handleRenameMenuSubmit = (e) => {
    e.preventDefault();
    const clean = renameText.trim();
    if (!clean || !activeMenu) return;
    onRenameMenu(activeMenu.id, clean);
    setRenamingMenu(false);
  };

  const renderPanelContent = (isMobile = false) => (
    <div className="flex flex-col h-full max-h-[calc(100vh-116px)]">
      {/* Panel Header */}
      <div className="relative px-4 pt-4 pb-3 border-b border-purple-50 flex items-center justify-between gap-2" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => {
            if (!isShareMode) setMenuDropdownOpen((v) => !v);
          }}
          className={`flex items-center gap-1.5 font-bold text-[#2D2346] text-base sm:text-[17px] min-w-0 ${
            isShareMode ? 'cursor-default' : 'cursor-pointer hover:text-purple-700'
          }`}
        >
          <span className="truncate">{activeMenu?.name || '我的菜单'}</span>
          <span className="text-sm font-medium text-purple-400 shrink-0">
            ({items.length} 项)
          </span>
          {!isShareMode && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              className={`shrink-0 text-purple-400 transition-transform ${
                menuDropdownOpen ? 'rotate-180' : ''
              }`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => (isMobile ? setMobileOpen(false) : onToggleCollapse())}
          title={isMobile ? '关闭' : '收起菜单'}
          aria-label={isMobile ? '关闭' : '收起菜单'}
          className="w-7 h-7 rounded-lg hover:bg-purple-50 flex items-center justify-center text-[#5B4B8A] cursor-pointer shrink-0"
        >
          {isMobile ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7" />
              <polyline points="6 17 11 12 6 7" />
            </svg>
          )}
        </button>

        {/* Multi-Menu Management Popover */}
        {menuDropdownOpen && !isShareMode && (
          <div className="absolute left-3 right-3 top-14 bg-white rounded-2xl shadow-[0_14px_34px_rgba(109,40,217,0.2)] border border-purple-100 p-2.5 z-40 animate-popIn">
            <div className="text-[11px] font-semibold text-purple-400 px-2 pb-1">
              {isLoggedIn ? '切换或管理我的菜单清单' : '登录后可保存多套专属菜单'}
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1">
              {menus.map((m) => {
                const isActive = m.id === activeMenu?.id;
                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-sm ${
                      isActive
                        ? 'bg-purple-100/80 text-purple-800 font-bold'
                        : 'hover:bg-purple-50 text-[#3B2E58]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectMenu(m.id);
                        setMenuDropdownOpen(false);
                      }}
                      className="flex-1 text-left truncate cursor-pointer"
                    >
                      {m.name} ({m.items?.length ?? 0})
                    </button>
                    {isActive && isLoggedIn && menus.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteMenu(m.id);
                          setMenuDropdownOpen(false);
                        }}
                        title="删除此菜单"
                        className="ml-2 text-xs text-rose-400 hover:text-rose-600 cursor-pointer"
                      >
                        删除
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Rename current menu */}
            {isLoggedIn && (
              <div className="mt-2 pt-2 border-t border-purple-50">
                {renamingMenu ? (
                  <form onSubmit={handleRenameMenuSubmit} className="flex gap-1.5">
                    <input
                      type="text"
                      value={renameText}
                      onChange={(e) => setRenameText(e.target.value)}
                      placeholder="新菜单名称"
                      maxLength={24}
                      autoFocus
                      className="flex-1 min-w-0 px-2.5 py-1 text-xs rounded-lg border border-purple-200 focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 rounded-lg bg-purple-600 text-white text-xs font-semibold cursor-pointer"
                    >
                      保存
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setRenameText(activeMenu?.name || '');
                      setRenamingMenu(true);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs font-medium text-[#4B3F6B] hover:bg-purple-50 rounded-lg cursor-pointer"
                  >
                    ✏️ 重命名当前菜单
                  </button>
                )}
              </div>
            )}

            {/* Create new menu */}
            <div className="mt-1 pt-1 border-t border-purple-50">
              {!isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => {
                    setMenuDropdownOpen(false);
                    onRequireLogin();
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs font-semibold text-purple-600 hover:bg-purple-50 rounded-lg cursor-pointer"
                >
                  ✨ 登录用户名以新建多套菜单
                </button>
              ) : creatingMenu ? (
                <form onSubmit={handleCreateMenuSubmit} className="flex gap-1.5 mt-1">
                  <input
                    type="text"
                    value={newMenuName}
                    onChange={(e) => setNewMenuName(e.target.value)}
                    placeholder="如：附近店名、下午茶"
                    maxLength={24}
                    autoFocus
                    className="flex-1 min-w-0 px-2.5 py-1 text-xs rounded-lg border border-purple-200 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded-lg bg-purple-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    创建
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreatingMenu(true)}
                  className="w-full text-left px-2 py-1.5 text-xs font-semibold text-purple-600 hover:bg-purple-50 rounded-lg cursor-pointer"
                >
                  ＋ 新建菜单清单
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onResetDefault();
                  setMenuDropdownOpen(false);
                }}
                className="w-full text-left px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 rounded-lg cursor-pointer"
              >
                ↺ 恢复默认 8 项菜品
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Excluded banner if any */}
      {excludedIds.size > 0 && (
        <div className="mx-3 mt-2.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between text-xs text-amber-800">
          <span>已临时排除 {excludedIds.size} 项</span>
          <button
            type="button"
            onClick={onRestoreExcluded}
            className="font-bold text-amber-700 hover:underline cursor-pointer"
          >
            全部恢复
          </button>
        </div>
      )}

      {/* Food / Shop Items List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-1.5">
        {items.map((item, idx) => {
          const isExcluded = excludedIds.has(item.id);
          const isEditing = editingId === item.id;
          const isDragOver = dragOverIndex === idx && dragIndex !== idx;

          return (
            <div key={item.id} className="rounded-xl transition-all">
              <div
                draggable={!isShareMode && !isEditing}
                onDragStart={() => setDragIndex(idx)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverIndex !== idx) setDragOverIndex(idx);
                }}
                onDrop={() => handleDrop(idx)}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDragOverIndex(null);
                }}
                onClick={() => startEditingItem(item)}
                className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-xl border transition-all ${
                  isDragOver
                    ? 'border-purple-400 bg-purple-50/70'
                    : isEditing
                    ? 'border-purple-300 bg-purple-50/60'
                    : 'border-transparent bg-[#FAF9FF] hover:bg-purple-50/60 hover:border-purple-100'
                } ${isShareMode ? 'cursor-default' : 'cursor-pointer'} ${
                  isExcluded ? 'opacity-50' : ''
                }`}
              >
                {/* 6-dot drag handle */}
                {!isShareMode && (
                  <span
                    className="text-gray-300 group-hover:text-purple-400 cursor-grab active:cursor-grabbing shrink-0"
                    title="拖拽排序"
                  >
                    <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
                      <circle cx="3" cy="2.5" r="1.2" />
                      <circle cx="9" cy="2.5" r="1.2" />
                      <circle cx="3" cy="7" r="1.2" />
                      <circle cx="9" cy="7" r="1.2" />
                      <circle cx="3" cy="11.5" r="1.2" />
                      <circle cx="9" cy="11.5" r="1.2" />
                    </svg>
                  </span>
                )}

                <FoodIcon iconKey={item.iconKey} size={28} />

                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <span className={`text-sm font-semibold text-[#3B2E58] truncate ${isExcluded ? 'line-through' : ''}`}>
                    {item.name}
                  </span>
                  {Number(item.weight) > 1 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 shrink-0">
                      {item.weight}x
                    </span>
                  )}
                  {isExcluded && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestoreExcluded(item.id);
                      }}
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 shrink-0 cursor-pointer"
                    >
                      恢复
                    </button>
                  )}
                </div>

                {!isShareMode && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteItem(e, item.id)}
                    disabled={items.length <= 1}
                    title={items.length <= 1 ? '至少保留 1 项' : '删除此选项'}
                    aria-label={`删除 ${item.name}`}
                    className={`p-1 rounded-lg transition-colors shrink-0 ${
                      items.length <= 1
                        ? 'text-gray-200 cursor-not-allowed'
                        : 'text-gray-400 hover:text-rose-500 hover:bg-rose-50 cursor-pointer'
                    }`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Inline Editor */}
              {isEditing && !isShareMode && (
                <div className="mt-1 p-3 rounded-xl bg-purple-50/85 border border-purple-200 space-y-2.5 animate-popIn">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={30}
                      placeholder="菜品或店名"
                      className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg bg-white border border-purple-200 focus:outline-none focus:border-purple-500 font-medium"
                    />
                    <button
                      type="button"
                      onClick={saveEditingItem}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer"
                    >
                      确定
                    </button>
                  </div>

                  {/* Weight selector */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-purple-700 font-medium">抽取权重</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setEditWeight(w)}
                          className={`w-6 h-6 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                            editWeight === w
                              ? 'bg-purple-600 text-white'
                              : 'bg-white text-purple-600 hover:bg-purple-100'
                          }`}
                        >
                          {w}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 24-Icon Picker Grid */}
                  <div>
                    <div className="text-[11px] text-purple-600 font-medium mb-1">选择美食图标</div>
                    <div className="grid grid-cols-6 gap-1.5 max-h-28 overflow-y-auto custom-scrollbar p-1 bg-white/80 rounded-lg">
                      {FOOD_ICON_CATALOG.map((icon) => (
                        <button
                          key={icon.key}
                          type="button"
                          onClick={() => setEditIcon(icon.key)}
                          title={icon.label}
                          className={`p-1 rounded-lg flex items-center justify-center cursor-pointer transition-all ${
                            editIcon === icon.key
                              ? 'bg-purple-100 ring-2 ring-purple-500'
                              : 'hover:bg-purple-50'
                          }`}
                        >
                          <FoodIcon iconKey={icon.key} size={22} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom "+ 添加选项" area */}
      {!isShareMode && (
        <div className="p-3 pt-2 border-t border-purple-50">
          {addingItem ? (
            <form onSubmit={handleQuickAddSubmit} className="space-y-2 animate-popIn">
              <div className="flex items-center gap-2 bg-[#F6F3FF] px-2.5 py-1.5 rounded-xl border border-purple-200">
                <FoodIcon iconKey={newItemIcon} size={26} />
                <input
                  ref={addInputRef}
                  type="text"
                  value={newItemName}
                  onChange={(e) => handleNewItemNameChange(e.target.value)}
                  placeholder="输入菜品或店名，回车添加"
                  maxLength={30}
                  className="flex-1 min-w-0 bg-transparent text-sm text-[#2D2346] placeholder-purple-300 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer shrink-0"
                >
                  添加
                </button>
              </div>
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1 overflow-x-auto max-w-[210px] py-0.5">
                  {FOOD_ICON_CATALOG.slice(0, 12).map((ic) => (
                    <button
                      key={ic.key}
                      type="button"
                      onClick={() => {
                        setNewItemIcon(ic.key);
                        setManualIconChosen(true);
                      }}
                      title={ic.label}
                      className={`p-0.5 rounded-md shrink-0 cursor-pointer ${
                        newItemIcon === ic.key ? 'ring-2 ring-purple-500 bg-purple-100' : 'opacity-75 hover:opacity-100'
                      }`}
                    >
                      <FoodIcon iconKey={ic.key} size={18} />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setAddingItem(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer shrink-0"
                >
                  完成
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAddingItem(true)}
              className="w-full py-2.5 rounded-xl font-bold text-sm text-[#6D28D9] bg-[#EFEAFF] hover:bg-[#E5DCFF] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="text-lg leading-none">＋</span>
              <span>添加选项</span>
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Floating Card */}
      <aside
        aria-hidden={collapsed}
        className={`hidden md:block fixed right-4 lg:right-8 top-[calc(50%+28px)] -translate-y-1/2 z-20 transition-all duration-300 ${
          collapsed ? 'translate-x-[calc(100%+80px)] pointer-events-none' : 'translate-x-0'
        }`}
      >
        <div className="relative w-[272px] lg:w-[320px] bg-white/95 backdrop-blur-md rounded-[26px] shadow-[0_18px_45px_rgba(109,40,217,0.14)] border border-white">
          {/* Protruding left purple collapse ear matching mockup */}
          <button
            type="button"
            onClick={onToggleCollapse}
            tabIndex={collapsed ? -1 : 0}
            title="收起我的菜单"
            aria-label="收起我的菜单"
            className={`absolute -left-7 top-1/2 -translate-y-1/2 w-7 h-12 rounded-l-xl flex items-center justify-center text-white shadow-[-4px_4px_12px_rgba(109,40,217,0.22)] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 transition-all duration-200 hover:scale-105 ${
              collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
            style={{
              background: 'linear-gradient(180deg, #A855F7 0%, #8B5CF6 100%)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="rotate-180">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {renderPanelContent(false)}
        </div>
      </aside>

      {/* Desktop Collapsed Re-open Edge Tab */}
      <button
        type="button"
        onClick={onToggleCollapse}
        tabIndex={collapsed ? 0 : -1}
        aria-hidden={!collapsed}
        title="展开我的菜单"
        aria-label="展开我的菜单"
        className={`hidden md:flex fixed right-0 top-[calc(50%+28px)] -translate-y-1/2 z-20 w-9 h-14 rounded-l-2xl items-center justify-center text-white shadow-[-4px_6px_18px_rgba(109,40,217,0.28)] cursor-pointer hover:w-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 transition-all duration-300 ${
          collapsed ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
        }`}
        style={{
          background: 'linear-gradient(180deg, #A855F7 0%, #7C3AED 100%)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Mobile Bottom Trigger Pill */}
      <div className="md:hidden fixed bottom-4 right-4 z-30">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full text-white font-bold text-sm shadow-[0_10px_24px_rgba(109,40,217,0.38)] cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)',
          }}
        >
          <span>📋 {activeMenu?.name || '我的菜单'}</span>
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-white/25">{items.length}</span>
        </button>
      </div>

      {/* Mobile Bottom Sheet Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/35 backdrop-blur-sm">
          <div className="flex-1" onClick={() => setMobileOpen(false)} />
          <div className="bg-white rounded-t-[28px] shadow-2xl max-h-[82vh] flex flex-col animate-popIn">
            {renderPanelContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
