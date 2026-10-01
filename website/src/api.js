const BASE = import.meta.env.BASE_URL;

function staticFileUrl(relPath) {
  const encoded = `${relPath}.json`
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return `${BASE}data/files/${encoded}`;
}

export async function loadCatalog() {
  const url = import.meta.env.DEV ? "/api/catalog" : `${BASE}data/catalog.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("catalog");
  return res.json();
}

export async function loadNote(relPath) {
  if (import.meta.env.DEV) {
    const res = await fetch(`/api/file?path=${encodeURIComponent(relPath)}`);
    if (!res.ok) throw new Error("missing");
    return res.json();
  }
  const res = await fetch(staticFileUrl(relPath));
  if (!res.ok) throw new Error("missing");
  return res.json();
}
