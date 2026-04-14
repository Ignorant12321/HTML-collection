import { state, cloneDeep, reseedIds, createFolder, createBookmark } from "./state.js";
import { PRELOADED_BOOKMARK_HTML_BASE64 } from "./constants.js";
import { decodeBase64Utf8 } from "./utils.js";
import { parseBookmarkHtml, importJson } from "./bookmark-format.js";
import { findById, findParentOf, getCurrentFolder, expandPath, moveItemToFolder } from "./tree-model.js";

/**
 * Node shape docs:
 * FolderNode: { id, type:"folder", title, addDate, lastModified, personalToolbarFolder?, children: BookmarkNode[] }
 * LinkNode: { id, type:"bookmark", title, href, addDate, lastModified, icon? }
 * BookmarkNode: FolderNode | LinkNode
 */
export function selectFolder(runtime, id){
  state.selectedFolderId = id;
  state.selectedItemId = id;
  expandPath(id);
  runtime.render();
}

export function selectItem(runtime, id){
  const info = findById(id);
  if (!info) return;
  state.selectedItemId = id;
  if (info.node.type === "folder") expandPath(id);
  runtime.renderEditor();
  runtime.renderList();
  runtime.renderTree();
}

export function saveEditor(runtime){
  const { dom } = runtime;
  const info = findById(state.selectedItemId);
  if (!info) return;
  const item = info.node;
  item.title = dom.editTitle.value.trim() || (item.type === "folder" ? "未命名文件夹" : "未命名网址");
  item.addDate = dom.editAddDate.value.trim();
  item.lastModified = dom.editLastModified.value.trim();
  if (item.type === "bookmark") item.href = dom.editHref.value.trim();
  runtime.render();
}

export function deleteSelected(runtime){
  const itemId = state.selectedItemId;
  const owner = findParentOf(itemId);
  const item = findById(itemId)?.node;
  if (!owner || !item) return alert("根目录不能删除。");
  if (!confirm(`确定删除“${item.title}”吗？`)) return;
  owner.children = owner.children.filter(c => c.id !== itemId);
  state.selectedItemId = owner.id;
  state.selectedFolderId = owner.id;
  runtime.render();
}

export function addFolder(runtime){
  const folder = getCurrentFolder();
  const node = createFolder();
  folder.children.unshift(node);
  state.expanded.add(folder.id);
  state.selectedItemId = node.id;
  runtime.render();
}

export function addBookmark(runtime){
  const folder = getCurrentFolder();
  const node = createBookmark();
  folder.children.unshift(node);
  state.expanded.add(folder.id);
  state.selectedItemId = node.id;
  runtime.render();
}

export function openMoveModal(runtime){
  const { dom } = runtime;
  const info = findById(state.selectedItemId);
  if (!info) return;
  state.moveTargetFolderId = findParentOf(info.node.id)?.id || state.root.id;
  dom.moveModalMask.classList.add("open");
  state.expanded.add(state.root.id);
  runtime.renderMoveTree();
}

export function closeMoveModal(runtime){
  runtime.dom.moveModalMask.classList.remove("open");
}

export function confirmMove(runtime){
  const itemId = state.selectedItemId;
  const targetFolderId = state.moveTargetFolderId;
  if (!itemId || !targetFolderId) return;
  moveItemToFolder(itemId, targetFolderId);
  closeMoveModal(runtime);
  runtime.render();
}

export function setRoot(runtime, root, options={}){
  state.root = root;
  if (options.rememberOriginal !== false) state.originalRoot = cloneDeep(root);
  state.selectedFolderId = root.id;
  state.selectedItemId = root.id;
  state.expanded = new Set([root.id]);
  runtime.render();
}

export function loadPreloaded(runtime){
  setRoot(runtime, parseBookmarkHtml(decodeBase64Utf8(PRELOADED_BOOKMARK_HTML_BASE64)), {rememberOriginal:true});
}

export function restoreOriginalData(runtime){
  if (!state.originalRoot) return;
  const restored = reseedIds(cloneDeep(state.originalRoot));
  setRoot(runtime, restored, {rememberOriginal:false});
}

export function applyTheme(runtime, theme){
  document.documentElement.setAttribute("data-theme", theme);
  if (runtime.dom.themeToggleBtn) runtime.dom.themeToggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
  localStorage.setItem("bookmark_editor_theme", theme);
}

export function initTheme(runtime){
  const saved = localStorage.getItem("bookmark_editor_theme");
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(runtime, saved || (prefersDark ? "dark" : "light"));
}

export function importHtmlText(runtime, text){
  setRoot(runtime, parseBookmarkHtml(text));
}

export function importJsonText(runtime, text){
  setRoot(runtime, importJson(text), {rememberOriginal:true});
}

export function createActions(runtime){
  return {
    saveEditor: () => saveEditor(runtime),
    deleteSelected: () => deleteSelected(runtime),
    addFolder: () => addFolder(runtime),
    addBookmark: () => addBookmark(runtime),
    openMoveModal: () => openMoveModal(runtime),
    closeMoveModal: () => closeMoveModal(runtime),
    confirmMove: () => confirmMove(runtime),
    restoreOriginalData: () => restoreOriginalData(runtime),
    applyTheme: theme => applyTheme(runtime, theme),
    initTheme: () => initTheme(runtime),
    selectFolder: id => selectFolder(runtime, id),
    selectItem: id => selectItem(runtime, id),
    setRoot: (root, options) => setRoot(runtime, root, options),
    loadPreloaded: () => loadPreloaded(runtime),
    importHtmlText: text => importHtmlText(runtime, text),
    importJsonText: text => importJsonText(runtime, text),
  };
}
