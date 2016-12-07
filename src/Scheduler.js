import URL from 'url'
import debug from 'debug'
import { isMatch } from 'micromatch'
import Crawler from './Crawler'
import Parser from './Parser'
import BloomQueue from './BloomQueue'

const log = debug('Scheduler:log')

export default class Scheduler {

  constructor(options, drawlr) {
    this.options = {
      entry: undefined,
      pass: '/**',
      match: [],
      requestNum: 2,
      clusterNum: 2,
      sleep: 0,
      ...options,
    }

    this.drawlr = drawlr

    this.initOptions()
    this.initWaitingQueue()
    this.initCrawlers()
    this.initParsers()
    log('Scheduler inited, entry: %s, pass: %s, match: %s, requestNum: %d, clusterNum: %d',
      this.options.entry, this.options.pass, this.options.match,
      this.options.requestNum, this.options.clusterNum)
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

    if (Object.prototype.toString.call(this.options.match) !== '[object Array]') {
      this.options.match = [this.options.match]
    }
    this.options.match = this.options.match.map(url => urlFormat(url, relativeUrl))

    if (Object.prototype.toString.call(this.options.pass) !== '[object Array]') {
      this.options.pass = [this.options.pass]
    }
    this.options.pass = this.options.pass.map(url => urlFormat(url, relativeUrl))
                                          .concat(this.options.match)
  }

  initCrawlers() {
    this.crawlers = []
    for (let i = 0; i < this.options.requestNum; i++) {
      const crawler = new Crawler(i)
      crawler.on('html', this.crawlerOnHtml.bind(this))
      this.crawlers.push(crawler)
    }
  }

  initParsers() {
    // Create parser clusters
    this.parsers = []
    for (let i = 0; i < this.options.clusterNum; i++) {
      const parser = new Parser()
      parser.on('links', this.parserOnLinks.bind(this))
      this.parsers.push(parser)
    }
  }

  initWaitingQueue() {
    // Init waiting queue
    this.waitingQueue = new BloomQueue()
    this.waitingQueue.on('enqueue', this.wqOnEnqueue.bind(this))
  }

  start() {
    log('Scheduler start')
    this.waitingQueue.enqueue(this.options.entry)
  }

  parserOnLinks(links) {
    const matchedLinks = this.options.pass.map(partten => {
      const parttenUrl = URL.parse(partten)
      return links.filter(link => {
        const linkUrl = URL.parse(link)
        return parttenUrl.host === linkUrl.host
            && parttenUrl.protocol === linkUrl.protocol
            && isMatch(linkUrl.pathname, parttenUrl.pathname)
      })
    }).reduce((prev, linkGroup) => prev.concat(linkGroup), [])
    this.waitingQueue.enqueue(matchedLinks)
  }

  wqOnEnqueue(link) {
    this.scheduleCrawler()
    this.drawlr.emit('link', link)
  }

  crawlerOnHtml(html, url, id) {
    this.drawlr.emit('html', html)
    this.scheduleCrawler(id)
    process.nextTick(() => {
      this.parsers[0].parse2Links(html, url)
    })
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
        break
      }
      if (crawler.isIdle) {
        crawler.pick(this.waitingQueue.dequeue())
      }
    }
  }
}
