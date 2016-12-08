import EventEmitter from 'events'
import request from 'request'
import debug from 'debug'

const log = debug('Crawler:log')
const success = debug('Crawler:success')
const error = debug('Crawler:error')

export default class Crawler extends EventEmitter {

  constructor(id) {
    super()
    this.id = id
    this.isIdle = true
    log('Crawler %d created', id)
  }

  pick(url) {
    if (this.isIdle) {
      this.isIdle = false
      log('Crawler %d pick and request %s', this.id, url)
      this._doRequest(url, html => {
        this.isIdle = true
        this.emit('html', html, url, this.id)
      })
    }
  }

  _doRequest(url, callback) {
    request(url, {
      timeout: 500,
    }, (err, res, html) => {
      if (!err && res.statusCode === 200) {
        success('Crawler %d request url: %s successfully', this.id, url)
        if (callback) {
          callback(html)
        }
      } else {
        error('Crawler %d request url %s Error: %s', this.id, url, err && err.message || res.statusCode)
      }
    })
  }
}
