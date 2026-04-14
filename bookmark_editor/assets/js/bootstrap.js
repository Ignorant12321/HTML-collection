import { state, createFolder } from "./state.js";
import { downloadText } from "./utils.js";
import { serializeBookmarkHtml } from "./bookmark-format.js";
import { createActions } from "./actions.js";
import { renderTree, renderMoveTree } from "./render-tree.js";
import { renderList, renderStats } from "./render-list.js";
import { renderEditor } from "./render-editor.js";

function collectDom(){
  return {
    importMenuBtn: document.getElementById("importMenuBtn"),
    importMenuWrap: document.getElementById("importMenuWrap"),
    exportMenuBtn: document.getElementById("exportMenuBtn"),
    exportMenuWrap: document.getElementById("exportMenuWrap"),

    actionImportHtml: document.getElementById("actionImportHtml"),
    actionImportJson: document.getElementById("actionImportJson"),
    actionLoadSample: document.getElementById("actionLoadSample"),
    actionExportHtml: document.getElementById("actionExportHtml"),
    actionExportJson: document.getElementById("actionExportJson"),

    fileHtml: document.getElementById("fileHtml"),
    fileJson: document.getElementById("fileJson"),

    searchInput: document.getElementById("searchInput"),
    btnClearSearch: document.getElementById("btnClearSearch"),
    searchScope: document.getElementById("searchScope"),
    typeFilter: document.getElementById("typeFilter"),
    btnResetFilters: document.getElementById("btnResetFilters"),
    themeToggleBtn: document.getElementById("themeToggleBtn"),

    btnAddFolderCenter: document.getElementById("btnAddFolderCenter"),
    btnAddBookmark: document.getElementById("btnAddBookmark"),
    btnSave: document.getElementById("btnSave"),
    btnDelete: document.getElementById("btnDelete"),
    btnMove: document.getElementById("btnMove"),

    moveModalMask: document.getElementById("moveModalMask"),
    btnCloseMoveModal: document.getElementById("btnCloseMoveModal"),
    btnCancelMove: document.getElementById("btnCancelMove"),
    btnConfirmMove: document.getElementById("btnConfirmMove"),

    splitterLeft: document.getElementById("splitterLeft"),
    splitterRight: document.getElementById("splitterRight"),

    tree: document.getElementById("tree"),
    moveTree: document.getElementById("moveTree"),
    list: document.getElementById("list"),
    listTitle: document.getElementById("listTitle"),
    listStats: document.getElementById("listStats"),
    breadcrumbs: document.getElementById("breadcrumbs"),
    stats: document.getElementById("stats"),

    editorEmpty: document.getElementById("editorEmpty"),
    editorForm: document.getElementById("editorForm"),
    editorType: document.getElementById("editorType"),
    fieldUrl: document.getElementById("fieldUrl"),
    editTitle: document.getElementById("editTitle"),
    editHref: document.getElementById("editHref"),
    editAddDate: document.getElementById("editAddDate"),
    editLastModified: document.getElementById("editLastModified"),
  };
}

function setupMenu(btn, wrap){
  btn.onclick = e => {
    e.stopPropagation();
    document.querySelectorAll(".menu-wrap").forEach(x => x !== wrap && x.classList.remove("open"));
    wrap.classList.toggle("open");
  };
}

function setupSplitter(splitter, side){
  let startX = 0;
  let startVal = 0;
  splitter.addEventListener("mousedown", e => {
    if (window.innerWidth <= 860) return;
    startX = e.clientX;
    startVal = parseInt(getComputedStyle(document.documentElement).getPropertyValue(side === "left" ? "--left" : "--right"), 10);
    splitter.classList.add("dragging");

    const onMove = ev => {
      const delta = ev.clientX - startX;
      const val = side === "left" ? startVal + delta : startVal - delta;
      const clamped = Math.max(220, Math.min(560, val));
      document.documentElement.style.setProperty(side === "left" ? "--left" : "--right", clamped + "px");
    };

    const onUp = () => {
      splitter.classList.remove("dragging");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });
}

export function bootstrapApp(){
  const dom = collectDom();
  const runtime = { state, dom };

  const actions = createActions(runtime);
  runtime.actions = actions;

  runtime.renderTree = () => renderTree(runtime);
  runtime.renderMoveTree = () => renderMoveTree(runtime);
  runtime.renderStats = () => renderStats(runtime);
  runtime.renderList = () => renderList(runtime);
  runtime.renderEditor = () => renderEditor(runtime);
  runtime.render = () => {
    runtime.renderStats();
    runtime.renderTree();
    runtime.renderList();
    runtime.renderEditor();
    dom.btnClearSearch.classList.toggle("show", !!state.search);
  };

  setupMenu(dom.importMenuBtn, dom.importMenuWrap);
  setupMenu(dom.exportMenuBtn, dom.exportMenuWrap);
  document.addEventListener("click", () => document.querySelectorAll(".menu-wrap").forEach(x => x.classList.remove("open")));

  dom.actionImportHtml.onclick = () => dom.fileHtml.click();
  dom.actionImportJson.onclick = () => dom.fileJson.click();
  dom.actionLoadSample.onclick = actions.loadPreloaded;

  dom.actionExportHtml.onclick = () => {
    if (!state.root) return alert("请先导入或载入收藏数据。");
    downloadText("bookmarks_edited.html", serializeBookmarkHtml(state.root), "text/html;charset=utf-8");
  };

  dom.actionExportJson.onclick = () => {
    if (!state.root) return alert("请先导入或载入收藏数据。");
    downloadText("bookmarks_backup.json", JSON.stringify(state.root, null, 2), "application/json;charset=utf-8");
  };

  dom.btnAddFolderCenter.onclick = actions.addFolder;
  dom.btnAddBookmark.onclick = actions.addBookmark;
  dom.btnSave.onclick = actions.saveEditor;
  dom.btnDelete.onclick = actions.deleteSelected;
  dom.btnMove.onclick = actions.openMoveModal;
  dom.btnCloseMoveModal.onclick = actions.closeMoveModal;
  dom.btnCancelMove.onclick = actions.closeMoveModal;
  dom.btnConfirmMove.onclick = actions.confirmMove;
  dom.moveModalMask.addEventListener("click", e => {
    if (e.target.id === "moveModalMask") actions.closeMoveModal();
  });

  dom.searchInput.addEventListener("input", e => {
    state.search = e.target.value;
    runtime.render();
  });
  dom.btnClearSearch.addEventListener("click", () => {
    state.search = "";
    dom.searchInput.value = "";
    runtime.render();
  });
  dom.searchScope.addEventListener("change", e => {
    state.searchScope = e.target.value;
    runtime.render();
  });
  dom.typeFilter.addEventListener("change", e => {
    state.typeFilter = e.target.value;
    runtime.render();
  });
  dom.btnResetFilters.addEventListener("click", () => {
    actions.restoreOriginalData();
    state.search = "";
    state.searchScope = "all";
    state.typeFilter = "all";
    dom.searchInput.value = "";
    dom.searchScope.value = "all";
    dom.typeFilter.value = "all";
    runtime.render();
  });
  dom.themeToggleBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    actions.applyTheme(current === "dark" ? "light" : "dark");
  });

  dom.fileHtml.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    actions.importHtmlText(await file.text());
    e.target.value = "";
  });

  dom.fileJson.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    actions.importJsonText(await file.text());
    e.target.value = "";
  });

  setupSplitter(dom.splitterLeft, "left");
  setupSplitter(dom.splitterRight, "right");

  actions.initTheme();
  actions.setRoot(createFolder("全部收藏"));
}
