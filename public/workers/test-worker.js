self.onmessage = (event) => {
  const { type, delay } = event.data

  if (type === 'SLOW_TASK') {
    setTimeout(() => {
      self.postMessage({ type: 'COMPLETE' })
    }, delay)
  } else {
    self.postMessage({ type: 'COMPLETE' })
  }
}
