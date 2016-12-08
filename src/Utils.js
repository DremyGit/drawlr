import URL from 'url'
import debug from 'debug'

const log = debug('Utils:log')

export function parse2Links(html, currLink) {
  const reg = /href="([^"]+?)"/g
  const matchArr = []
  let match
  while ((match = reg.exec(html)) !== null) {
    const link = URL.resolve(currLink, match[1])
    const url = URL.parse(link, false, true)
    url.protocol = url.protocol || URL.parse(currLink).protocol
    url.hash = null
    if (/https?/.test(url.protocol)) {
      matchArr.push(URL.format(url))
      // log('[Parse2Links] Find link: %s, from %s', URL.format(url), match[1])
    }
  }
  return matchArr
}
