declare module 'luxon' {
  export type DateTime = any
  export const DateTime: {
    fromJSDate(date: any): any
  }
}
