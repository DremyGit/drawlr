import URL from 'url'
import debug from 'debug'
import { isMatch } from 'micromatch'
import Crawler from './Crawler'
import { LocalParser, ForkParser } from './Parser'
import BloomQueue from './BloomQueue'

const log = debug('Scheduler:log')

export default class Scheduler {

  constructor(options, drawlr) {
    this.options = {
      entry: undefined,
      pass: '/**',
      target: {},
      parser: {},
      headers: {},
      timeout: 5000,
      requestNum: 2,
      parserProcessNum: 0,
      sleep: 0,
      ...options,
    }
    this.drawlr = drawlr

    this.initOptions()
    this.initWaitingQueue()
    this.initCrawlers()
    this.initParsers()
    log('Scheduler inited, entry: %s, pass: %s, target: %s, requestNum: %d, parserProcessNum: %d',
      this.options.entry, this.options.pass, this.options.target,
      this.options.requestNum, this.options.parserProcessNum)
  }

  initOptions() {
    function urlFormat(url, relativeUrl) {
      if (/^https?:\/\//.test(url)) {
        return url
      }
      url = URL.parse(url)
      url.protocol = url.protocol || relativeUrl.protocol || 'http'
      if (!/^https?/.test(url.protocol)) {
        throw new Error(`Unsupported protocol ${url.protocol}`)
      }
      url.host = url.host || relativeUrl.host
      return URL.format(url)
    }

    this.options.entry = urlFormat(this.options.entry)

    const relativeUrl = URL.parse(this.options.entry)


    const target = this.options.target
    Object.keys(target).forEach(group => {
      if (Object.prototype.toString.call(target[group]) !== '[object Array]') {
        target[group] = [target[group]]
      }
      target[group] = target[group].map(partten => urlFormat(partten, relativeUrl))
    })

    if (Object.prototype.toString.call(this.options.pass) !== '[object Array]') {
      this.options.pass = [this.options.pass]
    }
    this.options.pass = this.options.pass.map(url => urlFormat(url, relativeUrl))
              .concat(Object.keys(target).map(group => target[group])
                .reduce((prev, parttens) => prev.concat(parttens), []))
              .filter((url, index, arr) => index === arr.indexOf(url))
  }

  initCrawlers() {
    this.crawlers = []
    for (let i = 0; i < this.options.requestNum; i++) {
      const crawler = new Crawler({
        headers: this.options.headers,
        timeout: this.options.timeout,
      }, i)
      crawler.on('success', this.onCrawlerSuccess.bind(this))
      crawler.on('error', this.onCrawlerError.bind(this))
      this.crawlers.push(crawler)
    }
  }

  initParsers() {
    this.parsers = []
    if (this.options.parserProcessNum !== 0) {
      for (let i = 0; i < this.options.parserProcessNum; i++) {
        this.parsers.push(new ForkParser(i))
      }
    } else {
      this.parsers.push(new LocalParser(0))
    }

    this.parsers.forEach(parser => {
      parser.on('links', this.parserOnLinks.bind(this))
      parser.on('eval', this.parserOnEval.bind(this))
    })
  }

  initWaitingQueue() {
    this.waitingQueue = new BloomQueue()
    this.waitingQueue.on('enqueueArray', this.wqOnEnqueueArray.bind(this))
  }

  start() {
    process.nextTick(() => {
      log('Scheduler start')
      if (this.waitingQueue.size() === 0) {
        this.waitingQueue.enqueueArray([this.options.entry])
      } else {
        this.scheduleCrawler()
      }
    })
  }

  _isMatchUrl(linkUrl, parttenUrl) {
    return parttenUrl.host === linkUrl.host
        && parttenUrl.protocol === linkUrl.protocol
        && isMatch(linkUrl.pathname, parttenUrl.pathname)
  }

  _isMatchParttens(link, parttens) {
    const linkUrl = URL.parse(link)
    for (let i = 0; i < parttens.length; i++) {
      const parttenUrl = URL.parse(parttens[i])
      if (this._isMatchUrl(linkUrl, parttenUrl)) {
        return true
      }
    }
    return false
  }

  parserOnLinks(links) {
    const matchedLinks = this.options.pass.map(partten => {
      const parttenUrl = URL.parse(partten)
      return links.filter(link => this._isMatchUrl(URL.parse(link), parttenUrl))
    }).reduce((prev, linkGroup) => prev.concat(linkGroup), [])
    this.waitingQueue.enqueueArray(matchedLinks)
  }

  parserOnEval(result, html, link, group) {
    this.drawlr.emit('targetParse', result, html, link, group)
  }

  wqOnEnqueueArray(links) {
    this.scheduleCrawler()
    this.drawlr.emit('links', links)

    const target = this.options.target
    Object.keys(target).forEach(group => {
      const targetLinks = links.filter(link => this._isMatchParttens(link, target[group]))
      if (targetLinks.length !== 0) {
        this.drawlr.emit('targetLinks', targetLinks, group)
      }
    })
  }

  onCrawlerSuccess(html, url, id) {
    this.drawlr.emit('html', html, url)

    const target = this.options.target
    Object.keys(target).forEach(group => {
      const parttens = this.options.target[group]
      if (this._isMatchParttens(url, parttens)) {
        this.drawlr.emit('targetHtml', html, url, group)

        // Parse html by customer parsing functions
        const parserFuncs = this.options.parser
        Object.keys(parserFuncs).forEach(funcName => {
          if (funcName === group && typeof parserFuncs[funcName] === 'function') {
            const processIndex = Math.floor(this.parsers.length * Math.random())
            this.parsers[processIndex].eval(parserFuncs[funcName], html, url, group)
          }
        })
      }
    })
    // Parse links
    const processIndex = Math.floor(this.parsers.length * Math.random())
    this.parsers[processIndex].parse2Links(html, url)

    setTimeout(() => {
      this.scheduleCrawler(id)
    }, this.options.sleep)
  }

  onCrawlerError(err, url, id) {
    setTimeout(() => {
      this.scheduleCrawler(id)
    }, this.options.sleep)
  }

  /**
   * @param undefined|number|Array
   */
  scheduleCrawler(crawlerId) {
    let crawlers
    if (typeof crawlerId === 'undefined') {
      crawlers = this.crawlers
    } else if (typeof crawlerId === 'number') {
      crawlers = [this.crawlers[crawlerId]]
    } else if (Object.protocol.toString.call(crawlerId) === '[object Array]') {
      crawlers = crawlerId.map(id => this.crawlers[id])
    }
    // log('Schedule crawler... length: %d', crawlers.length)

    for (let i = 0; i < crawlers.length; i++) {
      const crawler = crawlers[i]
      if (this.waitingQueue.size() === 0) {
        log('Links waitingQueue is empty now')
        break
      }
      if (crawler.isIdle) {
        crawler.pick(this.waitingQueue.dequeue())
      }
    }

    if (this._maybeFinish()) {
      this.finishTimer = setTimeout(() => {
        if (this.options.parserProcessNum !== 0) {
          this.parsers.forEach(parser => {
            parser.exit()
          })
        }
        this.drawlr.emit('finish')
      }, 500)
    } else {
      clearTimeout(this.finishTimer)
    }
  }

  _maybeFinish() {
    if (this.waitingQueue.size() !== 0) {
      return false
    }
    for (let i = 0; i < this.crawlers.length; i++) {
      if (!this.crawlers[i].isIdle) {
        return false
      }
    }
    return true
  }

  export() {
    const parserFuncs = this.options.parser
    const exportFuncs = {}
    Object.keys(parserFuncs).forEach(funcName => {
      exportFuncs[funcName] = parserFuncs[funcName].toString()
    })
    return {
      options: {
        ...this.options,
        parser: exportFuncs,
      },
      waitingQueue: this.waitingQueue.export(),
    }
  }

  static from(data, drawlr) {
    const exportFuncs = data.options.parser
    const parserFuncs = {}
    Object.keys(exportFuncs).forEach(funcName => {
      if (!/^function/.test(exportFuncs[funcName])) {
        parserFuncs[funcName] = eval('(function ' + exportFuncs[funcName] + ')')
      } else {
        parserFuncs[funcName] = eval('(' + exportFuncs[funcName] + ')')
      }
    })
    data.options.parser = parserFuncs
    const scheduler = new Scheduler(data.options)
    scheduler.waitingQueue = BloomQueue.from(data.waitingQueue)
    scheduler.drawlr = drawlr
    return scheduler
  }
}
