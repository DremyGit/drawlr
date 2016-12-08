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

  _onMessage({ type, payload }) {
    switch (type) {
      case 'links':
        this.emit('links', payload.links)
        break

      default:
        break
    }
  }

}
