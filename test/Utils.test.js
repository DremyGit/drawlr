require('babel-register')()
const Utils = require('../src/Utils')
const request = require('request')
const chai = require('chai')
const sinon = require('sinon')
const expect = chai.expect
chai.should()
chai.use(require('chai-things'))

describe('Test Utils.js', () => {
  describe('parse2Links()', () => {
    const currentUrl = 'http://example.com/a'
    it('parse absolute urls', () => {
      const html = '<a href="http://example.com/b"></a>'
      const links = Utils.parse2Links(html, currentUrl)
      expect(links).to.have.length.of(1)
      expect(links[0]).to.equal('http://example.com/b')
    })
    it('parse relative protocol urls', () => {
      const html = '<a href="//example.com/b"></a>'
      const links = Utils.parse2Links(html, currentUrl)
      expect(links).to.have.length.of(1)
      expect(links[0]).to.equal('http://example.com/b')
    })
    it('parse relative site urls', () => {
      const html = '<a href="/b"></a> <a href="c"></a>'
      const links = Utils.parse2Links(html, currentUrl)
      expect(links).to.deep.equal([
        'http://example.com/b',
        'http://example.com/c',
      ])
    })
  })

  describe('isArray()', () => {
    it('is array', () => {
      expect(Utils.isArray([])).to.be.true
      expect(Utils.isArray([1])).to.be.true
      expect(Utils.isArray([null])).to.be.true
      expect(Utils.isArray([undefined])).to.be.true
      expect(Utils.isArray([,,])).to.be.true
      expect(Utils.isArray(new Array(1))).to.be.true
    })
    it('is not array', () => {
      expect(Utils.isArray(undefined)).to.be.false
      expect(Utils.isArray('abc')).to.be.false
      expect(Utils.isArray({})).to.be.false
    })
  })

  describe('randomInArray()', () => {
    it('return null if array is empty', () => {
      expect(Utils.randomInArray([])).to.be.null
      expect(Utils.randomInArray(undefined)).to.be.null
    })
    it('return the first array if array has only one item', () => {
      expect(Utils.randomInArray([1])).to.equal(1)
      expect(Utils.randomInArray([{a: 1}])).to.deep.equal({a: 1})
    })
    it('return random item in array', () => {
      const stubRandom = sinon.stub(Math, 'random', () => 0.6)
        // .onFirstCall().returns(0.3)
        // .onSecondCall().returns(0.6)
        // .onThirdCall().returns(0.9)
      const array = [1, 2, 3]

      expect(Utils.randomInArray(array)).to.equal(2)
      expect(Utils.randomInArray(array)).to.equal(2)
      expect(Utils.randomInArray(array)).to.equal(2)
      stubRandom.restore()
    })
  })
})