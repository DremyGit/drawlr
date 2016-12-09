import { BloomFilter } from 'bloomfilter'
import EventEmitter from 'events'
import debug from 'debug'

const log = debug('BloomQueue:log')
const error = debug('BloomQueue:error')

export default class BloomQueue extends EventEmitter {

  constructor(array, n = 2000, p = 0.001) {
    super()

    const bitNum = -n * Math.log(p) / (Math.LN2 * Math.LN2)
    const hashNum = bitNum / n * Math.LN2
    this.filter = new BloomFilter(Math.ceil(bitNum), Math.ceil(hashNum))

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
    if (this._notExisted(item)) {
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
      if (this._notExisted(item)) {
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


  export() {
    return {
      queue: this.queue,
      buckets: [].slice.call(this.filter.buckets),
      k: this.filter.k,
    }
  }

  static from(data) {
    const bloomQueue = new BloomQueue(data.queue)
    bloomQueue.filter = new BloomFilter(data.buckets, data.k)
    return bloomQueue
  }

  _notExisted(item) {
    return !this.filter.test(item)
  }
}
