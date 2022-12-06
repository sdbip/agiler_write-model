import { setupServer } from './server.js'

const setup = setupServer()
setup.get('/', async () => {
  return { message: 'alive', test: process.env.TEST }
})

const server = setup.finalize()
const port = parseInt(process.env.PORT ?? '80') ?? 80
server.listenAtPort(port)

process.stdout.write(`\x1B[35mListening on port \x1B[30m${port ?? '80'}\x1B[0m\n\n`)
