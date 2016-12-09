import path from 'path'
import childProcess from 'child_process'
import EventEmitter from 'events'
import debug from 'debug'

const log = debug('Parser:log')

export default class Parser extends EventEmitter {

  constructor(id) {
    super()
    this.id = id
    this.parser = childProcess.fork(path.join(__dirname, './ParserProcess.js'))
    this.parser.on('message', this._onMessage.bind(this))
  }

  parse2Links(html, currLink) {
    log('Parser %d begin parse links in %s', this.id, currLink)
    this.parser.send({
      type: 'links',
      payload: {
        html,
        currLink,
      },
    })
  }

  eval(func, html, link, group) {
    log('Parser %d begin eval func in %s - %s', this.id, link, group)
    let funcStr = func.toString()
    if (!/^function/.test(funcStr)) {
      funcStr = 'function ' + funcStr
    }
    this.parser.send({
      type: 'eval',
      payload: {
        func: funcStr,
        html,
        link,
        group,
      },
    })
  }

  _onMessage({ type, payload }) {
    switch (type) {
      case 'links':
        this.emit('links', payload.links)
        break

      case 'eval':
        this.emit('eval', payload.result, payload.html, payload.link, payload.group)
        break

      default:
        break
    }
  }

}
