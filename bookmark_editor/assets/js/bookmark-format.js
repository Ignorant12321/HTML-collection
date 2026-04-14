import { state, uid, reseedIds } from "./state.js";

function escapeAttr(s=""){
  return String(s).replace(/[&<>\"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[ch]));
}

export function parseBookmarkHtml(input){
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, "text/html");
  const mainDL = doc.querySelector("DL");
  state.nextId = 1;

  function readDL(dl){
    const items = [];
    if (!dl) return items;
    const children = Array.from(dl.children);
    for (let i=0; i<children.length; i++){
      const node = children[i];
      if (node.tagName !== "DT") continue;
      const folderHeader = node.querySelector(":scope > H3");
      const link = node.querySelector(":scope > A");
      if (folderHeader){
        let next = node.nextElementSibling;
        if (!next || next.tagName !== "DL") next = node.querySelector(":scope > DL");
        items.push({
          id: uid(),
          type: "folder",
          title: folderHeader.textContent?.trim() || "未命名文件夹",
          addDate: folderHeader.getAttribute("ADD_DATE") || "",
          lastModified: folderHeader.getAttribute("LAST_MODIFIED") || "",
          personalToolbarFolder: folderHeader.getAttribute("PERSONAL_TOOLBAR_FOLDER") || "",
          children: readDL(next),
        });
      } else if (link){
        items.push({
          id: uid(),
          type: "bookmark",
          title: link.textContent?.trim() || link.getAttribute("HREF") || "未命名网址",
          href: link.getAttribute("HREF") || "",
          addDate: link.getAttribute("ADD_DATE") || "",
          icon: link.getAttribute("ICON") || "",
          lastModified: link.getAttribute("LAST_MODIFIED") || "",
        });
      }
    }
    return items;
  }

  return { id:uid(), type:"folder", title:"全部收藏", addDate:"", lastModified:"", children: readDL(mainDL) };
}

export function serializeBookmarkHtml(root){
  function escText(s=""){
    return String(s).replace(/[&<>]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[ch]));
  }
  function escAttr(s=""){
    return String(s).replace(/[&<>\"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[ch]));
  }
  function folderToHtml(folder, depth=1){
    const indent = "    ".repeat(depth);
    const h3Attrs = [
      folder.addDate ? `ADD_DATE="${escAttr(folder.addDate)}"` : "",
      folder.lastModified ? `LAST_MODIFIED="${escAttr(folder.lastModified)}"` : "",
      folder.personalToolbarFolder ? `PERSONAL_TOOLBAR_FOLDER="${escAttr(folder.personalToolbarFolder)}"` : "",
    ].filter(Boolean).join(" ");
    let html = `${indent}<DT><H3${h3Attrs ? " " + h3Attrs : ""}>${escText(folder.title)}</H3>\n`;
    html += `${indent}<DL><p>\n`;
    for (const child of folder.children){
      if (child.type === "folder") html += folderToHtml(child, depth+1);
      else {
        const attrs = [
          child.href ? `HREF="${escAttr(child.href)}"` : `HREF=""`,
          child.addDate ? `ADD_DATE="${escAttr(child.addDate)}"` : "",
          child.icon ? `ICON="${escAttr(child.icon)}"` : "",
          child.lastModified ? `LAST_MODIFIED="${escAttr(child.lastModified)}"` : "",
        ].filter(Boolean).join(" ");
        html += `${indent}    <DT><A ${attrs}>${escText(child.title)}</A>\n`;
      }
    }
    html += `${indent}</DL><p>\n`;
    return html;
  }

  const head = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`;

  const body = root.children.map(child => child.type === "folder"
    ? folderToHtml(child, 1)
    : `    <DT><A HREF="${escapeAttr(child.href || "")}"${child.addDate ? ` ADD_DATE="${escapeAttr(child.addDate)}"` : ""}>${child.title || ""}</A>\n`
  ).join("");

  return head + body + `</DL><p>\n`;
}

export function importJson(text){
  const data = JSON.parse(text);
  return reseedIds(data);
}
