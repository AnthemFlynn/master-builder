// src/modules/environment/domain/TimeCycle.ts

export interface TimeState {
  hour: number
  minute: number
  day: number
  month: number
  year: number
  timeScale: number
}

export class TimeCycle {
  private overrideHour: number | null = null
  private overrideMinute: number | null = null
  private overrideDay: number | null = null
  private overrideMonth: number | null = null
  private overrideYear: number | null = null
  private timeScale: number = 1.0 // 1.0 = real-time

  getTime(): TimeState {
    const now = new Date()
    const hour = this.overrideHour !== null ? this.overrideHour : now.getHours()
    const minute = this.overrideMinute !== null ? this.overrideMinute : now.getMinutes()
    const year = this.overrideYear !== null ? this.overrideYear : now.getFullYear()
    const month = this.overrideMonth !== null ? this.overrideMonth - 1 : now.getMonth()
    const day = this.overrideDay !== null ? this.overrideDay : now.getDate()

    return { hour, minute, day, month, year, timeScale: this.timeScale }
  }

  getDate(): Date {
    const { hour, minute, day, month, year } = this.getTime()
    return new Date(year, month, day, hour, minute, 0, 0)
  }

  getDecimalTime(): number {
    const { hour, minute } = this.getTime()
    return hour + minute / 60
  }

  setHour(hour: number | null): void {
    if (hour !== null && (hour < 0 || hour > 23)) {
      console.warn('Invalid hour:', hour)
      return
    }
    this.overrideHour = hour
    this.overrideMinute = hour !== null ? 0 : null
  }

  setDate(month: number, day: number, year?: number): void {
    this.overrideMonth = month
    this.overrideDay = day
    this.overrideYear = year || new Date().getFullYear()
  }

  resetDate(): void {
    this.overrideMonth = null
    this.overrideDay = null
    this.overrideYear = null
  }

  setTimeScale(scale: number): void {
    this.timeScale = scale
  }
}
