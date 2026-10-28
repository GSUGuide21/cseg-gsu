export const DATE_REGEX = /(\d{2}|\d{4})-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])/i
export const DATE_REGEX_2 = /(\d{2}|\d{4})\/(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])/i
export const DATE_REGEX_3 = /(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])-(\d{2}|\d{4})/i
export const DATE_REGEX_4 = /(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/(\d{2}|\d{4})/i
export const DATE_REGEX_5 = /(0?[1-9]|[12]\d|3[01])-(0?[1-9]|1[0-2])-(\d{2}|\d{4})/i
export const DATE_REGEX_6 = /(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])\/(\d{2}|\d{4})/i

export const DATE_REGEX_7 = /(\w{3})\s+(0?[1-9]|[12]\d|3[01])\s+(\d{2}|\d{4})/i
export const DATE_REGEX_8 = /(\w+)\s+(0?[1-9]|[12]\d|3[01])\s+(\d{2}|\d{4})/i
export const DATE_REGEX_9 = /(\w{3})\s+(0?[1-9]|[12]\d|3[01]),\s+(\d{4})/i
export const DATE_REGEX_10 = /(\w+)\s+(0?[1-9]|[12]\d|3[01]),\s+(\d{4})/i

export const TIME_REGEX = /(\d{1,2}):(\d{2}):(\d{2})/
export const TIME_REGEX_2 = /(\d{1,2}):(\d{2}):(\d{2})\s*([AP]M)/i
export const TIME_REGEX_3 = /(\d{1,2}):(\d{2})/
export const TIME_REGEX_4 = /(\d{1,2}):(\d{2})\s*([AP]M)/i
export const TIME_REGEX_5 = /(\d{1,2})\s*([AP]M)/i

export const MONTH_NAMES: string[] = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

export const MONTH_DAYS: Record<string, number> = {
  January: 31,
  February: 28, // 29 in leap years
  March: 31,
  April: 30,
  May: 31,
  June: 30,
  July: 31,
  August: 31,
  September: 30,
  October: 31,
  November: 30,
  December: 31
}

export const isLeapYear = (year: number): boolean => {
  if (year < 0) throw new Error('Invalid year: The year cannot be negative.')
  if (year % 4 !== 0) return false
  if (year % 100 !== 0) return true
  if (year % 400 !== 0) return false
  return true
}

export const getDaysInMonth = (month: string, year: number): number => {
  if (!MONTH_DAYS[month]) throw new Error('Invalid month name: The month name is not valid.')
  if (month === 'February' && isLeapYear(year)) return 29
  return MONTH_DAYS[month]
}

export const getMonthName = (month: number): string => {
  if (month < 0 || month > 11) throw new Error('Invalid month index: The month index should be between 0 and 11.')
  // Check if the month is valid (0-11)
  return MONTH_NAMES[month]
}

export const getMonthIndex = (month: string): number => {
  const index = MONTH_NAMES.indexOf(month)
  if (index === -1) throw new Error('Invalid month name: The month name is not valid.')
  return index
}

export const getShortMonthName = (month: number): string => {
  if (!MONTH_NAMES[month]) throw new Error('Invalid month name: The month name is not valid.')
  // Check if the month is valid (0-11)
  if (month < 0 || month > 11) throw new Error('Invalid month index: The month index should be between 0 and 11.')
  // Return the short name of the month
  return MONTH_NAMES[month].slice(0, 3)
}

export const getShortMonthNames = (): string[] => MONTH_NAMES.map(month => month.slice(0, 3))

export const getDaysInYear = (year: number): number => {
  if (year < 0) throw new Error('Invalid year: The year cannot be negative.')
  return isLeapYear(year) ? 366 : 365
}

export const getDate = (date: number, leadingZero: boolean = false): string => {
  if (date < 1 || date > 31) throw new Error('Invalid date: The date should be between 1 and 31.')
  return leadingZero ? String(date).padStart(2, '0') : String(date)  // Pad with leading zero
}

export const WEEK_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
]

export const getWeekdayName = (day: number): string => {
  if (day < 0 || day > 6) throw new Error('Invalid weekday index: The weekday index should be between 0 and 6.')
  // Check if the day is valid (0-6)
  return WEEK_DAYS[day]
}

export const getWeekdayNames = (): string[] => WEEK_DAYS.map(day => day.slice(0, 3)) // Get short names of weekdays

export const getWeekdayIndex = (day: string): number => {
  const index = WEEK_DAYS.indexOf(day)
  if (index === -1) throw new Error('Invalid weekday name: The weekday name is not valid.')
  return index
}

export const getShortWeekdayName = (day: number): string => {
  if (day < 0 || day > 6) throw new Error('Invalid weekday index: The weekday index should be between 0 and 6.')
  // Check if the day is valid (0-6)
  return WEEK_DAYS[day].slice(0, 3)
}

export const getShortWeekdayNames = (): string[] => WEEK_DAYS.map(day => day.slice(0, 3))

export const getShortYear = (year: number): string => {
  if (year < 0) throw new Error('Invalid year: The year cannot be negative.')
  // Check if the year is valid
  return year.toString().slice(-2)
}

export const getFullYear = (year: number): string => {
  if (year < 0) throw new Error('Invalid year: The year cannot be negative.')
  // Check if the year is valid
  return year.toString()
}

export const getYear = (date: Date): number => {
  if (!(date instanceof Date)) throw new Error('Invalid date: The date is not valid.')
  return date.getFullYear()
}

export const getHours = (date: Date): number => {
  if (!(date instanceof Date)) throw new Error('Invalid date: The date is not valid.')
  return date.getHours()
}

export const get12Hours = (date: Date): number => {
  if (!(date instanceof Date)) throw new Error('Invalid date: The date is not valid.')
  const hours = date.getHours()
  if (hours < 0 || hours > 23) throw new Error('Invalid hours: The hours should be between 0 and 23.')
  return hours % 12 || 12 // Convert to 12-hour format
}

export const getMinutes = (date: Date): number => {
  if (!(date instanceof Date)) throw new Error('Invalid date: The date is not valid.')
  return date.getMinutes()
}

export const getSeconds = (date: Date): number => {
  if (!(date instanceof Date)) throw new Error('Invalid date: The date is not valid.')
  return date.getSeconds()
}

export const getMilliseconds = (date: Date): number => {
  if (!(date instanceof Date)) throw new Error('Invalid date: The date is not valid.')
  return date.getMilliseconds()
}

export const getMeridiem = (date: Date): string => {
  if (!(date instanceof Date)) throw new Error('Invalid date: The date is not valid.')
  const hours = date.getHours()
  if (hours < 0 || hours > 23) throw new Error('Invalid hours: The hours should be between 0 and 23.')
  // Check if the hours are valid (0-23)
  return hours < 12 ? 'AM' : 'PM'
}

export const FORMATS: Record<string, (date: Date) => number | string> = {
  // Date formats
  YYYY: (date: Date) => date.getFullYear(),
  YY: (date: Date) => date.getFullYear().toString().slice(-2),
  MM: (date: Date) => String(date.getMonth() + 1).padStart(2, '0'),
  M: (date: Date) => date.getMonth() + 1,
  DD: (date: Date) => String(date.getDate()).padStart(2, '0'),
  D: (date: Date) => date.getDate(),
  d: (date: Date) => getShortWeekdayName(date.getDay()),
  dd: (date: Date) => getWeekdayName(date.getDay()),
  // Time formats
  HH: (date: Date) => String(date.getHours()).padStart(2, '0'),
  H: (date: Date) => date.getHours(),
  hh: (date: Date) => String(get12Hours(date)).padStart(2, '0'),
  h: (date: Date) => get12Hours(date),
  mm: (date: Date) => String(date.getMinutes()).padStart(2, '0'),
  ss: (date: Date) => String(date.getSeconds()).padStart(2, '0'),
  ms: (date: Date) => String(date.getMilliseconds()).padStart(3, '0'),
  a: (date: Date) => getMeridiem(date).toLowerCase(),
  A: (date: Date) => getMeridiem(date).toUpperCase(),
}

export const FORMAT_REGEX = new RegExp(
  Object.keys(FORMATS)
    .map(format => format.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1')) // Escape special characters
    .join('|'), // Join with OR operator
  'g'
)

export const format = (date: Date, formatString: string): string => {
  if (!(date instanceof Date)) throw new Error('Invalid date: The date is not valid.')
  if (isNaN(date.getTime())) throw new Error('Invalid date: The date is not valid.')
  // Check if the date is valid
  return formatString.replace(/(YYYY|YY|MM|M|DD|D|d|dd|HH|H|hh|h|mm|ss|ms|a|A)/g, (match: string): string => {
    const formatter = FORMATS[match]
    if (!formatter) throw new Error(`Invalid format: The format "${match}" is not valid.`)
    return String(formatter(date))
  })
}

export const isSameDate = (date1: Date, date2: Date): boolean => {
  if (!(date1 instanceof Date) || !(date2 instanceof Date)) throw new Error('Invalid date: The date is not valid.')
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

export const isSameTime = (date1: Date, date2: Date): boolean => {
  if (!(date1 instanceof Date) || !(date2 instanceof Date)) throw new Error('Invalid date: The date is not valid.')
  return (
    date1.getHours() === date2.getHours() &&
    date1.getMinutes() === date2.getMinutes() &&
    date1.getSeconds() === date2.getSeconds()
  )
}

export const isSameDateTime = (date1: Date, date2: Date): boolean => {
  if (!(date1 instanceof Date) || !(date2 instanceof Date)) throw new Error('Invalid date: The date is not valid.')
  return (isSameDate(date1, date2) && isSameTime(date1, date2))
}

export const isValidDate = (date: Date): boolean => {
  if (!(date instanceof Date)) throw new Error('Invalid date: The date is not valid.')
  return !isNaN(date.getTime())
}

export const isValidDateString = (dateString: string): boolean => {
  if (typeof dateString !== 'string') throw new Error('Invalid date string: The date string is not valid.')
  return DATE_REGEX.test(dateString) || 
    DATE_REGEX_2.test(dateString) || 
    DATE_REGEX_3.test(dateString) || 
    DATE_REGEX_4.test(dateString) ||
    DATE_REGEX_5.test(dateString) ||
    DATE_REGEX_6.test(dateString) ||
    DATE_REGEX_7.test(dateString) ||
    DATE_REGEX_8.test(dateString) ||
    DATE_REGEX_9.test(dateString) ||
    DATE_REGEX_10.test(dateString)
}