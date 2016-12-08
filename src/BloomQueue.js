import { BloomFilter } from 'bloomfilter'
import EventEmitter from 'events'
import debug from 'debug'

const log = debug('BloomQueue:log')
const error = debug('BloomQueue:error')

export default class BloomQueue extends EventEmitter {

  constructor(array) {
    super()
    this.filter = new BloomFilter(32 * 256, 8)
    this.queue = []
    if (typeof array !== 'undefined') {
      this.enqueueArray(array)
    }
    log('New BloomQueue created')
  }

  size() {
    return this.queue.length
  }

  enqueue(item) {
    if (this.notExisted(item)) {
      this.filter.add(item)
      this.queue.push(item)
      log('%s enqueue, size is %d', item, this.size())
      this.emit('enqueue', item)
    }
    return this
  }


  enqueueArray(items) {
    const enqueueArr = []
    if (Object.prototype.toString.call(items) !== '[object Array]') {
      return this
    }

    items.forEach(item => {
      if (this.notExisted(item)) {
        this.filter.add(item)
        enqueueArr.push(item)
      }
    })
    if (enqueueArr.length !== 0) {
      enqueueArr.forEach(item => {
        this.queue.push(item)
      })

      log('%d items enqueue, size is %d', enqueueArr.length, this.size())
      this.emit('enqueueArray', enqueueArr)
    }
    return this
  }

  dequeue() {
    if (this.isEmpty()) {
      error('Queue is empty')
      return undefined
    }
    const item = this.queue.shift()
    log('%s dequeue, size is %d', item, this.size())
    this.emit('dequeue', item)
    return item
  }

  isEmpty() {
    return this.size() === 0
  }

  notExisted(item) {
    return !this.filter.test(item)
  }
}
