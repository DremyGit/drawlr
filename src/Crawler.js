import EventEmitter from 'events'
import request from 'request'
import debug from 'debug'
import { isArray, randomInArray } from './Utils'

const log = debug('Crawler:log')
const success = debug('Crawler:success')
const error = debug('Crawler:error')

export default class Crawler extends EventEmitter {

  constructor(options, id) {
    super()
    this.id = id
    this.options = {
      headers: {},
      timeout: 5000,
      ...options,
    }
    this.isIdle = true
    log('Crawler %d created', id)
  }

  pick(url) {
    if (this.isIdle) {
      this.isIdle = false
      log('Crawler %d pick and request %s', this.id, url)
      this._doRequest(url, (err, html) => {
        this.isIdle = true
        if (err) {
          this.emit('error', err, url, this.id)
        } else {
          this.emit('success', html, url, this.id)
        }
      })
    } else {
      error('Crawler %d is busy', this.id)
      this.emit('error', new Error('Crawler ' + this.id + ' is busy'), url, this.id)
    }
  }

  _doRequest(url, callback) {
    request.get(url, {
      headers: this._getHeaders(),
      timeout: this.options.timeout,
    }, (err, res, html) => {
      if (!err && res.statusCode === 200) {
        success('Crawler %d request url: %s successfully', this.id, url)
        if (callback) {
          callback(null, html, res)
        }
      } else {
        error('Crawler %d request url %s Error: %s', this.id, url, err && err.message || res.statusCode)
        if (callback) {
          callback(err, '', res)
        }
      }
    })
  }

  _getHeaders() {
    const headers = this.options.headers
    const requestHeaders = {}
    Object.keys(headers).forEach(field => {
      if (isArray(headers[field])) {
        requestHeaders[field] = randomInArray(headers[field])
      } else {
        requestHeaders[field] = headers[field]
      }
    })
    return requestHeaders
  }
}
