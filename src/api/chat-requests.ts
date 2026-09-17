/** 每个账号/标的一条待确认消息；请求编号写入成功后才允许发送。
 * sessionStorage 保存请求正文及编号，不保存认证令牌；刷新页面后仍能以原编号重试。
 */
export interface PendingChatRequest { requestId: string; stockCode: string; message: string }
interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export class PendingChatRequestError extends Error {
  constructor(public readonly pending: PendingChatRequest) { super('上一条消息结果尚未确认，已恢复原消息，请重试确认') }
}
export function createChatOutbox(storage: StoragePort, newId: () => string) {
  const key = (owner: string, code: string) => 'zeroquant_pending_chat:' + encodeURIComponent(owner) + ':' + code
  const pending = (owner: string, code: string): PendingChatRequest | null => {
    const raw = storage.getItem(key(owner, code))
    if (!raw) return null
    // 损坏的记录不能静默替换为新编号，避免重复执行已经提交的成交。
    const value = JSON.parse(raw) as PendingChatRequest
    if (!value || typeof value.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.requestId)
      || value.stockCode !== code || typeof value.message !== 'string' || !value.message || value.message.length > 8000) throw new Error('待确认消息记录损坏，请先核对成交记录，不能自动重新发送')
    return value
  }
  return {
    pending,
    prepare(owner: string, stockCode: string, message: string): PendingChatRequest {
      const previous = pending(owner, stockCode)
      if (previous) {
        if (previous.message !== message) throw new PendingChatRequestError(previous)
        return previous
      }
      const value = { requestId: newId(), stockCode, message }
      storage.setItem(key(owner, stockCode), JSON.stringify(value))
      return value
    },
    complete(owner: string, code: string, requestId: string) {
      if (pending(owner, code)?.requestId === requestId) storage.removeItem(key(owner, code))
    },
  }
}
/** 仅用于本地 outbox 分区；身份授权始终由服务端验证 JWT，不能信任客户端解析。 */
export function chatOwner(token: string | null): string {
  if (!token) throw new Error('请先登录')
  const part = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/')
  if (!part) throw new Error('登录状态无效')
  const subject: unknown = JSON.parse(atob(part)).sub
  if (typeof subject !== 'string' || !subject || subject.length > 100) throw new Error('登录状态无效')
  return subject
}
