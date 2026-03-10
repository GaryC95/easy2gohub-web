import JSZip from "jszip";

export async function zipFiles(files: { name: string; blob: Blob }[], zipName = "easy2gohub.zip") {
  const zip = new JSZip();

  for (const f of files) {
    zip.file(f.name, f.blob);
  }

  const content = await zip.generateAsync({ type: "blob" });

  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipName;
  a.click();

  // small delay helps some browsers finish download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
