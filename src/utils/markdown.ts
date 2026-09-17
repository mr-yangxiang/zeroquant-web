/** 安全的有限 Markdown 渲染：先转义全部 HTML，再仅生成受控标签，不接受外部 HTML。 */
export function formatMarkdownToHtml(content: string): string {
  if (!content) return ''
  return content
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-300 font-bold">$1</strong>')
    .replace(/^### (.*$)/gim, '<h3 class="text-xs font-black text-cyan-400 border-b border-slate-800 pb-1 my-1">$1</h3>')
    .replace(/^- (.*$)/gim, '<div class="pl-2 flex items-start gap-1.5"><span class="text-cyan-400 font-bold">•</span><span>$1</span></div>')
}
