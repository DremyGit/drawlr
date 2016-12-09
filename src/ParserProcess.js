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

    case 'eval':
      process.send({
        type: 'eval',
        payload: {
          result: eval(`(${payload.func})`)
                    .apply(null, [
                      payload.html,
                      payload.link,
                      payload.group,
                    ]),
          html: payload.html,
          link: payload.link,
          group: payload.group,
        },
      })
      break

    default:
      break
  }
})
