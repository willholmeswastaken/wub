// Stand-in for the pino package during the Worker build. The Worker logger
// never calls it (it writes JSON to the console). Node keeps the real import.
const pinoStub = {};

export default pinoStub;
