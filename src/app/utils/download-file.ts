export function downloadFile(document: Document, blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = name;
  link.click();
  // revoking right away can cancel the download in some browsers
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
