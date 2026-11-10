/* eslint-disable @next/next/no-img-element -- photos come from the dashboard's uploads, from Storage */
import { FC } from "react"
import type { ExecAvatarProps } from './types'
import { getInitials } from '../helpers'

export const ExecAvatar: FC<ExecAvatarProps> = ({ firstName, lastName, avatarSrc }) =>
    avatarSrc ? (
        // The name is right beside it, so a screen reader needn't hear it twice.
        // A plain img: photos come from the dashboard's uploads, wherever they're kept
        <img
            src={avatarSrc}
            alt=""
            width={160}
            height={160}
            loading="lazy"
            className="size-18 shrink-0 rounded-2xl object-cover"
        />
    ) : (
        <div className="grid size-18 shrink-0 place-items-center rounded-2xl bg-brand-tint text-[1.25rem] font-bold text-brand" aria-hidden>
            {getInitials(firstName, lastName)}
        </div>
    )
