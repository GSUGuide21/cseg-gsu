import type { Executive, ServiceInterval, SocialIcon } from './types'
import { 
    FaInstagram, 
    FaXTwitter, 
    FaLinkedin, 
    FaYoutube,
    FaFacebook
} from 'react-icons/fa6'
import { Globe } from 'lucide-react'

/**
 * Returns the full name of an executive given their first and last names.
 * @param firstName - The first name of the executive.
 * @param lastName - The last name of the executive.
 * @returns The full name of the executive.
 */
export const getFullName = (firstName: string, lastName: string) => `${firstName} ${lastName}`

/**
 * Returns the initials of an executive given their first and last names.
 * @param firstName - The first name of the executive.
 * @param lastName - The last name of the executive.
 * @returns The initials of the executive.
 */
export const getInitials = (firstName: string, lastName: string) => `${firstName[0]}${lastName[0]}`

/**
 * Returns a formatted string representing the service intervals of an executive.
 * @param serviceIntervals - An array of service intervals.
 * @returns A formatted string of service intervals.
 */
export const serviceLine = (serviceIntervals: ServiceInterval[]) => {
    if (!serviceIntervals || serviceIntervals.length === 0) return ''
    return [...serviceIntervals]
        .sort((a, b) => a.startYear - b.startYear)
        .map(({ startYear, endYear }) => `${startYear} – ${endYear ?? 'Present'}`)
        .join(', ')
}

/**
 * Returns whether an executive is serving now: one of their service intervals has no end year.
 * @param member - The executive.
 * @returns Whether the executive is currently serving.
 */
export const isCurrent = (member: Executive) => member.serviceIntervals.some(({ endYear }) => endYear == null)

/**
 * Returns a tel: href string for a given phone number.
 * @param phone - The phone number of the executive.
 * @returns A tel: href string.
 */
export const telHref = (phone: string) => `tel:${phone.replace(/\D/g, '')}`

/**
 * Returns a mailto: href string for a given email address.
 * @param email - The email address of the executive.
 * @returns A mailto: href string.
 */
export const mailtoHref = (email: string) => `mailto:${email}`

export const SOCIAL_ICONS: readonly SocialIcon[] = [
    { key: 'instagram', label: 'Instagram', Icon: FaInstagram },
    { key: 'twitter', label: 'X', Icon: FaXTwitter },
    { key: 'linkedIn', label: 'LinkedIn', Icon: FaLinkedin },
    { key: 'youtube', label: 'YouTube', Icon: FaYoutube },
    { key: 'website', label: 'Website', Icon: Globe },
    { key: 'facebook', label: 'Facebook', Icon: FaFacebook }
]

/**
 * The groups the current executives are listed in, after the constitution's officers
 * (Article V): each matches the roles it holds, and a role is put in the first group that
 * matches it. Roles the constitution doesn't name still find one by their words, so a
 * "Treasurer" lands with the Finance Manager.
 */
export const EXEC_CATEGORIES: readonly { title: string; matches: RegExp }[] = [
    { title: 'Leadership', matches: /^(executive )?director$|president/i },
    { title: 'Operations', matches: /secretary|finance|treasurer/i },
    { title: 'Programs & outreach', matches: /program|outreach|event|engagement/i },
    { title: 'Communications', matches: /public relations|marketing|historian|artist|media|web|design/i },
]

/** The group for roles that match none of them */
export const OTHER_CATEGORY = 'More officers'

/**
 * Sorts executives into their groups, in the groups' order, leaving out groups with nobody
 * in them. Each group keeps the order the executives came in.
 * @param executives - The executives to sort.
 * @returns Each group's title with its executives.
 */
export const categorize = (executives: readonly Executive[]) => {
    const titles = [...EXEC_CATEGORIES.map(({ title }) => title), OTHER_CATEGORY]
    const groups = new Map<string, Executive[]>(titles.map((title) => [title, []]))
    for (const member of executives) {
        const category = EXEC_CATEGORIES.find(({ matches }) => matches.test(member.role))
        groups.get(category?.title ?? OTHER_CATEGORY)!.push(member)
    }
    return [...groups].flatMap(([title, members]) => (members.length > 0 ? [{ title, executives: members }] : []))
}
