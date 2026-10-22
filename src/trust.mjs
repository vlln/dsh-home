/**
 * 跨站请求围栏：首页路由会读本机会话的统计，不能让任意网页借用户的浏览器打它。
 * 规则：**带 `Origin` 的请求必须同源**；没有 `Origin` 的请求（curl、本地脚本）放行。
 * 同源判定比较 `Origin.host` 与 `Host`——两者都由浏览器按当前页面/请求生成。
 *
 * @module @vlln/dsh-home/trust
 */

/**
 * @param req node HTTP 请求
 * @returns 是否允许继续处理
 */
export function isSameOrigin(req) {
  const origin = req.headers.origin
  if (typeof origin !== 'string' || origin === '') return true
  const host = req.headers.host
  if (typeof host !== 'string' || host === '') return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
