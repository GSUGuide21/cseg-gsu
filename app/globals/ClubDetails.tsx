'use client'

import { createContext, useContext, type FC, type ReactNode } from 'react'

import { BUILT_IN_CLUB_DETAILS, type ClubDetails } from '@/lib/clubDetails'

/** The details officers set in Settings, for the parts of the site's frame drawn in the browser */
const ClubDetailsContext = createContext<ClubDetails>(BUILT_IN_CLUB_DETAILS)

export const ClubDetailsProvider: FC<{ details: ClubDetails; children: ReactNode }> = ({ details, children }) => (
  <ClubDetailsContext.Provider value={details}>{children}</ClubDetailsContext.Provider>
)

export const useClubDetails = () => useContext(ClubDetailsContext)
