import EventEmitter from 'events'
import Scheduler from './Scheduler'

export default class Drawlr extends EventEmitter {
  constructor(options) {
    super()
    if (typeof options !== 'undefined') {
      this.scheduler = new Scheduler(options, this)
    }
  }

  start() {
    this.scheduler.start()
  }

  export() {
    return this.scheduler.export()
  }

  static from(data) {
    const drawlr = new Drawlr()
    drawlr.scheduler = Scheduler.from(data, drawlr)
    return drawlr
  }
}
