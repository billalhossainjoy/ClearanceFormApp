import { EventEmitter } from 'events'

type QueueJob = ((done: (...args: unknown[]) => void) => Promise<unknown> | unknown) & {
  timeout?: number
}

type QueueOptions = {
  autostart?: boolean
  concurrency?: number
  results?: unknown[] | null
  timeout?: number
}

export default class Queue extends EventEmitter {
  autostart: boolean
  concurrency: number
  jobs: QueueJob[] = []
  pending = 0
  results: unknown[] | null
  running = false
  timeout: number

  constructor(options: QueueOptions = {}) {
    super()
    this.autostart = options.autostart ?? false
    this.concurrency = options.concurrency ?? Infinity
    this.results = options.results ?? null
    this.timeout = options.timeout ?? 0
  }

  get length() {
    return this.pending + this.jobs.length
  }

  push(...jobs: QueueJob[]) {
    const result = this.jobs.push(...jobs)
    if (this.autostart) {
      this.start()
    }
    return result
  }

  unshift(...jobs: QueueJob[]) {
    const result = this.jobs.unshift(...jobs)
    if (this.autostart) {
      this.start()
    }
    return result
  }

  splice(start: number, deleteCount?: number, ...jobs: QueueJob[]) {
    const result = deleteCount === undefined
      ? this.jobs.splice(start)
      : this.jobs.splice(start, deleteCount, ...jobs)
    if (this.autostart) {
      this.start()
    }
    return result
  }

  pop() {
    return this.jobs.pop()
  }

  shift() {
    return this.jobs.shift()
  }

  indexOf(job: QueueJob) {
    return this.jobs.indexOf(job)
  }

  lastIndexOf(job: QueueJob) {
    return this.jobs.lastIndexOf(job)
  }

  slice(start?: number, end?: number) {
    this.jobs = this.jobs.slice(start, end)
    return this
  }

  reverse() {
    this.jobs.reverse()
    return this
  }

  start(callback?: (error?: unknown, results?: unknown[] | null) => void) {
    if (callback) {
      this.once('error', (error) => callback(error, this.results))
      this.once('end', () => callback(undefined, this.results))
    }

    this.running = true

    while (this.running && this.pending < this.concurrency && this.jobs.length > 0) {
      this.runJob(this.jobs.shift() as QueueJob)
    }

    if (this.running && this.pending === 0 && this.jobs.length === 0) {
      this.running = false
      this.emit('end')
    }
  }

  stop() {
    this.running = false
  }

  end(error?: unknown) {
    this.jobs = []
    this.pending = 0
    this.running = false
    this.emit('end', error)
  }

  private runJob(job: QueueJob) {
    this.pending += 1
    this.emit('start', job)

    let finished = false
    let timer: number | undefined
    const timeout = job.timeout ?? this.timeout

    const done = (error?: unknown, result?: unknown) => {
      if (finished) {
        return
      }

      finished = true
      this.pending -= 1

      if (timer) {
        window.clearTimeout(timer)
      }

      if (error) {
        this.emit('error', error, job)
      } else {
        if (this.results) {
          this.results.push(result)
        }
        this.emit('success', result, job)
      }

      if (this.pending === 0 && this.jobs.length === 0) {
        this.running = false
        this.emit('end')
      } else if (this.running) {
        this.start()
      }
    }

    if (timeout) {
      timer = window.setTimeout(() => done(new Error('Queue job timed out')), timeout)
    }

    try {
      const result = job(done)
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        ;(result as Promise<unknown>).then((value) => done(undefined, value), done)
      }
    } catch (error) {
      done(error)
    }
  }
}
