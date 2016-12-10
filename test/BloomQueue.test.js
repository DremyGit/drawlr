require('babel-register')()
const BloomQueue = require('../src/BloomQueue').default
const chai = require('chai')
const sinon = require('sinon')
const expect = chai.expect
chai.should()
chai.use(require('chai-things'))


describe('Test BloomQueue', () => {

  describe('constructor()', () => {
    it('create empty queue', () => {
      const bloomQueue = new BloomQueue()
      expect(bloomQueue.size()).to.equal(0)
    })

    it('create queue with array', () => {
      const bloomQueue = new BloomQueue(['a', 'b'])
      expect(bloomQueue.size()).to.equal(2)
    })
  })

  describe('enqueue()', () => {
    it('enqueue different items', () => {
      const bloomQueue = new BloomQueue()

      bloomQueue.enqueue('a')
      bloomQueue.enqueue('b')

      expect(bloomQueue.size()).to.equal(2)
    })

    it('enqueue some replicate items', () => {
      const bloomQueue = new BloomQueue(['a', 'b'])

      bloomQueue.enqueue('a')

      expect(bloomQueue.size()).to.equal(2)
    })

    it('emit enqueue event after enqueue', () => {
      const spy = sinon.spy()
      const bloomQueue = new BloomQueue()
      bloomQueue.on('enqueue', spy)

      bloomQueue.enqueue('a')
      bloomQueue.enqueue('b')

      expect(spy.callCount).to.equal(2)
    })

    it('did not emit enqueue event after enqueue an replicate item', () => {
      const spy = sinon.spy()
      const bloomQueue = new BloomQueue(['a'])
      bloomQueue.on('enqueue', spy)

      bloomQueue.enqueue('a')

      expect(spy.called).to.be.false
    })
  })

  describe('enqueueArray()', () => {
    it('emit enqueueEvent after enqueue with an array', () => {
      const spy = sinon.spy()
      const bloomQueue = new BloomQueue(['a'])
      bloomQueue.on('enqueueArray', spy)

      bloomQueue.enqueueArray(['a', 'b', 'b', 'c'])

      expect(spy.calledWith(['b', 'c'])).to.be.true
    })

    it('not emit enqueueEvent after enqueue an empty array', () => {
      const spy = sinon.spy()
      const bloomQueue = new BloomQueue(['a'])
      bloomQueue.on('enqueueArray', spy)

      bloomQueue.enqueueArray(['a'])

      expect(spy.called).to.be.false
    })

    it('not emit enqueueEvent after enqueue not array item', () => {
      const spy = sinon.spy()
      const bloomQueue = new BloomQueue()
      bloomQueue.on('enqueueArray', spy)
      
      bloomQueue.enqueueArray('a')

      expect(spy.called).to.be.false
    })
  })

  describe('dequeue()', () => {
    it('dequeue the first item in the queue', () => {
      const bloomQueue = new BloomQueue(['a', 'b'])

      const dequeuedItem = bloomQueue.dequeue()

      expect(dequeuedItem).to.equal('a')
      expect(bloomQueue.size()).to.equal(1)
    })

    it('emit dequeue event after dequeue', () => {
      const spy = sinon.spy()
      const bloomQueue = new BloomQueue(['a', 'b'])
      bloomQueue.on('dequeue', spy)

      bloomQueue.dequeue()

      expect(spy.calledWith('a')).to.be.true
    })

    it('not emit dequeue event if queue is empty', () => {
      const spy = sinon.spy()
      const bloomQueue = new BloomQueue()
      bloomQueue.on('dequeue', spy)

      bloomQueue.dequeue()

      expect(spy.called).to.be.false
    })
  })

  describe('export()', () => {
    it('export an empty bloomQueue', () => {
      const bloomQueue = new BloomQueue([], 100, 0.01)

      const data = bloomQueue.export()

      expect(data.queue.length).to.equal(0)
      data.buckets.should.not.contain.any.above(0)
    })

    it('export an bloomQueue with data', () => {
      const bloomQueue = new BloomQueue([], 100, 0.01)
      bloomQueue.enqueueArray(['a', 'b'])

      const data = bloomQueue.export()

      expect(data.queue).to.have.length.of(2)
      data.buckets.should.contain.some.above(0)
    })
  })

  describe('BloomQueue.from()', () => {
    it('import from an empty bloomQueue data', () => {
      const bloomQueue = new BloomQueue([], 100, 0.01)
      const data = bloomQueue.export()
      const bloomQueue2 = BloomQueue.from(data)

      expect(bloomQueue2.isEmpty()).to.be.true
      expect(bloomQueue.filter.k).to.equal(7)
    })

    it('import from a not empty bloomQueue data', () => {
      const bloomQueue = new BloomQueue(['a', 'b'], 100, 0.01)
      const data = bloomQueue.export()
      const bloomQueue2 = BloomQueue.from(data)

      expect(bloomQueue2.size()).to.equal(2)
      expect(bloomQueue2._notExisted('a')).to.be.false
      expect(bloomQueue2._notExisted('b')).to.be.false
    })
  })
})
