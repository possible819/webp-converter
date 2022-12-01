import dotenv from 'dotenv'

export default class Config<T extends Record<string, string>> {
  private config?: T

  constructor() {
    this.config = dotenv.config().parsed as T | undefined
  }

  get(key: keyof T) {
    if (this.config?.[key]) return this.config[key]
    throw new Error(`No configuration found by ${String(key)}`)
  }
}
