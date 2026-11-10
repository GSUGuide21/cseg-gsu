import type { Executive, ExecutiveContact } from '../types'

export type ExecAvatarProps = Pick<Executive, 'firstName' | 'lastName' | 'avatarSrc'>

export type ExecIdentityProps = Pick<Executive, 'firstName' | 'lastName' | 'role' | 'isFounder'> & {
    /** The name's heading level: 4 under a category's heading */
    headingLevel?: 3 | 4
}

export type ExecContactLinksProps = Pick<ExecutiveContact, 'email' | 'phone'>

export type ExecSocialLinksProps = {
    contact: ExecutiveContact
    /** Used to label each link, e.g. "Jane Doe on Instagram" */
    fullName: string
}
