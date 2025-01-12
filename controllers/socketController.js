const socketController = (io) => {
    return {
      emit: (event, data) => {
          io.emit(event, data)
      },
  
      on: (event, callback) => {
          io.on('connection', (socket) => {
              socket.on(event, callback)
          })
      }
    }
  }
  
  module.exports = socketController;