require('babel-register')()
const Crawler = require('../src/Crawler').default
const request = require('request')
const chai = require('chai')
const sinon = require('sinon')
const expect = chai.expect
chai.should()
chai.use(require('chai-things'))

describe('Test Crawler.js', () => {

  var stubRandom
  before(() => {
    stubRandom = sinon.stub(Math, 'random', () => 0.99)
  })

  after(() => {
    stubRandom.restore()
  })

  describe('_getHeaders()', () => {
    it('get empty object if header is not set', () => {
      const crawler = new Crawler()
      expect(crawler._getHeaders()).to.be.empty
    })

    it('get certain headers if there is no array', () => {
      const crawler = new Crawler({
        headers: {
          'User-Agent': 'Test'
        }
      })
      const headers = crawler._getHeaders()
      expect(headers['User-Agent']).to.equal('Test')
    })

    it('get random headers if there is some array', () => {
      const crawler = new Crawler({
        headers: {
          'User-Agent': ['Test1', 'Test2']
        }
      })
        
      const headers1 = crawler._getHeaders()
      const headers2 = crawler._getHeaders()

      expect(headers1['User-Agent']).to.equal('Test2')
      expect(headers2['User-Agent']).to.equal('Test2')
    })
  })

  describe('pick()', () => {
    it('emit success event if request is successful', () => {
      const spy = sinon.spy()
      const stubRequest = sinon.stub(request, 'get')
                            .callsArgWith(2, null, {statusCode: 200}, 'html')
      const crawler = new Crawler()
      crawler.on('success', spy)

      crawler.pick('http://example.com')
      stubRequest.restore()

      expect(spy.calledWith('html', 'http://example.com')).to.be.true
    })

    it('emit error event if request is error', () => {
      const spy = sinon.spy()
      const stubRequest = sinon.stub(request, 'get')
                            .callsArgWith(2, new Error('Error'))
      const crawler = new Crawler()
      crawler.on('error', spy)

      crawler.pick('http://example.com')
      stubRequest.restore()

      expect(spy.called).to.be.true
    })

    it('emit error event if response status code is not 200', () => {
      const spy = sinon.spy()
      const stubRequest = sinon.stub(request, 'get')
                            .callsArgWith(2, null, {statusCode: 404})
      const crawler = new Crawler()
      crawler.on('error', spy)

      crawler.pick('http://example.com')
      stubRequest.restore()

      expect(spy.called).to.be.true
    })

    it('emit error event if crawler is busy', () => {
      const spySuccess = sinon.spy()
      const spyError = sinon.spy()
      let cb
      const stubRequest = sinon.stub(request, 'get', (url, headers, callback) => {
        cb = callback
      })
      const crawler = new Crawler()
      crawler.on('success', spySuccess)
      crawler.on('error', spyError)

      crawler.pick('http://example.com/1')
      crawler.pick('http://example.com/2')
      cb(null, {statusCode: 200}, 'html')
      stubRequest.restore()

      expect(spyError.callCount).to.equal(1)
      expect(spySuccess.callCount).to.equal(1)
      expect(spySuccess.calledWith('html', 'http://example.com/1')).to.be.true
    })
  })
})