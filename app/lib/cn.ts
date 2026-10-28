import clsx, { type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** clsx + tailwind-merge: later utilities win over conflicting earlier ones. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
