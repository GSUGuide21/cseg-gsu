import type { ComponentPropsWithRef } from 'react'
import { Globe } from 'lucide-react'
import type { IconType } from 'react-icons'

/**
 * Represents a service interval for an executive.
 */
export type ServiceInterval = {
    /** The start year of the service interval */
    startYear: number
    /** The end year of the service interval (null if incumbent) */
    endYear?: number | null
}

/**
 * Represents the contact information of an executive.
 */
export type ExecutiveContact = {
    /** The email address of the executive */
    email?: string
    /** The phone number of the executive */
    phone?: string
    /** The LinkedIn profile URL of the executive */
    linkedIn?: string
    /** The Twitter profile URL of the executive */
    twitter?: string
    /** The Instagram profile URL of the executive */
    instagram?: string
    /** The Facebook profile URL of the executive */
    facebook?: string
    /** The YouTube profile URL of the executive */
    youtube?: string
    /** The website URL of the executive */
    website?: string
}

/**
 * Represents an executive within the organization.
 */
export type Executive = {
    /** The first name of the executive */
    firstName: string
    /** The last name of the executive */
    lastName: string
    /** The title or position of the executive */
    role: string
    /** The biography or background of the executive */
    bio: string
    /** Whether the executive is the founder of the organization */
    isFounder: boolean
    /** The profile picture URL of the executive */
    avatarSrc?: string
    /** The service interval(s) of the executive */
    serviceIntervals: ServiceInterval[]
    /** The contact information of the executive */
    contact?: ExecutiveContact
}

/**
 * Represents a social media icon for an executive's contact information.
 */
export type SocialIcon = {
    key: Exclude<keyof ExecutiveContact, "email" | "phone">
    label: string
    Icon: IconType | typeof Globe
}

export type ExecutiveItemProps = ComponentPropsWithRef<'li'> & {
    member: Executive
    /** The name's heading level: 4 under a category's heading */
    headingLevel?: 3 | 4
}

export type ExecutiveListProps = {
    title: string
    executives: readonly Executive[]
    /** Group them by what they do, under a heading each */
    categorized?: boolean
}

export type ExecutiveDirectoryProps = {
    executives: readonly Executive[]
}