import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// Dev: leave VITE_SOCKET_URL unset → Vite proxy handles /socket.io
// Prod: set VITE_SOCKET_URL=https://your-backend.onrender.com in Vercel env vars
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

let socketInstance = null;

export const useSocket = (restaurantId, handlers = {}) => {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!restaurantId) return;

    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, {
        // Start with polling, upgrade to websocket — safer for Render/proxies
        transports: ['polling', 'websocket'],
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        withCredentials: true,
      });
    }

    socketInstance.emit('join_restaurant', restaurantId);

    const onNewOrder     = (data) => handlersRef.current.onNewOrder?.(data);
    const onOrderUpdated = (data) => handlersRef.current.onOrderUpdated?.(data);

    socketInstance.on('new_order',     onNewOrder);
    socketInstance.on('order_updated', onOrderUpdated);

    return () => {
      socketInstance.off('new_order',     onNewOrder);
      socketInstance.off('order_updated', onOrderUpdated);
    };
  }, [restaurantId]);
};
