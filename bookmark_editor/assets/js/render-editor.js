import { state } from "./state.js";
import { findById } from "./tree-model.js";

export function renderEditor(runtime){
  const { dom } = runtime;
  const info = findById(state.selectedItemId);
  if (!info){
    dom.editorEmpty.classList.remove("hidden");
    dom.editorForm.classList.add("hidden");
    dom.editorType.textContent = "未选择";
    return;
  }

  const item = info.node;
  const isFolder = item.type === "folder";
  dom.editorEmpty.classList.add("hidden");
  dom.editorForm.classList.remove("hidden");
  dom.editorType.textContent = isFolder ? "文件夹" : "网址";
  dom.fieldUrl.classList.toggle("hidden", isFolder);
  dom.editTitle.value = item.title || "";
  dom.editHref.value = item.href || "";
  dom.editAddDate.value = item.addDate || "";
  dom.editLastModified.value = item.lastModified || "";
}
