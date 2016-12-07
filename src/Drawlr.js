import EventEmitter from 'events'
import Scheduler from './Scheduler'

export default class Drawlr extends EventEmitter {
  constructor(options) {
    super()
    this.scheduler = new Scheduler(options, this)
  }

  start() {
    this.scheduler.start()
  }
}
