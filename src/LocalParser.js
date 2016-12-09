import EventEmitter from 'events'
import debug from 'debug'
import { parse2Links } from './Utils'

const log = debug('LocalParser:log')

export default class LocalParser extends EventEmitter {

  constructor(id) {
    super()
    this.id = id
  }

  parse2Links(html, currLink) {
    setImmediate(() => {
      log('Parser %d begin parse links in %s', this.id, currLink)
      this.emit('links', parse2Links(html, currLink))
    })
  }

  eval(func, html, link, group) {
    setImmediate(() => {
      log('Parser %d begin eval func in %s - %s', this.id, link, group)
      this.emit('eval', func(html, link, group), html, link, group)
    })
  }

}
