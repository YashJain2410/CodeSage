import { unzip } from 'fflate';
export async function readSourceFiles(file: File): Promise<Record<string, string>> {
  if (!file.name.toLowerCase().endsWith('.zip')) return { [file.name]: await file.text() };
  const buffer = new Uint8Array(await file.arrayBuffer());
  let total = 0,
    count = 0;
  const extracted = await new Promise<Record<string, Uint8Array>>((resolve, reject) =>
    unzip(
      buffer,
      {
        filter: (entry) => {
          const allowed =
            /\.(py|js|jsx|ts|tsx|go|rs|java|cpp|c|h|rb|swift|kt|cs|vue|svelte|json|md|txt)$/.test(
              entry.name,
            ) &&
            !/(^|\/)(node_modules|\.git|__MACOSX|dist|build)\//.test(entry.name) &&
            !/(^|\/)\.env/.test(entry.name);
          if (
            !allowed ||
            entry.originalSize > 1_000_000 ||
            total + entry.originalSize > 10_000_000 ||
            count >= 2000
          )
            return false;
          total += entry.originalSize;
          count++;
          return true;
        },
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    ),
  );
  const paths = Object.keys(extracted),
    roots = new Set(paths.filter((p) => p.includes('/')).map((p) => p.split('/')[0]));
  const singleRoot = roots.size === 1 && paths.every((p) => p.includes('/'));
  const text: Record<string, string> = {};
  for (const [path, bytes] of Object.entries(extracted)) {
    if (path.split('/').includes('..')) continue;
    const content = new TextDecoder().decode(bytes);
    text[path] = content;
    if (singleRoot) text[path.split('/').slice(1).join('/')] = content;
  }
  return text;
}
