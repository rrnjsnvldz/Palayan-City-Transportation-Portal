import { useState, useCallback } from 'react';

let toastId = 0;

const toastListeners = new Set();
let toastList = [];

function notify(listeners, toasts) {
  listeners.forEach(fn => fn([...toasts]));
}

export function useToast() {
  const [toasts, setToasts] = useState([]);

  // Register listener
  if (!toastListeners.has(setToasts)) {
    toastListeners.add(setToasts);
  }

  const toast = useCallback(({ title, message, type = 'info', duration = 4000 }) => {
    const id = ++toastId;
    const item = { id, title, message, type };
    toastList = [...toastList, item];
    notify(toastListeners, toastList);
    setTimeout(() => {
      toastList = toastList.filter(t => t.id !== id);
      notify(toastListeners, toastList);
    }, duration);
  }, []);

  const dismiss = useCallback((id) => {
    toastList = toastList.filter(t => t.id !== id);
    notify(toastListeners, toastList);
  }, []);

  return { toasts, toast, dismiss };
}

// Global toast function (can be used outside React components)
export function showToast(opts) {
  const id = ++toastId;
  const item = { id, ...opts };
  toastList = [...toastList, item];
  notify(toastListeners, toastList);
  setTimeout(() => {
    toastList = toastList.filter(t => t.id !== id);
    notify(toastListeners, toastList);
  }, opts.duration || 4000);
}
