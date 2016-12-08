import { parse2Links } from './Utils'

process.on('message', ({ type, payload }) => {
  switch (type) {
    case 'links':
      process.send({
        type: 'links',
        payload: {
          links: parse2Links(payload.html, payload.currLink),
        },
      })
      break

    default:
      break
  }
})
