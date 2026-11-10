import { GraduationCap } from 'lucide-react'
import type { ComponentType } from 'react'
import { FaDiscord, FaInstagram, FaLinkedin, FaXTwitter, FaYoutube } from 'react-icons/fa6'
import { SiGroupme, SiLinktree } from 'react-icons/si'

import type { SocialNetwork } from './social'

export const SOCIAL_META: Record<SocialNetwork, { label: string; Icon: ComponentType<{ className?: string }>; detail: string }> = {
  instagram: { label: 'Instagram', Icon: FaInstagram, detail: 'Photos, flyers, and what’s next' },
  x: { label: 'X (Twitter)', Icon: FaXTwitter, detail: 'Quick updates' },
  pin: { label: 'PIN', Icon: GraduationCap, detail: 'Membership and RSVPs' },
  groupme: { label: 'GroupMe', Icon: SiGroupme, detail: 'Chat with members' },
  linktree: { label: 'Linktree', Icon: SiLinktree, detail: 'Every CSEG link' },
  discord: { label: 'Discord', Icon: FaDiscord, detail: 'Chat with members' },
  linkedin: { label: 'LinkedIn', Icon: FaLinkedin, detail: 'Alumni and news' },
  youtube: { label: 'YouTube', Icon: FaYoutube, detail: 'Recordings and recaps' },
}
