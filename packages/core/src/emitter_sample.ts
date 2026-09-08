import { EventEmitter } from 'events';

export const myEmitter = new EventEmitter();

myEmitter.on('userLogin', (user) => {
  console.log('User logged in:', user);
});

myEmitter.emit('userLogin', { id: 1, name: 'Alice' });
