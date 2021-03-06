import io from 'socket.io-client';
import * as actions from './actions';

let socket;

export const socketMiddleware = _store => next => action => {
  if (socket) {
    switch (action.type) {
      case actions.ADD_SONG:
        socket.emit('add', action.payload.url);
        break;
      case actions.REMOVE_SONG:
        socket.emit('delete', action.payload.id);
        break;
      case actions.VOTE_SKIP:
        socket.emit('skip');
        break;
      // TODO
      default:
        break;
    }
  }

  return next(action);
};

export default store => {
  socket = io();

  socket.on('app error', err => {
    store.dispatch(actions.appError(err));
  });

  socket.on('error', err => {
    // TODO
    console.warn('socket.io error');
    console.warn(err);
  });

  socket.on('disconnect', () => {
    store.dispatch(actions.showDisconnect());
  });

  socket.on('load', data => {
    store.dispatch(actions.initialize(data));
  });

  socket.on('song', song => {
    store.dispatch(actions.setCurrentSong(song));
  });

  socket.on('order', order => {
    store.dispatch(actions.setDjOrder(order));
  });

  socket.on('queue', queue => {
    store.dispatch(actions.setLocalQueue(queue));
  });

  socket.on('add status', queueItem => {
    store.dispatch(actions.setSongStatus(queueItem));
  });

  socket.on('skips', skips => {
    store.dispatch(actions.setSkipStatus({skips}));
  });
};
